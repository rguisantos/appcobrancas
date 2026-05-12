import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { usuarioSchema } from '@/lib/validations'
import { hashPassword } from '@/lib/hash'
import { registrarAuditoria } from '@/lib/auditoria'

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
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const { id } = await params
  const usuario = await db.usuario.findFirst({
    where: { id, deletedAt: null },
    select: USUARIO_SELECT,
  })

  if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  return NextResponse.json(usuario)
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return NextResponse.json({ error: 'Erro ao buscar usuário' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  if (session.tipoPermissao !== 'Administrador') {
    return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
  }

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

    // Se senha foi fornecida e não está vazia, hash e atualize
    if (data.senha && data.senha.trim() !== '') {
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
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  if (session.tipoPermissao !== 'Administrador') {
    return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  try {
  const { id } = await params
  const existing = await db.usuario.findFirst({ where: { id, deletedAt: null } })
  if (!existing) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

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
    console.error('Erro ao excluir usuário:', error)
    return NextResponse.json({ error: 'Erro ao excluir usuário' }, { status: 500 })
  }
}
