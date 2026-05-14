import { NextRequest, NextResponse } from 'next/server'
import { requireMutationRole } from '@/lib/rbac'
import { handleApiError } from '@/lib/api-utils'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { toNumber } from '@/lib/decimal'

/**
 * Sanitize a CSV cell value to prevent CSV injection attacks.
 * Prefixes cells starting with dangerous characters (=, +, -, @, tab, carriage return)
 * with a single quote so spreadsheet applications treat them as text, not formulas.
 */
function sanitizeCsvCell(value: string): string {
  if (/^[=+@\t\r-]/.test(value)) {
    return `'${value}`
  }
  return value
}

/**
 * Escape and sanitize a CSV cell value: sanitize for injection, then wrap in double quotes.
 */
function escapeCSV(value: string): string {
  return `"${sanitizeCsvCell(value)}"`
}

export async function GET(request: NextRequest) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  const searchParams = request.nextUrl.searchParams
  const tipo = searchParams.get('tipo') || 'financeiro'
  const dataInicio = searchParams.get('dataInicio') || ''
  const dataFim = searchParams.get('dataFim') || ''
  const formato = searchParams.get('formato') || 'csv'

  try {
    // Build date filter
    const dateFilter: Record<string, unknown> = {}
    if (dataInicio || dataFim) {
      const createdAt: Record<string, Date> = {}
      if (dataInicio) createdAt.gte = new Date(dataInicio)
      if (dataFim) createdAt.lte = new Date(dataFim + 'T23:59:59.999Z')
      dateFilter.createdAt = createdAt
    }

    if (tipo === 'financeiro') {
      return await generateFinancialReport(dateFilter, formato)
    } else if (tipo === 'cobrancas') {
      return await generateCobrancasReport(dateFilter, formato)
    } else if (tipo === 'clientes') {
      return await generateClientesReport(dateFilter, formato)
    } else if (tipo === 'produtos') {
      return await generateProdutosReport(dateFilter, formato)
    }

    return NextResponse.json({ error: 'Tipo de relatório inválido' }, { status: 400 })
  } catch (error) {
    return handleApiError(error, 'Erro ao gerar relatório')
  }
}

