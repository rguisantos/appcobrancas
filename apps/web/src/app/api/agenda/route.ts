import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { handleApiError } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const searchParams = request.nextUrl.searchParams
  const dataInicio = searchParams.get('dataInicio') || ''
  const dataFim = searchParams.get('dataFim') || ''

  if (!dataInicio || !dataFim) {
    return NextResponse.json({ error: 'Parâmetros dataInicio e dataFim são obrigatórios' }, { status: 400 })
  }

  const cobrancas = await db.cobranca.findMany({
    where: {
      deletedAt: null,
      dataVencimento: { gte: dataInicio, lte: dataFim },
    },
    include: {
      cliente: { select: { id: true, nomeExibicao: true, telefonePrincipal: true, rotaId: true } },
      locacao: { select: { id: true, formaPagamento: true, produtoTipo: true } },
    },
    orderBy: { dataVencimento: 'asc' },
  })

  return NextResponse.json(cobrancas)
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar agenda')
  }
}
