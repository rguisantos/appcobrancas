import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { metaSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const { id } = await params
  const meta = await db.meta.findFirst({
    where: { id, deletedAt: null },
    include: { rota: true },
  })

  if (!meta) return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 })
  return NextResponse.json(meta)
  } catch (error) {
    console.error('Erro ao buscar meta:', error)
    return NextResponse.json({ error: 'Erro ao buscar meta' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const existing = await db.meta.findFirst({ where: { id, deletedAt: null } })
  if (!existing) return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 })

  try {
    const body = await request.json()
    const data = metaSchema.parse(body)
    const antes = existing as Record<string, unknown>

    const meta = await db.meta.update({
      where: { id },
      data: {
        nome: data.nome,
        tipo: data.tipo,
        valorMeta: data.valorMeta,
        dataInicio: new Date(data.dataInicio),
        dataFim: new Date(data.dataFim),
        rotaId: data.rotaId,
      },
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'atualizar_meta',
      entidade: 'meta',
      entidadeId: meta.id,
      entidadeNome: meta.nome,
      antes,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    return NextResponse.json(meta)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar meta' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const { id } = await params
  const existing = await db.meta.findFirst({ where: { id, deletedAt: null } })
  if (!existing) return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 })

  const meta = await db.meta.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: 'excluir_meta',
    entidade: 'meta',
    entidadeId: id,
    entidadeNome: existing.nome,
    antes: existing as Record<string, unknown>,
    severidade: 'aviso',
  })

  return NextResponse.json({ message: 'Meta excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir meta:', error)
    return NextResponse.json({ error: 'Erro ao excluir meta' }, { status: 500 })
  }
}
