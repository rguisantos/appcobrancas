import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { Prisma } from '@prisma/client'
import { toNumber } from '@/lib/decimal'

export async function GET() {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const now = new Date()
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1)
    const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Run independent counts in parallel
    const [totalClientes, locacoesAtivas, totalProdutos, produtosLocadosResult] = await Promise.all([
      db.cliente.count({ where: { deletedAt: null, status: 'Ativo' } }),
      db.locacao.count({ where: { deletedAt: null, status: 'Ativa' } }),
      db.produto.count({ where: { deletedAt: null, statusProduto: 'Ativo' } }),
      // Use count with filter instead of findMany + .length
      db.produto.count({
        where: {
          deletedAt: null,
          locacoes: { some: { deletedAt: null, status: 'Ativa' } },
        },
      }),
    ])
    const produtosLocados = produtosLocadosResult

    // Current month revenue — use aggregate instead of findMany + reduce
    const ganhoMesResult = await db.cobranca.aggregate({
      where: {
        deletedAt: null,
        status: { in: ['Pago', 'Parcial'] },
        dataPagamento: { gte: inicioMes, lte: fimMes },
      },
      _sum: { valorRecebido: true },
    })
    const ganhoAtualMes = toNumber(ganhoMesResult._sum.valorRecebido)

    // Cobranças pendentes e atrasadas
    const [cobrancasPendentes, cobrancasAtrasadas] = await Promise.all([
      db.cobranca.count({ where: { deletedAt: null, status: { in: ['Pendente', 'Atrasado'] } } }),
      db.cobranca.count({ where: { deletedAt: null, status: 'Atrasado' } }),
    ])

    // Total value in Atrasado cobranças
    const cobrancasAtrasadasValor = await db.cobranca.aggregate({
      where: { deletedAt: null, status: 'Atrasado' },
      _sum: { totalClientePaga: true, valorRecebido: true },
    })
    const totalAtrasadoValor = toNumber(cobrancasAtrasadasValor._sum.totalClientePaga) - toNumber(cobrancasAtrasadasValor._sum.valorRecebido)

    // Clientes sem cobranças recentes (últimos 30 dias) — use raw SQL for efficiency
    const trintaDiasAtras = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const clientesComCobrancaRecente = await db.cobranca.findMany({
      where: {
        deletedAt: null,
        dataInicio: { gte: trintaDiasAtras },
      },
      select: { clienteId: true },
      distinct: ['clienteId'],
    })

    const clienteIdsComCobranca = clientesComCobrancaRecente.map(c => c.clienteId)

    const clientesNaoCobradosResult = await db.cliente.findMany({
      where: {
        deletedAt: null,
        status: 'Ativo',
        id: { notIn: clienteIdsComCobranca.length > 0 ? clienteIdsComCobranca : undefined },
      },
      select: { id: true, identificador: true, nomeExibicao: true, telefonePrincipal: true, rota: true },
      take: 20,
    })

    // Chart: Monthly revenue — single groupBy query instead of 12 parallel aggregates
    const dozeMesesAtras = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    const receitaMensalRaw = await db.cobranca.groupBy({
      by: ['dataPagamento'],
      where: {
        deletedAt: null,
        status: { in: ['Pago', 'Parcial'] },
        dataPagamento: { gte: dozeMesesAtras },
      },
      _sum: { valorRecebido: true },
    })

    // Aggregate by month from the raw results
    const monthlyMap = new Map<string, number>()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
      monthlyMap.set(label, 0)
    }

    for (const row of receitaMensalRaw) {
      if (row.dataPagamento) {
        const d = new Date(row.dataPagamento)
        const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
        const current = monthlyMap.get(label) || 0
        monthlyMap.set(label, current + toNumber(row._sum.valorRecebido))
      }
    }

    const receitaMensal = Array.from(monthlyMap.entries()).map(([mes, valor]) => ({ mes, valor }))

    // Chart: Cobranças by status (single groupBy)
    const cobrancasByStatusRaw = await db.cobranca.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { status: true },
    })

    const cobrancasByStatus = cobrancasByStatusRaw.map(s => ({
      status: s.status,
      quantidade: s._count.status,
    }))

    // Chart: Cobranças by forma de pagamento (single groupBy)
    const cobrancasByFormaPagamentoRaw = await db.cobranca.groupBy({
      by: ['formaPagamento'],
      where: { deletedAt: null, status: { in: ['Pago', 'Parcial'] } },
      _count: { formaPagamento: true },
    })

    const cobrancasByFormaPagamento = cobrancasByFormaPagamentoRaw.map(f => ({
      formaPagamento: f.formaPagamento,
      quantidade: f._count.formaPagamento,
    }))

    // Top 5 clients with highest pending debts — use raw SQL aggregation instead of N+1
    const clientesDividaRaw: { id: string; nomeExibicao: string; divida: number }[] = await db.$queryRaw`
      SELECT c.id, c."nomeExibicao",
        COALESCE(SUM(cb."totalClientePaga" - cb."valorRecebido"), 0) as divida
      FROM clientes c
      INNER JOIN cobrancas cb ON cb."clienteId" = c.id AND cb."deletedAt" IS NULL
        AND cb.status IN ('Pendente', 'Atrasado', 'Parcial')
      WHERE c."deletedAt" IS NULL AND c.status = 'Ativo'
      GROUP BY c.id, c."nomeExibicao"
      HAVING COALESCE(SUM(cb."totalClientePaga" - cb."valorRecebido"), 0) > 0
      ORDER BY divida DESC
      LIMIT 5
    `

    const clientesDivida = clientesDividaRaw.map(c => ({
      id: c.id,
      nomeExibicao: c.nomeExibicao,
      divida: Number(c.divida),
    }))

    // Recent cobranças (last 10)
    const cobrancasRecentes = await db.cobranca.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        clienteNome: true,
        produtoIdentificador: true,
        totalClientePaga: true,
        status: true,
        createdAt: true,
        dataInicio: true,
        dataFim: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      ganhoAtualMes,
      totalClientes,
      produtosLocados,
      totalProdutos,
      locacoesAtivas,
      cobrancasPendentes,
      cobrancasAtrasadas,
      totalAtrasadoValor,
      clientesNaoCobrados: clientesNaoCobradosResult,
      receitaMensal,
      cobrancasByStatus,
      cobrancasByFormaPagamento,
      clientesDivida,
      cobrancasRecentes,
    })
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error)
    return NextResponse.json({ error: 'Erro ao buscar dados do dashboard' }, { status: 500 })
  }
}
