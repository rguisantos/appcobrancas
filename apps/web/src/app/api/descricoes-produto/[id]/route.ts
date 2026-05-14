import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { requireMutationRole, requireAdmin } from '@/lib/rbac'
import { z } from 'zod/v4'
import { registrarAuditoria } from '@/lib/auditoria'

const descricaoProdutoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  const { id } = await params
  const existing = await db.descricaoProduto.findFirst({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Descrição de produto não encontrada' }, { status: 404 })

  try {
    const body = await request.json()
    const data = descricaoProdutoSchema.parse(body)
    const antes = existing as Record<string, unknown>

    const descricao = await db.descricaoProduto.update({
      where: { id },
      data,
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'atualizar_descricao_produto',
      entidade: 'descricao_produto',
      entidadeId: descricao.id,
      entidadeNome: descricao.nome,
      antes,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    return NextResponse.json(descricao)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar descrição de produto' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireAdmin()
  if (!authorized || !session) return response

  const { id } = await params
  const existing = await db.descricaoProduto.findFirst({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Descrição de produto não encontrada' }, { status: 404 })

  const produtosCount = await db.produto.count({ where: { descricaoId: id } })
  if (produtosCount > 0) {
    return NextResponse.json({ error: 'Não é possível excluir: existem produtos vinculados a esta descrição' }, { status: 400 })
  }

  await db.descricaoProduto.delete({ where: { id } })

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: 'excluir_descricao_produto',
    entidade: 'descricao_produto',
    entidadeId: id,
    entidadeNome: existing.nome,
    antes: existing as Record<string, unknown>,
    severidade: 'aviso',
  })

  return NextResponse.json({ message: 'Descrição de produto excluída com sucesso' })
}
