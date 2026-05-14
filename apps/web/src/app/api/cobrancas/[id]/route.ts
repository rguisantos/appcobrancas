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
    console.error('Erro ao buscar cobrança:', error)
    return NextResponse.json({ error: 'Erro ao buscar cobrança' }, { status: 500 })
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
    if (body._partial && (body.valorRecebido !== undefined || body.status !== undefined)) {
      const partialSchema = z.object({
        _partial: z.literal(true),
        valorRecebido: z.number().min(0).finite().optional(),
        status: z.enum(['Pendente', 'Pago', 'Parcial', 'Atrasado']).optional(),
      })
      const partialData = partialSchema.parse(body)
      const updateData: Record<string, unknown> = {}

      if (partialData.valorRecebido !== undefined) {
        updateData.valorRecebido = partialData.valorRecebido
      }

      if (partialData.status !== undefined) {
        updateData.status = partialData.status
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

    return NextResponse.json(cobranca)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar cobrança' }, { status: 500 })
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

    // Determine total for status calculation (read for status logic only, not for valorRecebido)
    const totalClientePagaNum = toNumber(existing.totalClientePaga)
    // Calculate expected new valorRecebido for status determination
    const currentValorRecebido = toNumber(existing.valorRecebido)
    const expectedValorRecebido = currentValorRecebido + valor

    // Determine new status based on payment
    let newStatus = existing.status
    if (expectedValorRecebido >= totalClientePagaNum) {
      newStatus = 'Pago'
    } else if (expectedValorRecebido > 0 && expectedValorRecebido < totalClientePagaNum) {
      newStatus = 'Parcial'
    }

    // Calculate new saldo devedor
    const { saldoDevedorGerado: newSaldoDevedor } = calcularSaldoDevedor(
      totalClientePagaNum,
      expectedValorRecebido
    )

    // Set payment date if first payment
    const dataPagamentoCobranca = (newStatus === 'Pago' || newStatus === 'Parcial') && !existing.dataPagamento
      ? (dataPagamento ? new Date(dataPagamento) : new Date())
      : existing.dataPagamento

    // Create the payment record and update cobrança in a transaction
    // Use atomic increment for valorRecebido to prevent race conditions
    const [pagamento] = await db.$transaction([
      db.pagamentoCobranca.create({
        data: {
          cobrancaId: id,
          valor,
          formaPagamento,
          dataPagamento: dataPagamento ? new Date(dataPagamento) : new Date(),
          observacao: observacao || null,
          usuarioId: session.userId,
          usuarioNome: session.nome || null,
        },
      }),
      db.cobranca.update({
        where: { id },
        data: {
          valorRecebido: { increment: valor },
          saldoDevedorGerado: newSaldoDevedor,
          status: newStatus,
          dataPagamento: dataPagamentoCobranca,
          version: { increment: 1 },
        },
      }),
    ])

    const newValorRecebido = expectedValorRecebido

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
        novoStatus: newStatus,
        novoValorRecebido: newValorRecebido,
      },
      severidade: 'info',
    })

    return NextResponse.json({
      pagamento,
      cobrancaAtualizada: {
        valorRecebido: newValorRecebido,
        saldoDevedorGerado: newSaldoDevedor,
        status: newStatus,
      },
    })
  } catch (error) {
    console.error('Erro ao registrar pagamento:', error)
    return NextResponse.json({ error: 'Erro ao registrar pagamento' }, { status: 500 })
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

  return NextResponse.json({ message: 'Cobrança excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir cobrança:', error)
    return NextResponse.json({ error: 'Erro ao excluir cobrança' }, { status: 500 })
  }
}
