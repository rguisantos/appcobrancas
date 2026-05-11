import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-jwt'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const usuario = await db.usuario.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        nome: true,
        email: true,
        tipoPermissao: true,
        permissoesWeb: true,
        permissoesMobile: true,
        rotasPermitidas: true,
        status: true,
        dataUltimoAcesso: true,
      },
    })

    if (!usuario || usuario.status !== 'Ativo') {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        ...usuario,
        permissoesWeb: JSON.parse(usuario.permissoesWeb || '{}'),
        permissoesMobile: JSON.parse(usuario.permissoesMobile || '{}'),
        rotasPermitidas: JSON.parse(usuario.rotasPermitidas || '[]'),
      },
    })
  } catch (error) {
    console.error('Me error:', error)
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }
}
