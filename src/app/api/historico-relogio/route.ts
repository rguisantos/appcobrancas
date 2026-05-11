import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { historicoRelogioSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const produtoId = searchParams.get('produtoId') || ''

  const where: Record<string, unknown> = {}
  if (produtoId) where.produtoId = produtoId

  const data = await db.historicoRelogio.findMany({
    where,
    include: { produto: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await request.json()
    const data = historicoRelogioSchema.parse(body)

    const historico = await db.historicoRelogio.create({
      data: {
        produtoId: data.produtoId,
        relogioAnterior: data.relogioAnterior,
        relogioNovo: data.relogioNovo,
        motivo: data.motivo,
        observacao: data.observacao,
        usuarioId: session.userId,
        usuarioNome: session.nome,
      },
    })

    // Atualizar número do relógio no produto
    await db.produto.update({
      where: { id: data.produtoId },
      data: { numeroRelogio: data.relogioNovo },
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'criar_historico_relogio',
      entidade: 'historico_relogio',
      entidadeId: historico.id,
      entidadeNome: `Produto: ${data.produtoId} - De ${data.relogioAnterior} para ${data.relogioNovo}`,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    return NextResponse.json(historico, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao criar histórico de relógio' }, { status: 500 })
  }
}
