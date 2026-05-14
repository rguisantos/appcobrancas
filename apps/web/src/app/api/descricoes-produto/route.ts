import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { requireMutationRole, requireAdmin } from '@/lib/rbac'
import { z } from 'zod/v4'
import { registrarAuditoria } from '@/lib/auditoria'
import { handleApiError } from '@/lib/api-utils'

const descricaoProdutoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
})

export async function GET() {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const data = await db.descricaoProduto.findMany({
    orderBy: { nome: 'asc' },
  })

  return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar descrições de produto')
  }
}

export async function POST(request: NextRequest) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  try {
    const body = await request.json()
    const data = descricaoProdutoSchema.parse(body)
    const descricao = await db.descricaoProduto.create({ data })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'criar_descricao_produto',
      entidade: 'descricao_produto',
      entidadeId: descricao.id,
      entidadeNome: descricao.nome,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    return NextResponse.json(descricao, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, 'Erro ao criar descrição de produto')
  }
}
