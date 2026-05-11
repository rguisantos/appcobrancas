import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { usuarioSchema } from '@/lib/validations'
import { hashPassword } from '@/lib/hash'
import { registrarAuditoria } from '@/lib/auditoria'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  if (session.tipoPermissao !== 'Administrador') {
    return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit

  const where = { deletedAt: null }

  const [data, total] = await Promise.all([
    db.usuario.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        nome: true,
        email: true,
        cpf: true,
        telefone: true,
        tipoPermissao: true,
        permissoesWeb: true,
        permissoesMobile: true,
        rotasPermitidas: true,
        status: true,
        bloqueado: true,
        dataUltimoAcesso: true,
        ultimoAcessoDispositivo: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { nome: 'asc' },
    }),
    db.usuario.count({ where }),
  ])

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  if (session.tipoPermissao !== 'Administrador') {
    return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = usuarioSchema.parse(body)

    if (!data.senha) {
      return NextResponse.json({ error: 'Senha é obrigatória para novos usuários' }, { status: 400 })
    }

    const senhaHash = await hashPassword(data.senha)

    const usuario = await db.usuario.create({
      data: {
        nome: data.nome,
        email: data.email,
        senha: senhaHash,
        cpf: data.cpf,
        telefone: data.telefone,
        tipoPermissao: data.tipoPermissao,
        permissoesWeb: data.permissoesWeb,
        permissoesMobile: data.permissoesMobile,
        rotasPermitidas: data.rotasPermitidas,
        status: data.status,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        cpf: true,
        telefone: true,
        tipoPermissao: true,
        permissoesWeb: true,
        permissoesMobile: true,
        rotasPermitidas: true,
        status: true,
        bloqueado: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'criar_usuario',
      entidade: 'usuario',
      entidadeId: usuario.id,
      entidadeNome: usuario.nome,
      depois: { ...data, senha: '[REDACTED]' } as Record<string, unknown>,
      severidade: 'seguranca',
    })

    return NextResponse.json(usuario, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
  }
}
