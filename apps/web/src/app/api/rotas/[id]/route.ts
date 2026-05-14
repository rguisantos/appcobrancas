import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { requireMutationRole, requireAdmin } from '@/lib/rbac'
import { rotaSchema } from '@/lib/validations'
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
  const rota = await db.rota.findFirst({
    where: { id, deletedAt: null },
    include: { clientes: { where: { deletedAt: null }, orderBy: { nomeExibicao: 'asc' } } },
  })

  if (!rota) return NextResponse.json({ error: 'Rota não encontrada' }, { status: 404 })
  return NextResponse.json(rota)
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar rota')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  const { id } = await params
  const existing = await db.rota.findFirst({ where: { id, deletedAt: null } })
  if (!existing) return NextResponse.json({ error: 'Rota não encontrada' }, { status: 404 })

  try {
    const body = await request.json()
    const data = rotaSchema.parse(body)
    const antes = existing as Record<string, unknown>

    const rota = await db.rota.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'atualizar_rota',
      entidade: 'rota',
      entidadeId: rota.id,
      entidadeNome: rota.descricao,
      antes,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    await writeSyncLog('rota', rota.id, 'update', rota as unknown as Record<string, unknown>, new Date())

    return NextResponse.json(rota)
  } catch (error: unknown) {
    return handleApiError(error, 'Erro ao atualizar rota')
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
  const existing = await db.rota.findFirst({ where: { id, deletedAt: null } })
  if (!existing) return NextResponse.json({ error: 'Rota não encontrada' }, { status: 404 })

  const rota = await db.rota.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: 'excluir_rota',
    entidade: 'rota',
    entidadeId: rota.id,
    entidadeNome: rota.descricao,
    antes: existing as Record<string, unknown>,
    severidade: 'aviso',
  })

  await writeSyncLog('rota', rota.id, 'delete', null, new Date())

  return NextResponse.json({ message: 'Rota excluída com sucesso' })
  } catch (error) {
    return handleApiError(error, 'Erro ao excluir rota')
  }
}
