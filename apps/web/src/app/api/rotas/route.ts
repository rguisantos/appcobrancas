import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { requireMutationRole } from '@/lib/rbac'
import { rotaSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status') || ''

  const where: Record<string, unknown> = {
    deletedAt: null,
  }

  if (status) where.status = status

  const data = await db.rota.findMany({
    where,
    include: { _count: { select: { clientes: { where: { deletedAt: null } } } } },
    orderBy: { ordem: 'asc' },
  })

  return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao buscar rotas:', error)
    return NextResponse.json({ error: 'Erro ao buscar rotas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  try {
    const body = await request.json()
    const data = rotaSchema.parse(body)
    const rota = await db.rota.create({ data })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'criar_rota',
      entidade: 'rota',
      entidadeId: rota.id,
      entidadeNome: rota.descricao,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    return NextResponse.json(rota, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao criar rota' }, { status: 500 })
  }
}
