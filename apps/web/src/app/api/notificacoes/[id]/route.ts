import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { registrarAuditoria } from '@/lib/auditoria'
import { handleApiError } from '@/lib/api-utils'

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const existing = await db.notificacao.findFirst({
    where: { id, usuarioId: session.userId },
  })

  if (!existing) return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 })

  try {
  const notificacao = await db.notificacao.update({
    where: { id },
    data: { lida: true },
  })

  return NextResponse.json(notificacao)
  } catch (error) {
    return handleApiError(error, 'Erro ao atualizar notificação')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const existing = await db.notificacao.findFirst({
    where: { id, usuarioId: session.userId },
  })

  if (!existing) return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 })

  try {
  await db.notificacao.delete({ where: { id } })

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: 'excluir_notificacao',
    entidade: 'notificacao',
    entidadeId: id,
    entidadeNome: existing.titulo,
    severidade: 'info',
  })

  return NextResponse.json({ message: 'Notificação excluída com sucesso' })
  } catch (error) {
    return handleApiError(error, 'Erro ao excluir notificação')
  }
}
