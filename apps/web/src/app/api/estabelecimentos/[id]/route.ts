import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { requireMutationRole, requireAdmin } from '@/lib/rbac'
import { z } from 'zod/v4'
import { registrarAuditoria } from '@/lib/auditoria'
import { handleApiError } from '@/lib/api-utils'

const estabelecimentoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  endereco: z.string().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  const { id } = await params
  const existing = await db.estabelecimento.findFirst({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Estabelecimento não encontrado' }, { status: 404 })

  try {
  const body = await request.json()
  const data = estabelecimentoSchema.parse(body)
  const antes = existing as Record<string, unknown>

  const estabelecimento = await db.estabelecimento.update({
    where: { id },
    data,
  })

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: 'atualizar_estabelecimento',
    entidade: 'estabelecimento',
    entidadeId: estabelecimento.id,
    entidadeNome: estabelecimento.nome,
    antes,
    depois: data as Record<string, unknown>,
    severidade: 'info',
  })

  return NextResponse.json(estabelecimento)
  } catch (error: unknown) {
    return handleApiError(error, 'Erro ao atualizar estabelecimento')
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
  const existing = await db.estabelecimento.findFirst({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Estabelecimento não encontrado' }, { status: 404 })

  await db.estabelecimento.delete({ where: { id } })

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: 'excluir_estabelecimento',
    entidade: 'estabelecimento',
    entidadeId: id,
    entidadeNome: existing.nome,
    antes: existing as Record<string, unknown>,
    severidade: 'aviso',
  })

  return NextResponse.json({ message: 'Estabelecimento excluído com sucesso' })
  } catch (error) {
    return handleApiError(error, 'Erro ao excluir estabelecimento')
  }
}
