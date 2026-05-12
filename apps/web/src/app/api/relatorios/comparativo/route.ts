import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-jwt'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
  const cobrancas = await db.cobranca.findMany({
    where: { deletedAt: null },
  })

  // Group by month
  const porMes: Record<string, { receita: number; total: number }> = {}
  cobrancas.forEach(c => {
    const month = c.dataInicio?.substring(0, 7) || 'unknown'
    if (!porMes[month]) porMes[month] = { receita: 0, total: 0 }
    porMes[month].total += c.totalClientePaga
    if (c.status === 'Pago' || c.status === 'Parcial') {
      porMes[month].receita += c.valorRecebido
    }
  })

  const meses = Object.entries(porMes)
    .map(([mes, data]) => ({ mes, ...data, adimplencia: data.total > 0 ? (data.receita / data.total) * 100 : 0 }))
    .sort((a, b) => a.mes.localeCompare(b.mes))

  return NextResponse.json({ meses })
  } catch (error) {
    console.error('Erro ao buscar relatório comparativo:', error)
    return NextResponse.json({ error: 'Erro ao buscar relatório comparativo' }, { status: 500 })
  }
}
