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

export async function GET() {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const data = await db.tipoProduto.findMany({
    orderBy: { nome: 'asc' },
  })

  return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar tipos de produto')
  }
}

export async function POST(request: NextRequest) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  try {
    const body = await request.json()
    const data = tipoProdutoSchema.parse(body)
    const tipo = await db.tipoProduto.create({ data })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'criar_tipo_produto',
      entidade: 'tipo_produto',
      entidadeId: tipo.id,
      entidadeNome: tipo.nome,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    return NextResponse.json(tipo, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, 'Erro ao criar tipo de produto')
  }
}
