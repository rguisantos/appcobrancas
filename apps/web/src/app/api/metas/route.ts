import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { requireMutationRole } from '@/lib/rbac'
import { metaSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'
import { handleApiError } from '@/lib/api-utils'

export async function GET() {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const data = await db.meta.findMany({
    where: {},
    include: { rota: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar metas')
  }
}

export async function POST(request: NextRequest) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  try {
    const body = await request.json()
    const data = metaSchema.parse(body)
    const meta = await db.meta.create({
      data: {
        nome: data.nome,
        tipo: data.tipo,
        valorMeta: data.valorMeta,
        dataInicio: new Date(data.dataInicio),
        dataFim: new Date(data.dataFim),
        rotaId: data.rotaId,
        criadoPor: session.userId,
      },
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'criar_meta',
      entidade: 'meta',
      entidadeId: meta.id,
      entidadeNome: meta.nome,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    return NextResponse.json(meta, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, 'Erro ao criar meta')
  }
}
