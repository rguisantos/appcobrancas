import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { requireAdmin } from '@/lib/rbac'
import { usuarioSchema } from '@/lib/validations'
import { hashPassword, verifyPassword } from '@/lib/hash'
import { registrarAuditoria } from '@/lib/auditoria'
import { handleApiError } from '@/lib/api-utils'

const USUARIO_SELECT = {
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
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireAdmin()
  if (!authorized || !session) return response

  try {
  const { id } = await params
  const usuario = await db.usuario.findFirst({
    where: { id, deletedAt: null },
    select: USUARIO_SELECT,
  })

  if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  return NextResponse.json(usuario)
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar usuário')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireAdmin()
  if (!authorized || !session) return response

  const { id } = await params
  const existing = await db.usuario.findFirst({ where: { id, deletedAt: null } })
  if (!existing) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  try {
    const body = await request.json()
    const data = usuarioSchema.parse(body)
    const antes = { ...existing, senha: '[REDACTED]' } as Record<string, unknown>

    // Preparar dados para atualização
    const updateData: Record<string, unknown> = {
      nome: data.nome,
      email: data.email,
      cpf: data.cpf,
      telefone: data.telefone,
      tipoPermissao: data.tipoPermissao,
      permissoesWeb: data.permissoesWeb,
      permissoesMobile: data.permissoesMobile,
      rotasPermitidas: data.rotasPermitidas,
      status: data.status,
      version: { increment: 1 },
    }

    // Se senha foi fornecida e não está vazia, verificar senha atual e hash a nova
    if (data.senha && data.senha.trim() !== '') {
      // If changing own password, require current password verification
      const isSelfUpdate = id === session.userId
      const senhaAtual = (body as Record<string, unknown>).senhaAtual as string | undefined

      if (isSelfUpdate && !senhaAtual) {
        return NextResponse.json(
          { error: 'Senha atual é obrigatória para alterar sua própria senha' },
          { status: 400 }
        )
      }

      if (senhaAtual) {
        const isValid = await verifyPassword(senhaAtual, existing.senha)
        if (!isValid) {
          return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })
        }
      }
      updateData.senha = await hashPassword(data.senha)
    }

    const usuario = await db.usuario.update({
      where: { id },
      data: updateData,
      select: USUARIO_SELECT,
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'atualizar_usuario',
      entidade: 'usuario',
      entidadeId: usuario.id,
      entidadeNome: usuario.nome,
      antes,
      depois: { ...data, senha: data.senha ? '[REDACTED]' : undefined } as Record<string, unknown>,
      severidade: 'seguranca',
    })

    return NextResponse.json(usuario)
  } catch (error: unknown) {
    return handleApiError(error, 'Erro ao atualizar usuário')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireAdmin()
  if (!authorized || !session) return response

  try {
  const { id } = await params
  const existing = await db.usuario.findFirst({ where: { id, deletedAt: null } })
  if (!existing) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  if (id === session.userId) {
    return NextResponse.json({ error: 'Não é possível excluir seu próprio usuário' }, { status: 400 })
  }

  const usuario = await db.usuario.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: USUARIO_SELECT,
  })

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: 'excluir_usuario',
    entidade: 'usuario',
    entidadeId: id,
    entidadeNome: existing.nome,
    antes: { ...existing, senha: '[REDACTED]' } as Record<string, unknown>,
    severidade: 'seguranca',
  })

  return NextResponse.json({ message: 'Usuário excluído com sucesso' })
  } catch (error) {
    return handleApiError(error, 'Erro ao excluir usuário')
  }
}
