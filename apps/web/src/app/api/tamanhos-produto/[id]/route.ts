import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { requireMutationRole, requireAdmin } from '@/lib/rbac'
import { z } from 'zod/v4'
import { registrarAuditoria } from '@/lib/auditoria'
import { handleApiError } from '@/lib/api-utils'

const tamanhoProdutoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  const { id } = await params
  const existing = await db.tamanhoProduto.findFirst({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Tamanho de produto não encontrado' }, { status: 404 })

  try {
    const body = await request.json()
    const data = tamanhoProdutoSchema.parse(body)
    const antes = existing as Record<string, unknown>

    const tamanho = await db.tamanhoProduto.update({
      where: { id },
      data,
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'atualizar_tamanho_produto',
      entidade: 'tamanho_produto',
      entidadeId: tamanho.id,
      entidadeNome: tamanho.nome,
      antes,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    return NextResponse.json(tamanho)
  } catch (error: unknown) {
    return handleApiError(error, 'Erro ao atualizar tamanho de produto')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireAdmin()
  if (!authorized || !session) return response

  const { id } = await params
  const existing = await db.tamanhoProduto.findFirst({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Tamanho de produto não encontrado' }, { status: 404 })

  const produtosCount = await db.produto.count({ where: { tamanhoId: id } })
  if (produtosCount > 0) {
    return NextResponse.json({ error: 'Não é possível excluir: existem produtos vinculados a este tamanho' }, { status: 400 })
  }

  await db.tamanhoProduto.delete({ where: { id } })

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: 'excluir_tamanho_produto',
    entidade: 'tamanho_produto',
    entidadeId: id,
    entidadeNome: existing.nome,
    antes: existing as Record<string, unknown>,
    severidade: 'aviso',
  })

  return NextResponse.json({ message: 'Tamanho de produto excluído com sucesso' })
}
