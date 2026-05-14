import { NextRequest, NextResponse } from 'next/server'
import { requireMutationRole } from '@/lib/rbac'
import { handleApiError } from '@/lib/api-utils'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { toNumber } from '@/lib/decimal'

export async function GET(request: NextRequest) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  try {
  const searchParams = request.nextUrl.searchParams
  const dataInicio = searchParams.get('dataInicio')
  const dataFim = searchParams.get('dataFim')

  const where: Record<string, unknown> = { deletedAt: null }

  if (dataInicio && dataFim) {
    where.dataPagamento = { gte: dataInicio, lte: dataFim }
  }

  const cobrancas = await db.cobranca.findMany({ where })

  const totalRecebido = cobrancas.filter(c => c.status === 'Pago' || c.status === 'Parcial')
    .reduce((sum, c) => sum + toNumber(c.valorRecebido), 0)
  const totalPendente = cobrancas.filter(c => c.status === 'Pendente')
    .reduce((sum, c) => sum + toNumber(c.totalClientePaga), 0)
  const totalAtrasado = cobrancas.filter(c => c.status === 'Atrasado')
    .reduce((sum, c) => sum + toNumber(c.totalClientePaga), 0)

  // Monthly breakdown
  const monthlyData: Record<string, { receita: number; pendente: number }> = {}
  cobrancas.forEach(c => {
    const month = c.dataInicio ? format(new Date(c.dataInicio), 'yyyy-MM') : 'unknown'
    if (!monthlyData[month]) monthlyData[month] = { receita: 0, pendente: 0 }
    if (c.status === 'Pago' || c.status === 'Parcial') {
      monthlyData[month].receita += toNumber(c.valorRecebido)
    } else {
      monthlyData[month].pendente += toNumber(c.totalClientePaga)
    }
  })

  const meses = Object.entries(monthlyData).map(([month, data]) => ({
    mes: month,
    ...data,
    total: data.receita + data.pendente,
  })).sort((a, b) => a.mes.localeCompare(b.mes))

  return NextResponse.json({
    totalRecebido,
    totalPendente,
    totalAtrasado,
    totalGeral: totalRecebido + totalPendente + totalAtrasado,
    meses,
    cobrancas: cobrancas.slice(0, 100),
  })
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar relatório financeiro')
  }
}
