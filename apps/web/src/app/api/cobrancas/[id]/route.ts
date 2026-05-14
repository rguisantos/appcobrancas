import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { requireMutationRole, requireAdmin } from '@/lib/rbac'
import { cobrancaSchema } from '@/lib/validations'
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
      const updateData: Record<string, unknown> = {}

      // Validate valorRecebido: must be a non-negative number
      if (body.valorRecebido !== undefined) {
        if (typeof body.valorRecebido !== 'number' || body.valorRecebido < 0) {
          return NextResponse.json({ error: 'valorRecebido deve ser um número não negativo' }, { status: 400 })
        }
        updateData.valorRecebido = body.valorRecebido
      }

      // Validate status: must be one of the allowed values
      const validStatuses = ['Pendente', 'Pago', 'Parcial', 'Atrasado']
      if (body.status !== undefined) {
        if (!validStatuses.includes(body.status)) {
          return NextResponse.json({ error: `status deve ser um de: ${validStatuses.join(', ')}` }, { status: 400 })
        }
        updateData.status = body.status
      }

      // Recalculate saldo devedor if valorRecebido changed
      if (body.valorRecebido !== undefined) {
        const { saldoDevedorGerado } = calcularSaldoDevedor(toNumber(existing.totalClientePaga), body.valorRecebido)
        updateData.saldoDevedorGerado = saldoDevedorGerado
      }

      // Set payment date if status changed to Pago/Parcial
      if ((body.status === 'Pago' || body.status === 'Parcial') && !existing.dataPagamento) {
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
    const { valor, formaPagamento, dataPagamento, observacao } = body

    if (!valor || valor <= 0) {
      return NextResponse.json({ error: 'Valor do pagamento deve ser maior que zero' }, { status: 400 })
    }

    const validFormasPagamento = ['Dinheiro', 'Pix', 'Cartão', 'Transferência']
    if (!validFormasPagamento.includes(formaPagamento)) {
      return NextResponse.json({ error: 'Forma de pagamento inválida' }, { status: 400 })
    }

    // Calculate new valorRecebido (cumulative)
    const newValorRecebido = toNumber(existing.valorRecebido) + valor

    // Determine new status based on payment
    const totalClientePagaNum = toNumber(existing.totalClientePaga)
    let newStatus = existing.status
    if (newValorRecebido >= totalClientePagaNum) {
      newStatus = 'Pago'
    } else if (newValorRecebido > 0 && newValorRecebido < totalClientePagaNum) {
      newStatus = 'Parcial'
    }

    // Calculate new saldo devedor
    const { saldoDevedorGerado: newSaldoDevedor } = calcularSaldoDevedor(
      totalClientePagaNum,
      newValorRecebido
    )

    // Set payment date if first payment
    const dataPagamentoCobranca = (newStatus === 'Pago' || newStatus === 'Parcial') && !existing.dataPagamento
      ? (dataPagamento ? new Date(dataPagamento) : new Date())
      : existing.dataPagamento

    // Create the payment record and update cobrança in a transaction
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
          valorRecebido: newValorRecebido,
          saldoDevedorGerado: newSaldoDevedor,
          status: newStatus,
          dataPagamento: dataPagamentoCobranca,
          version: { increment: 1 },
        },
      }),
    ])

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
