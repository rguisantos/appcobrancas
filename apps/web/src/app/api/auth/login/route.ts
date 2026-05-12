import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/hash'
import { signToken, AuthPayload } from '@/lib/auth-jwt'
import { loginSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = loginSchema.parse(body)

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

    const permissoesWeb = JSON.parse(usuario.permissoesWeb || '{}')
    const rotasPermitidas = JSON.parse(usuario.rotasPermitidas || '[]')

    const payload: AuthPayload = {
      userId: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      tipoPermissao: usuario.tipoPermissao,
      permissoesWeb,
      rotasPermitidas,
    }

    const token = await signToken(payload)

    await db.usuario.update({
      where: { id: usuario.id },
      data: {
        dataUltimoAcesso: new Date().toISOString(),
        ultimoAcessoDispositivo: 'Web',
      },
    })

    await db.sessao.create({
      data: {
        usuarioId: usuario.id,
        token,
        dispositivo: 'Web',
        ip: request.headers.get('x-forwarded-for') || null,
        expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

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
      secure: process.env.SECURE_COOKIES === 'true',
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
