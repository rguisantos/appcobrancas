import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { requireMutationRole, requireAdmin } from '@/lib/rbac'
import { produtoSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'
import { writeSyncLog } from '@/lib/sync-log'
import { handleApiError } from '@/lib/api-utils'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const { id } = await params
  const produto = await db.produto.findFirst({
    where: { id, deletedAt: null },
    include: { tipo: true, descricao: true, tamanho: true, locacoes: { where: { deletedAt: null } }, manutencoes: { where: { status: 'EmAndamento' } } },
  })

  if (!produto) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
  return NextResponse.json(produto)
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar produto')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  const { id } = await params
  const existing = await db.produto.findFirst({ where: { id, deletedAt: null } })
  if (!existing) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })

  try {
    const body = await request.json()
    const data = produtoSchema.parse(body)
    const antes = existing as Record<string, unknown>

    const produto = await db.produto.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'atualizar_produto',
      entidade: 'produto',
      entidadeId: produto.id,
      entidadeNome: produto.identificador,
      antes,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    await writeSyncLog('produto', produto.id, 'update', produto as unknown as Record<string, unknown>, new Date())

    return NextResponse.json(produto)
  } catch (error: unknown) {
    return handleApiError(error, 'Erro ao atualizar produto')
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
  const existing = await db.produto.findFirst({ where: { id, deletedAt: null } })
  if (!existing) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })

  const produto = await db.produto.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: 'excluir_produto',
    entidade: 'produto',
    entidadeId: produto.id,
    entidadeNome: produto.identificador,
    antes: existing as Record<string, unknown>,
    severidade: 'aviso',
  })

  await writeSyncLog('produto', produto.id, 'delete', null, new Date())

  return NextResponse.json({ message: 'Produto excluído com sucesso' })
  } catch (error) {
    return handleApiError(error, 'Erro ao excluir produto')
  }
}
