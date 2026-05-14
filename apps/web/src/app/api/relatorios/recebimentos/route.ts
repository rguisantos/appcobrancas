import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-jwt'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { toNumber } from '@/lib/decimal'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

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
    console.error('Erro ao buscar recebimentos:', error)
    return NextResponse.json({ error: 'Erro ao buscar recebimentos' }, { status: 500 })
  }
}
