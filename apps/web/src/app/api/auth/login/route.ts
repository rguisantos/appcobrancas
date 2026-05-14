import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/hash'
import { signToken, AuthPayload } from '@/lib/auth-jwt'
import { loginSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit'
import { hashToken } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = loginSchema.parse(body)

    // Rate limit by email + IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitId = `${data.email}:${ip}`
    const rateLimitResult = checkRateLimit(rateLimitId)
    if (!rateLimitResult.allowed) {
      const retryAfterSeconds = Math.ceil((rateLimitResult.resetAtMs - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Muitas tentativas de login. Tente novamente mais tarde.', retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      )
    }

    const usuario = await db.usuario.findUnique({
      where: { email: data.email },
    })

    if (!usuario || usuario.deletedAt) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    if (usuario.status !== 'Ativo' || usuario.bloqueado) {
      return NextResponse.json({ error: 'Usuário inativo ou bloqueado' }, { status: 403 })
    }

    const senhaValida = await verifyPassword(data.senha, usuario.senha)
    if (!senhaValida) {
      await registrarAuditoria({
        acao: 'login_falha',
        entidade: 'usuario',
        entidadeId: usuario.id,
        entidadeNome: usuario.email,
        ip: request.headers.get('x-forwarded-for') || undefined,
        severidade: 'seguranca',
      })
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const permissoesWeb = (usuario.permissoesWeb as Record<string, boolean>) || {}
    const rotasPermitidas = (usuario.rotasPermitidas as string[]) || []

    const payload: AuthPayload = {
      userId: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      tipoPermissao: usuario.tipoPermissao,
      permissoesWeb,
      rotasPermitidas,
    }

    const token = await signToken(payload)

    // Wrap update + session creation in transaction for atomicity
    await db.$transaction([
      db.usuario.update({
        where: { id: usuario.id },
        data: {
          dataUltimoAcesso: new Date(),
          ultimoAcessoDispositivo: 'Web',
        },
      }),
      db.sessao.create({
        data: {
          usuarioId: usuario.id,
          token: hashToken(token),
          dispositivo: 'Web',
          ip: request.headers.get('x-forwarded-for') || null,
          expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ])

    // Reset rate limit on successful login
    resetRateLimit(rateLimitId)

    await registrarAuditoria({
      usuarioId: usuario.id,
      acao: 'login',
      entidade: 'usuario',
      entidadeId: usuario.id,
      entidadeNome: usuario.nome,
      ip: request.headers.get('x-forwarded-for') || undefined,
    })

    const response = NextResponse.json({
      user: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipoPermissao: usuario.tipoPermissao,
        permissoesWeb,
        rotasPermitidas,
      },
      token,
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.SECURE_COOKIES === 'true' || process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Erro ao fazer login' }, { status: 500 })
  }
}
