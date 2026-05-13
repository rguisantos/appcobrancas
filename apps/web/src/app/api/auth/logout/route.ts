import { NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-jwt'
import { db } from '@/lib/db'
import { registrarAuditoria } from '@/lib/auditoria'

export async function POST() {
  try {
    const session = await getAuthSession()

    if (session) {
      // Delete all sessions for this user (effective logout across all devices)
      await db.sessao.deleteMany({ where: { usuarioId: session.userId } })
      await registrarAuditoria({
        usuarioId: session.userId,
        acao: 'logout',
        entidade: 'usuario',
        entidadeId: session.userId,
        entidadeNome: session.nome,
      })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.SECURE_COOKIES === 'true' || process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Erro ao fazer logout' }, { status: 500 })
  }
}
