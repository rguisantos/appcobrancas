import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { z } from 'zod/v4'
import { registrarAuditoria } from '@/lib/auditoria'

const estabelecimentoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  endereco: z.string().optional(),
})

export async function GET() {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const data = await db.estabelecimento.findMany({
    orderBy: { nome: 'asc' },
  })

  return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao buscar estabelecimentos:', error)
    return NextResponse.json({ error: 'Erro ao buscar estabelecimentos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await request.json()
    const data = estabelecimentoSchema.parse(body)
    const estabelecimento = await db.estabelecimento.create({ data })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'criar_estabelecimento',
      entidade: 'estabelecimento',
      entidadeId: estabelecimento.id,
      entidadeNome: estabelecimento.nome,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    return NextResponse.json(estabelecimento, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao criar estabelecimento' }, { status: 500 })
  }
}
