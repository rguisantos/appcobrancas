import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const lida = searchParams.get('lida')

  const where: Record<string, unknown> = {
    usuarioId: session.userId,
  }

  if (lida !== null) where.lida = lida === 'true'

  const data = await db.notificacao.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(data)
}
