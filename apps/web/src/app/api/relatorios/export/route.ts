import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-jwt'
import { db } from '@/lib/db'
import ExcelJS from 'exceljs'

type ReportType = 'financeiro' | 'clientes' | 'produtos' | 'locacoes' | 'inadimplencia' | 'recebimentos' | 'rotas' | 'comparativo'

const VALID_TYPES: ReportType[] = ['financeiro', 'clientes', 'produtos', 'locacoes', 'inadimplencia', 'recebimentos', 'rotas', 'comparativo']

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const tipo = searchParams.get('tipo') as ReportType | null
  const format = searchParams.get('format') as 'xlsx' | 'csv' | null
  const dataInicio = searchParams.get('dataInicio')
  const dataFim = searchParams.get('dataFim')

  if (!tipo || !VALID_TYPES.includes(tipo)) {
    return NextResponse.json({ error: 'Tipo de relatório inválido' }, { status: 400 })
  }

  if (!format || !['xlsx', 'csv'].includes(format)) {
    return NextResponse.json({ error: 'Formato inválido. Use xlsx ou csv' }, { status: 400 })
  }

  try {
    const { headers, rows } = await generateReportData(tipo, dataInicio, dataFim)
    const filename = `relatorio-${tipo}-${new Date().toISOString().slice(0, 10)}`

    if (format === 'csv') {
      const csvContent = generateCSV(headers, rows)
      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename=${filename}.csv`,
        },
      })
    }

    // XLSX format
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'App Cobranças'
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet('Relatório')

    // Add headers
    worksheet.columns = headers.map((h) => ({ header: h, key: h }))

    // Add rows
    rows.forEach((row) => {
      const rowData: Record<string, string | number> = {}
      headers.forEach((h, i) => {
        rowData[h] = row[i] ?? ''
      })
      worksheet.addRow(rowData)
    })

    // Style header row
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, size: 11 }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    headerRow.height = 24

    // Auto-width columns
    worksheet.columns.forEach((col) => {
      let maxLen = (col.header as string)?.length || 10
      col.eachCell!({ includeEmpty: false }, (cell) => {
        const cellLen = String(cell.value).length
        if (cellLen > maxLen) maxLen = cellLen
      })
      col.width = Math.min(Math.max(maxLen + 3, 12), 40)
    })

    // Add borders to all cells
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        }
      })
    })

    const buffer = await workbook.xlsx.writeBuffer()

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=${filename}.xlsx`,
      },
    })
  } catch (error) {
    console.error('Erro ao gerar relatório:', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 })
  }
}

function generateCSV(headers: string[], rows: (string | number)[][]): string {
  const escapeCSV = (val: string | number) => {
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const lines: string[] = []
  lines.push(headers.map(escapeCSV).join(','))
  rows.forEach((row) => {
    lines.push(row.map(escapeCSV).join(','))
  })
  return lines.join('\n')
}

async function generateReportData(
  tipo: ReportType,
  dataInicio: string | null,
  dataFim: string | null
): Promise<{ headers: string[]; rows: (string | number)[][] }> {
  switch (tipo) {
    case 'financeiro':
      return await generateFinanceiroReport(dataInicio, dataFim)
    case 'clientes':
      return await generateClientesReport()
    case 'produtos':
      return await generateProdutosReport()
    case 'locacoes':
      return await generateLocacoesReport(dataInicio, dataFim)
    case 'inadimplencia':
      return await generateInadimplenciaReport()
    case 'recebimentos':
      return await generateRecebimentosReport()
    case 'rotas':
      return await generateRotasReport()
    case 'comparativo':
      return await generateComparativoReport(dataInicio, dataFim)
    default:
      return { headers: [], rows: [] }
  }
}

async function generateFinanceiroReport(dataInicio: string | null, dataFim: string | null) {
  const where: Record<string, unknown> = { deletedAt: null }
  if (dataInicio && dataFim) {
    where.dataInicio = { gte: dataInicio, lte: dataFim }
  }

  const cobrancas = await db.cobranca.findMany({ where })

  const monthlyData: Record<string, { receita: number; pendente: number }> = {}
  cobrancas.forEach((c) => {
    const month = c.dataInicio?.substring(0, 7) || 'unknown'
    if (!monthlyData[month]) monthlyData[month] = { receita: 0, pendente: 0 }
    if (c.status === 'Pago' || c.status === 'Parcial') {
      monthlyData[month].receita += c.valorRecebido
    } else {
      monthlyData[month].pendente += c.totalClientePaga
    }
  })

  const rows = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => [
      month,
      Number(data.receita.toFixed(2)),
      Number(data.pendente.toFixed(2)),
      Number((data.receita + data.pendente).toFixed(2)),
    ])

  return {
    headers: ['Mês', 'Receita', 'Pendente', 'Total'],
    rows,
  }
}

async function generateClientesReport() {
  const clientes = await db.cliente.findMany({
    where: { deletedAt: null },
    include: {
      locacoes: { where: { deletedAt: null, status: 'Ativa' } },
      cobrancas: { where: { deletedAt: null } },
      rota: true,
    },
  })

  const rows = clientes.map((c) => {
    const totalPago = c.cobrancas
      .filter((cb) => cb.status === 'Pago')
      .reduce((s, cb) => s + cb.valorRecebido, 0)
    const totalPendente = c.cobrancas
      .filter((cb) => cb.status === 'Pendente' || cb.status === 'Atrasado')
      .reduce((s, cb) => s + cb.totalClientePaga, 0)

    return [
      c.nomeExibicao,
      c.identificador,
      c.cidade || '',
      c.rota?.descricao || 'Sem rota',
      c.locacoes.length,
      Number(totalPago.toFixed(2)),
      Number(totalPendente.toFixed(2)),
    ]
  })

  return {
    headers: ['Nome', 'Identificador', 'Cidade', 'Rota', 'Locações Ativas', 'Total Pago', 'Total Pendente'],
    rows,
  }
}

