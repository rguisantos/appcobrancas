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
    where: { deletedAt: null, status: { in: ['Pago', 'Parcial'] } },
    orderBy: { dataPagamento: 'desc' },
  })

  const porMes: Record<string, number> = {}
  cobrancas.forEach(c => {
    const month = c.dataPagamento ? format(new Date(c.dataPagamento), 'yyyy-MM') : 'unknown'
    porMes[month] = (porMes[month] || 0) + toNumber(c.valorRecebido)
  })

  return NextResponse.json({
    cobrancas: cobrancas.slice(0, 200),
    porMes: Object.entries(porMes).map(([mes, total]) => ({ mes, total })).sort((a, b) => a.mes.localeCompare(b.mes)),
    totalRecebido: cobrancas.reduce((s, c) => s + toNumber(c.valorRecebido), 0),
  })
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar relatório de recebimentos')
  }
}
