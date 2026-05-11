import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { cobrancaSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'
import { calcularCobranca, calcularSaldoDevedor } from '@/lib/cobranca-calculos'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit
  const status = searchParams.get('status') || ''
  const clienteId = searchParams.get('clienteId') || ''
  const locacaoId = searchParams.get('locacaoId') || ''
  const periodoInicio = searchParams.get('periodoInicio') || ''
  const periodoFim = searchParams.get('periodoFim') || ''

  const where: Record<string, unknown> = {
    deletedAt: null,
  }

  if (status) {
    const statuses = status.split(',')
    if (statuses.length === 1) {
      where.status = statuses[0]
    } else {
      where.status = { in: statuses }
    }
  }
  if (clienteId) where.clienteId = clienteId
  if (locacaoId) where.locacaoId = locacaoId

  if (periodoInicio && periodoFim) {
    where.AND = [
      { dataInicio: { gte: periodoInicio } },
      { dataFim: { lte: periodoFim } },
    ]
  }

  const [data, total] = await Promise.all([
    db.cobranca.findMany({
      where,
      skip,
      take: limit,
      include: { locacao: true, cliente: true, produto: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.cobranca.count({ where }),
  ])

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await request.json()
    const data = cobrancaSchema.parse(body)

    // Buscar locação para obter dados financeiros
    const locacao = await db.locacao.findFirst({
      where: { id: data.locacaoId, deletedAt: null },
    })

    if (!locacao) return NextResponse.json({ error: 'Locação não encontrada' }, { status: 400 })

    // Buscar dados do cliente e produto
    const [cliente, produto] = await Promise.all([
      db.cliente.findFirst({ where: { id: locacao.clienteId, deletedAt: null } }),
      db.produto.findFirst({ where: { id: locacao.produtoId, deletedAt: null } }),
    ])

    if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 400 })
    if (!produto) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 400 })

    // Calcular valores da cobrança
    const calcResult = calcularCobranca({
      formaPagamento: locacao.formaPagamento as 'Periodo' | 'PercentualPagar' | 'PercentualReceber',
      relogioAnterior: data.relogioAnterior,
      relogioAtual: data.relogioAtual,
      precoFicha: locacao.precoFicha,
      percentualEmpresa: locacao.percentualEmpresa,
      valorFixo: locacao.valorFixo ?? undefined,
      descontoPartidasQtd: data.descontoPartidasQtd,
      descontoPartidasValor: data.descontoPartidasValor,
      descontoDinheiro: data.descontoDinheiro,
    })

    // Calcular saldo devedor
    const { saldoDevedorGerado } = calcularSaldoDevedor(calcResult.totalClientePaga, data.valorRecebido)

    // Data de vencimento = dataFim
    const dataVencimento = data.dataFim

    // Se status é Pago ou Parcial, dataPagamento = now
    const dataPagamento = (data.status === 'Pago' || data.status === 'Parcial')
      ? new Date().toISOString().split('T')[0]
      : null

    const cobranca = await db.cobranca.create({
      data: {
        locacaoId: data.locacaoId,
        clienteId: locacao.clienteId,
        clienteNome: cliente.nomeExibicao,
        produtoId: locacao.produtoId,
        produtoIdentificador: locacao.produtoIdentificador,
        dataInicio: data.dataInicio,
        dataFim: data.dataFim,
        dataPagamento,
        dataVencimento,
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
      },
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'criar_cobranca',
      entidade: 'cobranca',
      entidadeId: cobranca.id,
      entidadeNome: `${cliente.nomeExibicao} - ${data.dataInicio}/${data.dataFim}`,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    return NextResponse.json(cobranca, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao criar cobrança' }, { status: 500 })
  }
}
