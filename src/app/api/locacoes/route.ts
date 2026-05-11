import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { locacaoSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit
  const status = searchParams.get('status') || ''
  const clienteId = searchParams.get('clienteId') || ''
  const produtoId = searchParams.get('produtoId') || ''

  const where: Record<string, unknown> = {
    deletedAt: null,
  }

  if (status) where.status = status
  if (clienteId) where.clienteId = clienteId
  if (produtoId) where.produtoId = produtoId

  const [data, total] = await Promise.all([
    db.locacao.findMany({
      where,
      skip,
      take: limit,
      include: { cliente: true, produto: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.locacao.count({ where }),
  ])

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await request.json()
    const data = locacaoSchema.parse(body)

    // Buscar dados do cliente e produto para popular campos denormalizados
    const [cliente, produto] = await Promise.all([
      db.cliente.findFirst({ where: { id: data.clienteId, deletedAt: null } }),
      db.produto.findFirst({ where: { id: data.produtoId, deletedAt: null } }),
    ])

    if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 400 })
    if (!produto) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 400 })

    const locacao = await db.locacao.create({
      data: {
        clienteId: data.clienteId,
        clienteNome: cliente.nomeExibicao,
        produtoId: data.produtoId,
        produtoIdentificador: produto.identificador,
        produtoTipo: produto.tipoNome,
        dataLocacao: data.dataLocacao,
        dataFim: data.dataFim,
        formaPagamento: data.formaPagamento,
        numeroRelogio: data.numeroRelogio,
        precoFicha: data.precoFicha,
        percentualEmpresa: data.percentualEmpresa,
        percentualCliente: data.percentualCliente,
        valorFixo: data.valorFixo,
        periodicidade: data.periodicidade,
        dataPrimeiraCobranca: data.dataPrimeiraCobranca,
        observacoes: data.observacoes,
        trocaPano: data.trocaPano,
      },
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'criar_locacao',
      entidade: 'locacao',
      entidadeId: locacao.id,
      entidadeNome: `${cliente.nomeExibicao} - ${produto.identificador}`,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    return NextResponse.json(locacao, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao criar locação' }, { status: 500 })
  }
}
