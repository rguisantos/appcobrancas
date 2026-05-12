import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { produtoSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit
  const busca = searchParams.get('busca') || ''
  const tipoId = searchParams.get('tipoId') || ''
  const status = searchParams.get('status') || ''
  const disponiveis = searchParams.get('disponiveis') === 'true'

  const where: Record<string, unknown> = {
    deletedAt: null,
  }

  if (busca) {
    where.OR = [
      { identificador: { contains: busca, mode: 'insensitive' } },
      { tipoNome: { contains: busca, mode: 'insensitive' } },
      { descricaoNome: { contains: busca, mode: 'insensitive' } },
    ]
  }
  if (tipoId) where.tipoId = tipoId
  if (status) where.statusProduto = status

  if (disponiveis) {
    where.statusProduto = 'Ativo'
    where.locacoes = {
      none: { deletedAt: null, status: 'Ativa' },
    }
  }

  const [data, total] = await Promise.all([
    db.produto.findMany({
      where,
      skip,
      take: limit,
      include: { tipo: true, descricao: true, tamanho: true, locacoes: { where: { deletedAt: null, status: 'Ativa' } } },
      orderBy: { identificador: 'asc' },
    }),
    db.produto.count({ where }),
  ])

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Erro ao buscar produtos:', error)
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await request.json()
    const data = produtoSchema.parse(body)
    const produto = await db.produto.create({ data })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'criar_produto',
      entidade: 'produto',
      entidadeId: produto.id,
      entidadeNome: produto.identificador,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    return NextResponse.json(produto, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 })
  }
}
