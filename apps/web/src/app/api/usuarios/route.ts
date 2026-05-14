import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { requireAdmin } from '@/lib/rbac'
import { usuarioSchema } from '@/lib/validations'
import { hashPassword } from '@/lib/hash'
import { registrarAuditoria } from '@/lib/auditoria'
import { safeLimit, safePage, handleApiError } from '@/lib/api-utils'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  const { authorized, response, session } = await requireAdmin()
  if (!authorized || !session) return response

  try {
  const searchParams = request.nextUrl.searchParams
  const page = safePage(searchParams.get('page'))
  const limit = safeLimit(searchParams.get('limit'))
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
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar usuários')
  }
}

export async function POST(request: NextRequest) {
  const { authorized, response, session } = await requireAdmin()
  if (!authorized || !session) return response

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
        permissoesWeb: data.permissoesWeb as unknown as Prisma.InputJsonValue,
        permissoesMobile: data.permissoesMobile as unknown as Prisma.InputJsonValue,
        rotasPermitidas: data.rotasPermitidas as unknown as Prisma.InputJsonValue,
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
    return handleApiError(error, 'Erro ao criar usuário')
  }
}
