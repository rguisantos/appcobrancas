import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { clienteSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit
  const search = searchParams.get('search') || ''
  const rotaId = searchParams.get('rotaId') || ''

  const where: Record<string, unknown> = {
    deletedAt: null,
  }

  if (search) {
    where.OR = [
      { nomeExibicao: { contains: search } },
      { identificador: { contains: search } },
      { telefonePrincipal: { contains: search } },
      { email: { contains: search } },
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
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await request.json()
    const data = clienteSchema.parse(body)
    const cliente = await db.cliente.create({ data })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'criar_cliente',
      entidade: 'cliente',
      entidadeId: cliente.id,
      entidadeNome: cliente.nomeExibicao,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    return NextResponse.json(cliente, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 })
  }
}