async function generateProdutosReport() {
  const produtos = await db.produto.findMany({
    where: { deletedAt: null },
    include: {
      locacoes: { where: { deletedAt: null, status: 'Ativa' }, take: 1 },
    },
  })

  const rows = produtos.map((p) => ({
    identificador: p.identificador,
    tipo: p.tipoNome,
    descricao: p.descricaoNome,
    status: p.statusProduto,
    locado: p.locacoes.length > 0 ? 'Sim' : 'Não',
    cliente: p.locacoes[0]?.clienteNome || '',
  }))

  return {
    headers: ['Identificador', 'Tipo', 'Descrição', 'Status', 'Locado', 'Cliente'],
    rows: rows.map((r) => [r.identificador, r.tipo, r.descricao, r.status, r.locado, r.cliente]),
  }
}

async function generateLocacoesReport(dataInicio: string | null, dataFim: string | null) {
  const where: Record<string, unknown> = { deletedAt: null }
  if (dataInicio && dataFim) {
    where.dataLocacao = { gte: dataInicio, lte: dataFim }
  }

  const locacoes = await db.locacao.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  return {
    headers: ['Cliente', 'Produto', 'Tipo', 'Data Locação', 'Forma Pagamento', 'Status'],
    rows: locacoes.map((l) => [
      l.clienteNome,
      l.produtoIdentificador,
      l.produtoTipo,
      l.dataLocacao,
      l.formaPagamento,
      l.status,
    ]),
  }
}

async function generateInadimplenciaReport() {
  const cobrancas = await db.cobranca.findMany({
    where: { deletedAt: null, status: { in: ['Atrasado', 'Parcial', 'Pendente'] } },
    orderBy: { dataVencimento: 'asc' },
  })

  return {
    headers: ['Cliente', 'Produto', 'Valor', 'Vencimento', 'Status'],
    rows: cobrancas.map((c) => [
      c.clienteNome,
      c.produtoIdentificador,
      Number((c.totalClientePaga - c.valorRecebido).toFixed(2)),
      c.dataVencimento || '',
      c.status,
    ]),
  }
}

async function generateRecebimentosReport() {
  const cobrancas = await db.cobranca.findMany({
    where: { deletedAt: null, status: { in: ['Pago', 'Parcial'] } },
    orderBy: { dataPagamento: 'desc' },
    take: 500,
  })

  return {
    headers: ['Cliente', 'Produto', 'Valor Recebido', 'Data Pagamento'],
    rows: cobrancas.map((c) => [
      c.clienteNome,
      c.produtoIdentificador,
      Number(c.valorRecebido.toFixed(2)),
      c.dataPagamento || '',
    ]),
  }
}

async function generateRotasReport() {
  const rotas = await db.rota.findMany({
    where: { deletedAt: null },
    include: {
      clientes: {
        where: { deletedAt: null, status: 'Ativo' },
        include: {
          cobrancas: { where: { deletedAt: null } },
        },
      },
    },
  })

  return {
    headers: ['Rota', 'Região', 'Clientes', 'Receita', 'Pendente'],
    rows: rotas.map((r) => {
      const receita = r.clientes
        .flatMap((c) => c.cobrancas)
        .filter((cb) => cb.status === 'Pago' || cb.status === 'Parcial')
        .reduce((s, cb) => s + cb.valorRecebido, 0)
      const pendente = r.clientes
        .flatMap((c) => c.cobrancas)
        .filter((cb) => cb.status === 'Pendente' || cb.status === 'Atrasado')
        .reduce((s, cb) => s + cb.totalClientePaga, 0)

      return [
        r.descricao,
        r.regiao || '',
        r.clientes.length,
        Number(receita.toFixed(2)),
        Number(pendente.toFixed(2)),
      ]
    }),
  }
}

async function generateComparativoReport(dataInicio: string | null, dataFim: string | null) {
  const where: Record<string, unknown> = { deletedAt: null }
  if (dataInicio && dataFim) {
    where.dataInicio = { gte: dataInicio, lte: dataFim }
  }

  const cobrancas = await db.cobranca.findMany({ where })

  const monthlyData: Record<string, { receita: number; total: number }> = {}
  cobrancas.forEach((c) => {
    const month = c.dataInicio?.substring(0, 7) || 'unknown'
    if (!monthlyData[month]) monthlyData[month] = { receita: 0, total: 0 }
    monthlyData[month].total += c.totalClientePaga
    if (c.status === 'Pago' || c.status === 'Parcial') {
      monthlyData[month].receita += c.valorRecebido
    }
  })

  const rows = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => {
      const adimplencia = data.total > 0 ? ((data.receita / data.total) * 100).toFixed(1) : '0.0'
      return [
        month,
        Number(data.receita.toFixed(2)),
        Number(data.total.toFixed(2)),
        `${adimplencia}%`,
      ]
    })

  return {
    headers: ['Mês', 'Receita', 'Total', 'Adimplência %'],
    rows,
  }
}
