import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/hash'
import { signToken, AuthPayload } from '@/lib/auth-jwt'
import { registrarAuditoria } from '@/lib/auditoria'

/**
 * POST /api/auth/device-login
 * Authenticates a mobile device using deviceKey + senha.
 * Returns a Bearer token (not cookie-based) for mobile use.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deviceKey, senha } = body

    if (!deviceKey || !senha) {
      return NextResponse.json(
        { error: 'deviceKey e senha sao obrigatorios' },
        { status: 400 }
      )
    }

    const dispositivo = await db.dispositivo.findUnique({
      where: { deviceKey },
      include: { usuario: true },
    })

    if (!dispositivo) {
      return NextResponse.json({ error: 'Dispositivo nao encontrado' }, { status: 401 })
    }

    if (!dispositivo.ativo) {
      return NextResponse.json({ error: 'Dispositivo inativo' }, { status: 403 })
    }

    const senhaValida = await verifyPassword(senha, dispositivo.senha)
    if (!senhaValida) {
      await registrarAuditoria({
        acao: 'device_login_falha',
        entidade: 'dispositivo',
        entidadeId: dispositivo.id,
        entidadeNome: dispositivo.nome,
        ip: request.headers.get('x-forwarded-for') || undefined,
        severidade: 'seguranca',
        origem: 'mobile',
      })
      return NextResponse.json({ error: 'Credenciais invalidas' }, { status: 401 })
    }

    // Build auth payload from associated user or minimal device info
    const usuario = dispositivo.usuario
    let payload: AuthPayload

    if (usuario && usuario.status === 'Ativo' && !usuario.bloqueado) {
      const permissoesWeb = (usuario.permissoesWeb as Record<string, boolean>) || {}
      const rotasPermitidas = (usuario.rotasPermitidas as string[]) || []

      payload = {
        userId: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        tipoPermissao: usuario.tipoPermissao,
        permissoesWeb,
        rotasPermitidas,
      }
    } else if (usuario) {
      return NextResponse.json({ error: 'Usuario associado inativo ou bloqueado' }, { status: 403 })
    } else {
      // Device without user association - limited access
      const rotasPermitidas = (dispositivo.rotasPermitidas as string[]) || []
      payload = {
        userId: `device:${dispositivo.id}`,
        email: `device-${dispositivo.deviceKey}@local`,
        nome: dispositivo.nome,
        tipoPermissao: 'AcessoControlado',
        permissoesWeb: {},
        rotasPermitidas,
      }
    }

    const token = await signToken(payload)

    // Update last sync timestamp
    await db.dispositivo.update({
      where: { id: dispositivo.id },
      data: { ultimoSync: new Date() },
    })

    await registrarAuditoria({
      usuarioId: usuario?.id,
      acao: 'device_login',
      entidade: 'dispositivo',
      entidadeId: dispositivo.id,
      entidadeNome: dispositivo.nome,
      ip: request.headers.get('x-forwarded-for') || undefined,
      origem: 'mobile',
    })

    return NextResponse.json({
      token,
      expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
      device: {
        id: dispositivo.id,
        nome: dispositivo.nome,
        rotasPermitidas: (dispositivo.rotasPermitidas as string[]) || [],
      },
      user: usuario
        ? {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            tipoPermissao: usuario.tipoPermissao,
            permissoesMobile: (usuario.permissoesMobile as Record<string, boolean>) || {},
            rotasPermitidas: (usuario.rotasPermitidas as string[]) || [],
          }
        : null,
    })
  } catch (error) {
    console.error('Device login error:', error)
    return NextResponse.json({ error: 'Erro ao autenticar dispositivo' }, { status: 500 })
  }
}
