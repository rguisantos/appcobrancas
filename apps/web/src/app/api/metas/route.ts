import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { metaSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'

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
    console.error('Erro ao buscar metas:', error)
    return NextResponse.json({ error: 'Erro ao buscar metas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

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
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao criar meta' }, { status: 500 })
  }
}
