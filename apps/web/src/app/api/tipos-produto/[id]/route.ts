import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { requireMutationRole, requireAdmin } from '@/lib/rbac'
import { z } from 'zod/v4'
import { registrarAuditoria } from '@/lib/auditoria'
import { handleApiError } from '@/lib/api-utils'

const tipoProdutoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  const { id } = await params
  const existing = await db.tipoProduto.findFirst({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Tipo de produto não encontrado' }, { status: 404 })

  try {
    const body = await request.json()
    const data = tipoProdutoSchema.parse(body)
    const antes = existing as Record<string, unknown>

    const tipo = await db.tipoProduto.update({
      where: { id },
      data,
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'atualizar_tipo_produto',
      entidade: 'tipo_produto',
      entidadeId: tipo.id,
      entidadeNome: tipo.nome,
      antes,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    return NextResponse.json(tipo)
  } catch (error: unknown) {
    return handleApiError(error, 'Erro ao atualizar tipo de produto')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireAdmin()
  if (!authorized || !session) return response

  const { id } = await params
  const existing = await db.tipoProduto.findFirst({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Tipo de produto não encontrado' }, { status: 404 })

  // Verificar se há produtos usando este tipo
  const produtosCount = await db.produto.count({ where: { tipoId: id } })
  if (produtosCount > 0) {
    return NextResponse.json({ error: 'Não é possível excluir: existem produtos vinculados a este tipo' }, { status: 400 })
  }

  await db.tipoProduto.delete({ where: { id } })

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: 'excluir_tipo_produto',
    entidade: 'tipo_produto',
    entidadeId: id,
    entidadeNome: existing.nome,
    antes: existing as Record<string, unknown>,
    severidade: 'aviso',
  })

  return NextResponse.json({ message: 'Tipo de produto excluído com sucesso' })
}
