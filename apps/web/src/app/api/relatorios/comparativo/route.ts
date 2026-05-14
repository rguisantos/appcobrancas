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
  const cobrancas = await db.cobranca.findMany({
    where: { deletedAt: null },
  })

  // Group by month
  const porMes: Record<string, { receita: number; total: number }> = {}
  cobrancas.forEach(c => {
    const month = c.dataInicio ? format(new Date(c.dataInicio), 'yyyy-MM') : 'unknown'
    if (!porMes[month]) porMes[month] = { receita: 0, total: 0 }
    porMes[month].total += toNumber(c.totalClientePaga)
    if (c.status === 'Pago' || c.status === 'Parcial') {
      porMes[month].receita += toNumber(c.valorRecebido)
    }
  })

  const meses = Object.entries(porMes)
    .map(([mes, data]) => ({ mes, ...data, adimplencia: data.total > 0 ? (data.receita / data.total) * 100 : 0 }))
    .sort((a, b) => a.mes.localeCompare(b.mes))

  return NextResponse.json({ meses })
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar relatório comparativo')
  }
}
