import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { safeLimit, safePage } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const searchParams = request.nextUrl.searchParams
  const lida = searchParams.get('lida')

  const where: Record<string, unknown> = {
    usuarioId: session.userId,
  }

  if (lida !== null) where.lida = lida === 'true'

  const limit = safeLimit(searchParams.get('limit'), 50)
  const page = safePage(searchParams.get('page'))
  const skip = (page - 1) * limit

  const [data, total] = await Promise.all([
    db.notificacao.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    }),
    db.notificacao.count({ where }),
  ])

  return NextResponse.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  } catch (error) {
    console.error('Erro ao buscar notificações:', error)
    return NextResponse.json({ error: 'Erro ao buscar notificações' }, { status: 500 })
  }
}
