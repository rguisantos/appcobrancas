import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-jwt'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const dataInicio = searchParams.get('dataInicio')
  const dataFim = searchParams.get('dataFim')

  const where: any = { deletedAt: null }

  if (dataInicio && dataFim) {
    where.dataPagamento = { gte: dataInicio, lte: dataFim }
  }

  const cobrancas = await db.cobranca.findMany({ where })

  const totalRecebido = cobrancas.filter(c => c.status === 'Pago' || c.status === 'Parcial')
    .reduce((sum, c) => sum + c.valorRecebido, 0)
  const totalPendente = cobrancas.filter(c => c.status === 'Pendente')
    .reduce((sum, c) => sum + c.totalClientePaga, 0)
  const totalAtrasado = cobrancas.filter(c => c.status === 'Atrasado')
    .reduce((sum, c) => sum + c.totalClientePaga, 0)

  // Monthly breakdown
  const monthlyData: Record<string, { receita: number; pendente: number }> = {}
  cobrancas.forEach(c => {
    const month = c.dataInicio?.substring(0, 7) || 'unknown'
    if (!monthlyData[month]) monthlyData[month] = { receita: 0, pendente: 0 }
    if (c.status === 'Pago' || c.status === 'Parcial') {
      monthlyData[month].receita += c.valorRecebido
    } else {
      monthlyData[month].pendente += c.totalClientePaga
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
}
