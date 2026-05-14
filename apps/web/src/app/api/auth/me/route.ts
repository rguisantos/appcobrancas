import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-jwt'
import { db } from '@/lib/db'
import { handleApiError } from '@/lib/api-utils'

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
        createdAt: true,
      },
    })

    if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    if (usuario.status !== 'Ativo') {
      return NextResponse.json({ error: 'Usuário inativo' }, { status: 403 })
    }

    return NextResponse.json({
      user: {
        ...usuario,
        permissoesWeb: (usuario.permissoesWeb as Record<string, boolean>) || {},
        permissoesMobile: (usuario.permissoesMobile as Record<string, boolean>) || {},
        rotasPermitidas: (usuario.rotasPermitidas as string[]) || [],
      },
    })
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar dados do usuário')
  }
}
