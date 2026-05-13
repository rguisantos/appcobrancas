import { NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-jwt'
import { db } from '@/lib/db'
import { hashToken } from '@/lib/session'
import { registrarAuditoria } from '@/lib/auditoria'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const session = await getAuthSession()

    if (session) {
      // Only delete the current session (not all sessions across all devices)
      const cookieStore = await cookies()
      const rawToken = cookieStore.get('auth-token')?.value
      if (rawToken) {
        const tokenHash = hashToken(rawToken)
        await db.sessao.deleteMany({ where: { token: tokenHash } })
      } else {
        // Fallback: delete all sessions for this user if no token found in cookie
        await db.sessao.deleteMany({ where: { usuarioId: session.userId } })
      }
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
