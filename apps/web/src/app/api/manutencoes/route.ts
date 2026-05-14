import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { requireMutationRole, requireAdmin } from '@/lib/rbac'
import { manutencaoSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'
import { handleApiError, safeLimit, safePage } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const searchParams = request.nextUrl.searchParams
  const page = safePage(searchParams.get('page'))
  const limit = safeLimit(searchParams.get('limit'))
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
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar manutenções')
  }
}

export async function POST(request: NextRequest) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  try {
    const body = await request.json()
    const data = manutencaoSchema.parse(body)

    // Buscar identificador do produto
    const produto = await db.produto.findFirst({ where: { id: data.produtoId } })
    if (!produto) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 400 })

    // Wrap create + produto status update in transaction for atomicity
    const manutencao = await db.$transaction(async (tx) => {
      const created = await tx.manutencao.create({
        data: {
          produtoId: data.produtoId,
          produtoIdentificador: produto.identificador,
          tipo: data.tipo,
          descricao: data.descricao,
          dataInicio: new Date(data.dataInicio),
          dataFim: data.dataFim ? new Date(data.dataFim) : undefined,
          custo: data.custo,
          status: data.status,
          observacao: data.observacao,
          usuarioId: session.userId,
          usuarioNome: session.nome,
        },
      })

      // Se manutenção em andamento, atualizar status do produto
      if (data.status === 'EmAndamento') {
        await tx.produto.update({
          where: { id: data.produtoId },
          data: { statusProduto: 'Manutenção' },
        })
      }

      return created
    })

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
    return handleApiError(error, 'Erro ao criar manutenção')
  }
}
