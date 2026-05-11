import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { manutencaoSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit
  const produtoId = searchParams.get('produtoId') || ''
  const status = searchParams.get('status') || ''

  const where: Record<string, unknown> = {}

  if (produtoId) where.produtoId = produtoId
  if (status) where.status = status

  const [data, total] = await Promise.all([
    db.manutencao.findMany({
      where,
      skip,
      take: limit,
      include: { produto: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.manutencao.count({ where }),
  ])

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await request.json()
    const data = manutencaoSchema.parse(body)

    // Buscar identificador do produto
    const produto = await db.produto.findFirst({ where: { id: data.produtoId } })
    if (!produto) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 400 })

    const manutencao = await db.manutencao.create({
      data: {
        produtoId: data.produtoId,
        produtoIdentificador: produto.identificador,
        tipo: data.tipo,
        descricao: data.descricao,
        dataInicio: data.dataInicio,
        dataFim: data.dataFim,
        custo: data.custo,
        status: data.status,
        observacao: data.observacao,
        usuarioId: session.userId,
        usuarioNome: session.nome,
      },
    })

    // Se manutenção em andamento, atualizar status do produto
    if (data.status === 'EmAndamento') {
      await db.produto.update({
        where: { id: data.produtoId },
        data: { statusProduto: 'Manutenção' },
      })
    }

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'criar_manutencao',
      entidade: 'manutencao',
      entidadeId: manutencao.id,
      entidadeNome: `${produto.identificador} - ${data.tipo}`,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    return NextResponse.json(manutencao, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao criar manutenção' }, { status: 500 })
  }
}
