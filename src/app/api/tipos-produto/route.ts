import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { z } from 'zod/v4'
import { registrarAuditoria } from '@/lib/auditoria'

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
    console.error('Erro ao buscar tipos de produto:', error)
    return NextResponse.json({ error: 'Erro ao buscar tipos de produto' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

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
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao criar tipo de produto' }, { status: 500 })
  }
}
