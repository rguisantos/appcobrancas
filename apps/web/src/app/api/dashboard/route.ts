import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'

export async function GET() {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const now = new Date()
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    // Total clientes ativos
    const totalClientes = await db.cliente.count({
      where: { deletedAt: null, status: 'Ativo' },
    })

    // Locações ativas
    const locacoesAtivas = await db.locacao.count({
      where: { deletedAt: null, status: 'Ativa' },
    })

    // Produtos locados (produtos que possuem locações ativas)
    const produtosLocadosResult = await db.produto.findMany({
      where: {
        deletedAt: null,
        locacoes: { some: { deletedAt: null, status: 'Ativa' } },
      },
      select: { id: true },
    })
    const produtosLocados = produtosLocadosResult.length

    // Total de produtos ativos
    const totalProdutos = await db.produto.count({
      where: { deletedAt: null, statusProduto: 'Ativo' },
    })

    // Ganho atual do mês (cobranças pagas ou parciais no mês)
    const cobrancasMes = await db.cobranca.findMany({
      where: {
        deletedAt: null,
        status: { in: ['Pago', 'Parcial'] },
        dataPagamento: { gte: inicioMes, lte: fimMes },
      },
      select: { valorRecebido: true },
    })
    const ganhoAtualMes = cobrancasMes.reduce((acc, c) => acc + c.valorRecebido, 0)

    // Cobranças pendentes e atrasadas
    const cobrancasPendentes = await db.cobranca.count({
      where: { deletedAt: null, status: { in: ['Pendente', 'Atrasado'] } },
    })

    // Cobranças atrasadas specifically
    const cobrancasAtrasadas = await db.cobranca.count({
      where: { deletedAt: null, status: 'Atrasado' },
    })

    // Total value in Atrasado cobranças
    const cobrancasAtrasadasValor = await db.cobranca.aggregate({
      where: { deletedAt: null, status: 'Atrasado' },
      _sum: { totalClientePaga: true, valorRecebido: true },
    })
    const totalAtrasadoValor = (cobrancasAtrasadasValor._sum.totalClientePaga || 0) - (cobrancasAtrasadasValor._sum.valorRecebido || 0)

    // Clientes sem cobranças recentes (últimos 30 dias)
    const trintaDiasAtras = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

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

    // Chart: Monthly revenue (last 12 months)
    const receitaMensal: { mes: string; valor: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mesInicio = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
      const mesFim = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
      const mesLabel = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')

      const cobrancasDoMes = await db.cobranca.findMany({
        where: {
          deletedAt: null,
          status: { in: ['Pago', 'Parcial'] },
          dataPagamento: { gte: mesInicio, lte: mesFim },
        },
        select: { valorRecebido: true },
      })
      const totalMes = cobrancasDoMes.reduce((acc, c) => acc + c.valorRecebido, 0)

      receitaMensal.push({ mes: mesLabel, valor: totalMes })
    }

    // Chart: Cobranças by status
    const cobrancasByStatusRaw = await db.cobranca.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { status: true },
    })

    const cobrancasByStatus = cobrancasByStatusRaw.map(s => ({
      status: s.status,
      quantidade: s._count.status,
    }))

    // Chart: Cobranças by forma de pagamento
    const cobrancasByFormaPagamentoRaw = await db.cobranca.groupBy({
      by: ['formaPagamento'],
      where: { deletedAt: null, status: { in: ['Pago', 'Parcial'] } },
      _count: { formaPagamento: true },
    })

    const cobrancasByFormaPagamento = cobrancasByFormaPagamentoRaw.map(f => ({
      formaPagamento: f.formaPagamento,
      quantidade: f._count.formaPagamento,
    }))

    // Chart: Top 5 clients with highest pending debts
    const clientesDividaRaw = await db.cliente.findMany({
      where: { deletedAt: null, status: 'Ativo' },
      select: {
        id: true,
        nomeExibicao: true,
        cobrancas: {
          where: { deletedAt: null, status: { in: ['Pendente', 'Atrasado', 'Parcial'] } },
          select: { totalClientePaga: true, valorRecebido: true },
        },
      },
    })

    const clientesDivida = clientesDividaRaw
      .map(c => ({
        id: c.id,
        nomeExibicao: c.nomeExibicao,
        divida: c.cobrancas.reduce((acc, cob) => acc + (cob.totalClientePaga - cob.valorRecebido), 0),
      }))
      .filter(c => c.divida > 0)
      .sort((a, b) => b.divida - a.divida)
      .slice(0, 5)

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
