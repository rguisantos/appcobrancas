import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { requireMutationRole, requireAdmin } from '@/lib/rbac'
import { cobrancaSchema } from '@/lib/validations'
import { z } from 'zod/v4'
import { registrarAuditoria } from '@/lib/auditoria'
import { calcularCobranca, calcularSaldoDevedor } from '@/lib/cobranca-calculos'
import { writeSyncLog } from '@/lib/sync-log'
import { handleApiError } from '@/lib/api-utils'
import { toNumber } from '@/lib/decimal'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const include = searchParams.get('include')

  const cobranca = await db.cobranca.findFirst({
    where: { id, deletedAt: null },
    include: { locacao: true, cliente: true, produto: true, pagamentos: include === 'pagamentos' ? { orderBy: { createdAt: 'desc' as const } } : false },
  })

  if (!cobranca) return NextResponse.json({ error: 'Cobrança não encontrada' }, { status: 404 })
  return NextResponse.json(cobranca)
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar cobrança')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  const { id } = await params
  const existing = await db.cobranca.findFirst({ where: { id, deletedAt: null } })
  if (!existing) return NextResponse.json({ error: 'Cobrança não encontrada' }, { status: 404 })

  try {
    const body = await request.json()

    // Support partial updates (e.g., for FIFO payment)
    // NOTE: Direct status changes require admin role to prevent financial tampering
    if (body._partial && (body.valorRecebido !== undefined || body.status !== undefined)) {
      const partialSchema = z.object({
        _partial: z.literal(true),
        valorRecebido: z.number().min(0).finite().optional(),
        status: z.enum(['Pendente', 'Pago', 'Parcial', 'Atrasado']).optional(),
      })
      const partialData = partialSchema.parse(body)
      const updateData: Record<string, unknown> = {}

      // Direct status changes require admin role — prevents Secretario from marking as Pago without payment
      if (partialData.status !== undefined) {
        if (session.tipoPermissao !== 'Administrador') {
          return NextResponse.json(
            { error: 'Apenas administradores podem alterar o status diretamente. Use o fluxo de pagamento.' },
            { status: 403 }
          )
        }
        updateData.status = partialData.status
      }

      if (partialData.valorRecebido !== undefined) {
        updateData.valorRecebido = partialData.valorRecebido
      }

      // Recalculate saldo devedor if valorRecebido changed
      if (partialData.valorRecebido !== undefined) {
        const { saldoDevedorGerado } = calcularSaldoDevedor(toNumber(existing.totalClientePaga), partialData.valorRecebido)
        updateData.saldoDevedorGerado = saldoDevedorGerado
      }

      // Set payment date if status changed to Pago/Parcial
      if ((partialData.status === 'Pago' || partialData.status === 'Parcial') && !existing.dataPagamento) {
        updateData.dataPagamento = new Date()
      }

      const cobranca = await db.cobranca.update({
        where: { id },
        data: { ...updateData, version: { increment: 1 } },
      })

      // Audit log for partial updates (security-relevant: financial data changes)
      await registrarAuditoria({
        usuarioId: session.userId,
        acao: 'atualizar_cobranca_parcial',
        entidade: 'cobranca',
        entidadeId: id,
        entidadeNome: `${existing.clienteNome} - ${existing.dataInicio}/${existing.dataFim}`,
        antes: { valorRecebido: toNumber(existing.valorRecebido), status: existing.status },
        depois: partialData as Record<string, unknown>,
        severidade: 'seguranca',
      })

      return NextResponse.json(cobranca)
    }

    const data = cobrancaSchema.parse(body)
    const antes = existing as Record<string, unknown>

    // Buscar locação para recalcular
    const locacao = await db.locacao.findFirst({
      where: { id: data.locacaoId, deletedAt: null },
    })

    if (!locacao) return NextResponse.json({ error: 'Locação não encontrada' }, { status: 400 })

    // Recalcular valores
    const calcResult = calcularCobranca({
      formaPagamento: locacao.formaPagamento as 'Periodo' | 'PercentualPagar' | 'PercentualReceber',
      relogioAnterior: data.relogioAnterior,
      relogioAtual: data.relogioAtual,
      precoFicha: toNumber(locacao.precoFicha),
      percentualEmpresa: toNumber(locacao.percentualEmpresa),
      valorFixo: locacao.valorFixo != null ? toNumber(locacao.valorFixo) : undefined,
      descontoPartidasQtd: data.descontoPartidasQtd,
      descontoPartidasValor: data.descontoPartidasValor,
      descontoDinheiro: data.descontoDinheiro,
    })

    // Calcular saldo devedor
    const { saldoDevedorGerado } = calcularSaldoDevedor(calcResult.totalClientePaga, data.valorRecebido)

    // Se status mudou para Pago ou Parcial, definir dataPagamento
    const dataPagamento = (data.status === 'Pago' || data.status === 'Parcial') && !existing.dataPagamento
      ? new Date()
      : existing.dataPagamento

    const cobranca = await db.cobranca.update({
      where: { id },
      data: {
        locacaoId: data.locacaoId,
        dataInicio: new Date(data.dataInicio),
        dataFim: new Date(data.dataFim),
        dataPagamento,
        relogioAnterior: data.relogioAnterior,
        relogioAtual: data.relogioAtual,
        fichasRodadas: calcResult.fichasRodadas,
        valorFicha: locacao.precoFicha,
        totalBruto: calcResult.totalBruto,
        descontoPartidasQtd: data.descontoPartidasQtd,
        descontoPartidasValor: data.descontoPartidasValor,
        descontoDinheiro: data.descontoDinheiro,
        percentualEmpresa: locacao.percentualEmpresa,
        subtotalAposDescontos: calcResult.subtotalAposDescontos,
        valorPercentual: calcResult.valorPercentual,
        totalClientePaga: calcResult.totalClientePaga,
        valorRecebido: data.valorRecebido,
        saldoDevedorGerado,
        status: data.status,
        formaPagamento: locacao.formaPagamento,
        observacao: data.observacao,
        version: { increment: 1 },
      },
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'atualizar_cobranca',
      entidade: 'cobranca',
      entidadeId: cobranca.id,
      entidadeNome: `${existing.clienteNome} - ${data.dataInicio}/${data.dataFim}`,
      antes,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    await writeSyncLog('cobranca', cobranca.id, 'update', cobranca as unknown as Record<string, unknown>, new Date())

    return NextResponse.json(cobranca)
  } catch (error: unknown) {
    return handleApiError(error, 'Erro ao atualizar cobrança')
  }
}

// PATCH /api/cobrancas/[id] — Register a payment for this cobrança
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  const { id } = await params
  const existing = await db.cobranca.findFirst({ where: { id, deletedAt: null } })
  if (!existing) return NextResponse.json({ error: 'Cobrança não encontrada' }, { status: 404 })

  try {
    const body = await request.json()
    const pagamentoSchema = z.object({
      valor: z.number().positive('Valor do pagamento deve ser maior que zero').finite(),
      formaPagamento: z.enum(['Dinheiro', 'Pix', 'Cartão', 'Transferência'], { message: 'Forma de pagamento inválida' }),
      dataPagamento: z.string().optional(),
      observacao: z.string().optional(),
    })
    const { valor, formaPagamento, dataPagamento, observacao } = pagamentoSchema.parse(body)

    // Use a transaction with a re-read to fix the TOCTOU race condition:
    // 1. Create payment record
    // 2. Atomic increment of valorRecebido
    // 3. Re-read the cobrança inside the transaction to get the actual post-increment value
    // 4. Recalculate status and saldoDevedor from the real value
    const result = await db.$transaction(async (tx) => {
      // Create payment record
      const pagamento = await tx.pagamentoCobranca.create({
        data: {
          cobrancaId: id,
          valor,
          formaPagamento,
          dataPagamento: dataPagamento ? new Date(dataPagamento) : new Date(),
          observacao: observacao || null,
          usuarioId: session.userId,
          usuarioNome: session.nome || null,
        },
      })

      // Atomic increment of valorRecebido
      await tx.cobranca.update({
        where: { id },
        data: {
          valorRecebido: { increment: valor },
          version: { increment: 1 },
        },
      })

      // Re-read the cobrança to get the actual post-increment valorRecebido
      const updatedCobranca = await tx.cobranca.findFirst({
        where: { id, deletedAt: null },
      })
      if (!updatedCobranca) throw new Error('Cobrança não encontrada após atualização')

      const actualValorRecebido = toNumber(updatedCobranca.valorRecebido)
      const totalClientePagaNum = toNumber(updatedCobranca.totalClientePaga)

      // Determine new status based on the actual (post-increment) value
      let newStatus = updatedCobranca.status
      if (actualValorRecebido >= totalClientePagaNum) {
        newStatus = 'Pago'
      } else if (actualValorRecebido > 0 && actualValorRecebido < totalClientePagaNum) {
        newStatus = 'Parcial'
      }

      // Calculate new saldo devedor
      const { saldoDevedorGerado: newSaldoDevedor } = calcularSaldoDevedor(
        totalClientePagaNum,
        actualValorRecebido
      )

      // Set payment date if first payment
      const dataPagamentoCobranca = (newStatus === 'Pago' || newStatus === 'Parcial') && !updatedCobranca.dataPagamento
        ? (dataPagamento ? new Date(dataPagamento) : new Date())
        : updatedCobranca.dataPagamento

      // Update status and saldoDevedor from the correct values
      await tx.cobranca.update({
        where: { id },
        data: {
          status: newStatus,
          saldoDevedorGerado: newSaldoDevedor,
          dataPagamento: dataPagamentoCobranca,
        },
      })

      return { pagamento, newStatus, newSaldoDevedor, actualValorRecebido }
    })

    // Audit log
    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'registrar_pagamento',
      entidade: 'cobranca',
      entidadeId: id,
      entidadeNome: `${existing.clienteNome} - ${existing.dataInicio}/${existing.dataFim}`,
      detalhes: {
        valor,
        formaPagamento,
        dataPagamento,
        novoStatus: result.newStatus,
        novoValorRecebido: result.actualValorRecebido,
      },
      severidade: 'info',
    })

    return NextResponse.json({
      pagamento: result.pagamento,
      cobrancaAtualizada: {
        valorRecebido: result.actualValorRecebido,
        saldoDevedorGerado: result.newSaldoDevedor,
        status: result.newStatus,
      },
    })
  } catch (error) {
    return handleApiError(error, 'Erro ao registrar pagamento')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireAdmin()
  if (!authorized || !session) return response

  try {
  const { id } = await params
  const existing = await db.cobranca.findFirst({ where: { id, deletedAt: null } })
  if (!existing) return NextResponse.json({ error: 'Cobrança não encontrada' }, { status: 404 })

  const cobranca = await db.cobranca.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: 'excluir_cobranca',
    entidade: 'cobranca',
    entidadeId: cobranca.id,
    entidadeNome: `${existing.clienteNome} - ${existing.dataInicio}/${existing.dataFim}`,
    antes: existing as Record<string, unknown>,
    severidade: 'aviso',
  })

  await writeSyncLog('cobranca', cobranca.id, 'delete', null, new Date())

  return NextResponse.json({ message: 'Cobrança excluída com sucesso' })
  } catch (error) {
    return handleApiError(error, 'Erro ao excluir cobrança')
  }
}
