import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { clienteSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'
import { generateUniqueIdentifier } from '@/lib/auto-identifier'
import { writeSyncLog } from '@/lib/sync-log'
import { handleApiError, safeLimit, safePage } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const searchParams = request.nextUrl.searchParams
  const page = safePage(searchParams.get('page'))
  const limit = safeLimit(searchParams.get('limit'))
  const skip = (page - 1) * limit
  const search = searchParams.get('search') || ''
  const rotaId = searchParams.get('rotaId') || ''

  const where: Record<string, unknown> = {
    deletedAt: null,
  }

  if (search) {
    where.OR = [
      { nomeExibicao: { contains: search, mode: 'insensitive' } },
      { identificador: { contains: search, mode: 'insensitive' } },
      { telefonePrincipal: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (rotaId) {
    where.rotaId = rotaId
  }

  const [data, total] = await Promise.all([
    db.cliente.findMany({
      where,
      skip,
      take: limit,
      include: { rota: true },
      orderBy: { nomeExibicao: 'asc' },
    }),
    db.cliente.count({ where }),
  ])

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await request.json()
    const data = clienteSchema.parse(body)

    // Auto-generate identificador if not provided
    const identificador = data.identificador?.trim()
      || await generateUniqueIdentifier('C', 'cliente')

    const cliente = await db.cliente.create({
      data: { ...data, identificador }
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'criar_cliente',
      entidade: 'cliente',
      entidadeId: cliente.id,
      entidadeNome: cliente.nomeExibicao,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    await writeSyncLog('cliente', cliente.id, 'create', cliente as unknown as Record<string, unknown>, new Date())

    return NextResponse.json(cliente, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, 'Erro ao criar cliente')
  }
}
