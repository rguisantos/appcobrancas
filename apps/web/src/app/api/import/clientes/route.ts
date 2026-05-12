import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { registrarAuditoria } from '@/lib/auditoria'
import { generateUniqueIdentifier } from '@/lib/auto-identifier'

interface CsvRow {
  identificador: string
  nomeExibicao: string
  nomeCompleto: string
  tipoPessoa: string
  telefonePrincipal: string
  email: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
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
      nomeExibicao: row['nomeExibicao'] || '',
      nomeCompleto: row['nomeCompleto'] || '',
      tipoPessoa: row['tipoPessoa'] || 'Fisica',
      telefonePrincipal: row['telefonePrincipal'] || '',
      email: row['email'] || '',
      cep: row['cep'] || '',
      logradouro: row['logradouro'] || '',
      numero: row['numero'] || '',
      complemento: row['complemento'] || '',
      bairro: row['bairro'] || '',
      cidade: row['cidade'] || '',
      estado: row['estado'] || '',
    })
  }

  return { rows, headers }
}

async function fetchViaCEP(cep: string): Promise<Record<string, string> | null> {
  try {
    const cleanCep = cep.replace(/\D/g, '')
    if (cleanCep.length !== 8) return null

    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null

    const data = await res.json()
    if (data.erro) return null

    return {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      estado: data.uf || '',
      complemento: data.complemento || '',
    }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Arquivo CSV não fornecido' }, { status: 400 })
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Arquivo deve ser CSV' }, { status: 400 })
    }

    const text = await file.text()
    const { rows } = parseCSV(text)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSV vazio ou formato inválido' }, { status: 400 })
    }

    const errors: Array<{ row: number; error: string }> = []
    let success = 0

    // Process in batches of 10
    const batchSize = 10
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      const batchPromises = batch.map(async (row, batchIndex) => {
        const rowIndex = i + batchIndex + 2 // +2 for header and 1-based index

        // Validate required fields
        if (!row.nomeExibicao) {
          errors.push({ row: rowIndex, error: 'Nome de exibição é obrigatório' })
          return
        }
        if (!row.tipoPessoa || !['Fisica', 'Juridica'].includes(row.tipoPessoa)) {
          errors.push({ row: rowIndex, error: 'tipoPessoa deve ser "Fisica" ou "Juridica"' })
          return
        }
        if (!row.telefonePrincipal) {
          errors.push({ row: rowIndex, error: 'Telefone principal é obrigatório' })
          return
        }

        // Auto-generate identificador if not provided
        let identificador = row.identificador
        if (!identificador || identificador.trim() === '') {
          identificador = await generateUniqueIdentifier('C', 'cliente')
        } else {
          // Check for duplicate identificador only if manually provided
          const existing = await db.cliente.findFirst({
            where: { identificador: row.identificador, deletedAt: null },
          })
          if (existing) {
            errors.push({ row: rowIndex, error: `Identificador "${row.identificador}" já existe` })
            return
          }
        }

        // Auto-fill address from ViaCEP if only CEP is provided
        let addressData: Record<string, string> = {
          logradouro: row.logradouro,
          bairro: row.bairro,
          cidade: row.cidade,
          estado: row.estado,
          complemento: row.complemento,
        }

        if (row.cep && !row.logradouro && !row.cidade) {
          const viaCepData = await fetchViaCEP(row.cep)
          if (viaCepData) {
            addressData = { ...addressData, ...viaCepData }
          }
        }

        try {
          const cliente = await db.cliente.create({
            data: {
              identificador: identificador,
              nomeExibicao: row.nomeExibicao,
              nomeCompleto: row.nomeCompleto || null,
              tipoPessoa: row.tipoPessoa,
              telefonePrincipal: row.telefonePrincipal,
              email: row.email || null,
              cep: row.cep || '',
              logradouro: addressData.logradouro || '',
              numero: row.numero || '',
              complemento: addressData.complemento || null,
              bairro: addressData.bairro || '',
              cidade: addressData.cidade || '',
              estado: addressData.estado || '',
              status: 'Ativo',
            },
          })

          await registrarAuditoria({
            usuarioId: session.userId,
            acao: 'importar_cliente',
            entidade: 'cliente',
            entidadeId: cliente.id,
            entidadeNome: cliente.nomeExibicao,
            depois: { identificador: identificador, importado: true } as Record<string, unknown>,
            severidade: 'info',
          })

          success++
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erro ao criar cliente'
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
    console.error('Erro ao importar clientes:', error)
    return NextResponse.json({ error: 'Erro ao processar importação' }, { status: 500 })
  }
}
