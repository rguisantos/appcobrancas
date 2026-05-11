import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { rotaSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const rota = await db.rota.findFirst({
    where: { id, deletedAt: null },
    include: { clientes: { where: { deletedAt: null }, orderBy: { nomeExibicao: 'asc' } } },
  })

  if (!rota) return NextResponse.json({ error: 'Rota não encontrada' }, { status: 404 })
  return NextResponse.json(rota)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

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

    return NextResponse.json(rota)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar rota' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

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

  return NextResponse.json({ message: 'Rota excluída com sucesso' })
}