async function generateFinancialReport(dateFilter: Record<string, unknown>, formato: string) {
  const where: Record<string, unknown> = { deletedAt: null, ...dateFilter }

  const cobrancas = await db.cobranca.findMany({
    where,
    select: {
      id: true,
      clienteNome: true,
      produtoIdentificador: true,
      dataInicio: true,
      dataFim: true,
      totalClientePaga: true,
      valorRecebido: true,
      saldoDevedorGerado: true,
      status: true,
      formaPagamento: true,
      dataPagamento: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const totalCobrancas = cobrancas.length
  const totalValor = cobrancas.reduce((acc, c) => acc + toNumber(c.totalClientePaga), 0)
  const totalRecebido = cobrancas.reduce((acc, c) => acc + toNumber(c.valorRecebido), 0)
  const totalPendente = cobrancas
    .filter(c => c.status === 'Pendente' || c.status === 'Atrasado' || c.status === 'Parcial')
    .reduce((acc, c) => acc + (toNumber(c.totalClientePaga) - toNumber(c.valorRecebido)), 0)
  const totalAtrasado = cobrancas
    .filter(c => c.status === 'Atrasado')
    .reduce((acc, c) => acc + (toNumber(c.totalClientePaga) - toNumber(c.valorRecebido)), 0)

  if (formato === 'csv') {
    const header = 'ID,Cliente,Produto,Período,Valor Total,Recebido,Saldo Devedor,Status,Forma Pgto,Data Pagamento\n'
    const rows = cobrancas.map(c =>
      `${escapeCSV(c.id)},${escapeCSV(c.clienteNome)},${escapeCSV(c.produtoIdentificador)},${escapeCSV(`${c.dataInicio ? format(new Date(c.dataInicio), 'yyyy-MM-dd') : ''} a ${c.dataFim ? format(new Date(c.dataFim), 'yyyy-MM-dd') : ''}`)},${toNumber(c.totalClientePaga)},${toNumber(c.valorRecebido)},${toNumber(c.saldoDevedorGerado)},${escapeCSV(c.status)},${escapeCSV(c.formaPagamento)},${escapeCSV(c.dataPagamento ? format(new Date(c.dataPagamento), 'yyyy-MM-dd') : '')}`
    ).join('\n')

    const summary = `\n\nResumo Financeiro\nTotal de Cobranças,${totalCobrancas}\nValor Total,${totalValor.toFixed(2)}\nTotal Recebido,${totalRecebido.toFixed(2)}\nTotal Pendente,${totalPendente.toFixed(2)}\nTotal Atrasado,${totalAtrasado.toFixed(2)}\n`

    return new NextResponse(header + rows + summary, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="relatorio_financeiro_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  }

  // JSON format
  return NextResponse.json({
    tipo: 'financeiro',
    resumo: {
      totalCobrancas,
      totalValor,
      totalRecebido,
      totalPendente,
      totalAtrasado,
    },
    cobrancas,
  })
}

async function generateCobrancasReport(dateFilter: Record<string, unknown>, formato: string) {
  const where: Record<string, unknown> = { deletedAt: null, ...dateFilter }

  const cobrancas = await db.cobranca.findMany({
    where,
    select: {
      id: true,
      clienteNome: true,
      produtoIdentificador: true,
      dataInicio: true,
      dataFim: true,
      dataVencimento: true,
      totalClientePaga: true,
      valorRecebido: true,
      status: true,
      formaPagamento: true,
      createdAt: true,
    },
    orderBy: { dataVencimento: 'asc' },
  })

  const byStatus = cobrancas.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (formato === 'csv') {
    const header = 'ID,Cliente,Produto,Início,Fim,Vencimento,Valor,Recebido,Status,Forma Pgto\n'
    const rows = cobrancas.map(c =>
      `${escapeCSV(c.id)},${escapeCSV(c.clienteNome)},${escapeCSV(c.produtoIdentificador)},${escapeCSV(c.dataInicio ? format(new Date(c.dataInicio), 'yyyy-MM-dd') : '')},${escapeCSV(c.dataFim ? format(new Date(c.dataFim), 'yyyy-MM-dd') : '')},${escapeCSV(c.dataVencimento ? format(new Date(c.dataVencimento), 'yyyy-MM-dd') : '')},${toNumber(c.totalClientePaga)},${toNumber(c.valorRecebido)},${escapeCSV(c.status)},${escapeCSV(c.formaPagamento)}`
    ).join('\n')

    return new NextResponse(header + rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="relatorio_cobrancas_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  }

  return NextResponse.json({
    tipo: 'cobrancas',
    resumo: { total: cobrancas.length, byStatus },
    cobrancas,
  })
}

async function generateClientesReport(dateFilter: Record<string, unknown>, formato: string) {
  const where: Record<string, unknown> = { deletedAt: null }

  const clientes = await db.cliente.findMany({
    where,
    select: {
      id: true,
      identificador: true,
      nomeExibicao: true,
      telefonePrincipal: true,
      email: true,
      cidade: true,
      estado: true,
      status: true,
      rota: { select: { descricao: true } },
      _count: { select: { cobrancas: true, locacoes: true } },
    },
    orderBy: { nomeExibicao: 'asc' },
  })

  const ativos = clientes.filter(c => c.status === 'Ativo').length

  if (formato === 'csv') {
    const header = 'ID,Identificador,Nome,Telefone,Email,Cidade,Estado,Status,Rota,Cobranças,Locações\n'
    const rows = clientes.map(c =>
      `${escapeCSV(c.id)},${escapeCSV(c.identificador)},${escapeCSV(c.nomeExibicao)},${escapeCSV(c.telefonePrincipal)},${escapeCSV(c.email || '')},${escapeCSV(c.cidade)},${escapeCSV(c.estado)},${escapeCSV(c.status)},${escapeCSV(c.rota?.descricao || '')},${c._count.cobrancas},${c._count.locacoes}`
    ).join('\n')

    return new NextResponse(header + rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="relatorio_clientes_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  }

  return NextResponse.json({
    tipo: 'clientes',
    resumo: { total: clientes.length, ativos },
    clientes,
  })
}

async function generateProdutosReport(dateFilter: Record<string, unknown>, formato: string) {
  const where: Record<string, unknown> = { deletedAt: null }

  const produtos = await db.produto.findMany({
    where,
    select: {
      id: true,
      identificador: true,
      tipoNome: true,
      descricaoNome: true,
      tamanhoNome: true,
      conservacao: true,
      statusProduto: true,
      estabelecimento: true,
      numeroRelogio: true,
      _count: { select: { locacoes: true, cobrancas: true } },
    },
    orderBy: { identificador: 'asc' },
  })

  const ativos = produtos.filter(p => p.statusProduto === 'Ativo').length

  if (formato === 'csv') {
    const header = 'ID,Identificador,Tipo,Descrição,Tamanho,Conservação,Status,Estabelecimento,Relógio,Locações,Cobranças\n'
    const rows = produtos.map(p =>
      `${escapeCSV(p.id)},${escapeCSV(p.identificador)},${escapeCSV(p.tipoNome)},${escapeCSV(p.descricaoNome)},${escapeCSV(p.tamanhoNome)},${escapeCSV(p.conservacao)},${escapeCSV(p.statusProduto)},${escapeCSV(p.estabelecimento || '')},${escapeCSV(p.numeroRelogio)},${p._count.locacoes},${p._count.cobrancas}`
    ).join('\n')

    return new NextResponse(header + rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="relatorio_produtos_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  }

  return NextResponse.json({
    tipo: 'produtos',
    resumo: { total: produtos.length, ativos },
    produtos,
  })
}
