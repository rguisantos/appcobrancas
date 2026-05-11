import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { produtoSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const produto = await db.produto.findFirst({
    where: { id, deletedAt: null },
    include: { tipo: true, descricao: true, tamanho: true, locacoes: { where: { deletedAt: null } }, manutencoes: { where: { status: 'EmAndamento' } } },
  })

  if (!produto) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
  return NextResponse.json(produto)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

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

    return NextResponse.json(produto)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

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

  return NextResponse.json({ message: 'Produto excluído com sucesso' })
}
