import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-jwt'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const cobrancas = await db.cobranca.findMany({
    where: { deletedAt: null, status: { in: ['Atrasado', 'Parcial', 'Pendente'] } },
    orderBy: { dataVencimento: 'asc' },
  })

  const totalInadimplente = cobrancas.filter(c => c.status === 'Atrasado')
    .reduce((s, c) => s + c.totalClientePaga - c.valorRecebido, 0)

  const porCliente: Record<string, { nome: string; total: number; count: number }> = {}
  cobrancas.forEach(c => {
    if (!porCliente[c.clienteId]) {
      porCliente[c.clienteId] = { nome: c.clienteNome, total: 0, count: 0 }
    }
    porCliente[c.clienteId].total += c.totalClientePaga - c.valorRecebido
    porCliente[c.clienteId].count++
  })

  return NextResponse.json({
    cobrancas,
    totalInadimplente,
    porCliente: Object.entries(porCliente).map(([id, data]) => ({ id, ...data })),
    totalAtrasadas: cobrancas.filter(c => c.status === 'Atrasado').length,
    totalParciais: cobrancas.filter(c => c.status === 'Parcial').length,
    totalPendentes: cobrancas.filter(c => c.status === 'Pendente').length,
  })
}
