import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireMutationRole } from '@/lib/rbac'
import { registrarAuditoria } from '@/lib/auditoria'
import { checkRateLimit } from '@/lib/rate-limit'
import { handleApiError } from '@/lib/api-utils'

interface CsvRow {
  identificador: string
  tipoNome: string
  descricaoNome: string
  tamanhoNome: string
  conservacao: string
  numeroRelogio: string
  statusProduto: string
}

function parseCSV(text: string): { rows: CsvRow[]; headers: string[] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  if (lines.length < 2) return { rows: [], headers: [] }

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''))

  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    if (values.length < headers.length) continue

    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })

    rows.push({
      identificador: row['identificador'] || '',
      tipoNome: row['tipoNome'] || '',
      descricaoNome: row['descricaoNome'] || '',
      tamanhoNome: row['tamanhoNome'] || '',
      conservacao: row['conservacao'] || 'Boa',
      numeroRelogio: row['numeroRelogio'] || '0',
      statusProduto: row['statusProduto'] || 'Ativo',
    })
  }

  return { rows, headers }
}

async function findOrCreateTipo(nome: string): Promise<{ id: string; nome: string }> {
  const existing = await db.tipoProduto.findFirst({ where: { nome } })
  if (existing) return existing
  return db.tipoProduto.create({ data: { nome } })
}

async function findOrCreateDescricao(nome: string): Promise<{ id: string; nome: string }> {
  const existing = await db.descricaoProduto.findFirst({ where: { nome } })
  if (existing) return existing
  return db.descricaoProduto.create({ data: { nome } })
}

async function findOrCreateTamanho(nome: string): Promise<{ id: string; nome: string }> {
  const existing = await db.tamanhoProduto.findFirst({ where: { nome } })
  if (existing) return existing
  return db.tamanhoProduto.create({ data: { nome } })
}

export async function POST(request: NextRequest) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  // Rate limit: 10 imports per 15 minutes per user
  const rateLimit = checkRateLimit(`import-produtos-${session.userId}`, 10, 15 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Muitas importações. Tente novamente em alguns minutos.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimit.resetAtMs - Date.now()) / 1000)) } }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Arquivo CSV não fornecido' }, { status: 400 })
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Arquivo deve ser CSV' }, { status: 400 })
    }

    // Limit file size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo: 5MB' }, { status: 400 })
    }

    const text = await file.text()
    const { rows } = parseCSV(text)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSV vazio ou formato inválido' }, { status: 400 })
    }

    // Limit number of rows
    if (rows.length > 500) {
      return NextResponse.json({ error: 'Máximo de 500 linhas por importação' }, { status: 400 })
    }

    const errors: Array<{ row: number; error: string }> = []
    let success = 0

    const validConservacao = ['Ótima', 'Boa', 'Regular', 'Ruim', 'Péssima']
    const validStatus = ['Ativo', 'Inativo', 'Manutenção']

    // Process in batches of 10
    const batchSize = 10
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      const batchPromises = batch.map(async (row, batchIndex) => {
        const rowIndex = i + batchIndex + 2 // +2 for header and 1-based index

        // Validate required fields
        if (!row.identificador) {
          errors.push({ row: rowIndex, error: 'Identificador é obrigatório' })
          return
        }
        if (!row.tipoNome) {
          errors.push({ row: rowIndex, error: 'tipoNome é obrigatório' })
          return
        }
        if (!row.descricaoNome) {
          errors.push({ row: rowIndex, error: 'descricaoNome é obrigatório' })
          return
        }
        if (!row.tamanhoNome) {
          errors.push({ row: rowIndex, error: 'tamanhoNome é obrigatório' })
          return
        }

        if (row.conservacao && !validConservacao.includes(row.conservacao)) {
          errors.push({ row: rowIndex, error: `conservacao deve ser um de: ${validConservacao.join(', ')}` })
          return
        }

        if (row.statusProduto && !validStatus.includes(row.statusProduto)) {
          errors.push({ row: rowIndex, error: `statusProduto deve ser um de: ${validStatus.join(', ')}` })
          return
        }

        // Check for duplicate identificador
        const existing = await db.produto.findFirst({
          where: { identificador: row.identificador, deletedAt: null },
        })
        if (existing) {
          errors.push({ row: rowIndex, error: `Identificador "${row.identificador}" já existe` })
          return
        }

        try {
          // Find or create Tipo, Descricao, Tamanho
          const [tipo, descricao, tamanho] = await Promise.all([
            findOrCreateTipo(row.tipoNome),
            findOrCreateDescricao(row.descricaoNome),
            findOrCreateTamanho(row.tamanhoNome),
          ])

          const produto = await db.produto.create({
            data: {
              identificador: row.identificador,
              tipoId: tipo.id,
              tipoNome: tipo.nome,
              descricaoId: descricao.id,
              descricaoNome: descricao.nome,
              tamanhoId: tamanho.id,
              tamanhoNome: tamanho.nome,
              conservacao: row.conservacao || 'Boa',
              numeroRelogio: row.numeroRelogio || '0',
              statusProduto: row.statusProduto || 'Ativo',
            },
          })

          await registrarAuditoria({
            usuarioId: session.userId,
            acao: 'importar_produto',
            entidade: 'produto',
            entidadeId: produto.id,
            entidadeNome: produto.identificador,
            depois: { identificador: row.identificador, importado: true } as Record<string, unknown>,
            severidade: 'info',
          })

          success++
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erro ao criar produto'
          errors.push({ row: rowIndex, error: message })
        }
      })

      await Promise.all(batchPromises)
    }

    return NextResponse.json({
      success,
      errors,
      total: rows.length,
    })
  } catch (error) {
    return handleApiError(error, 'Erro ao importar produtos')
  }
}
