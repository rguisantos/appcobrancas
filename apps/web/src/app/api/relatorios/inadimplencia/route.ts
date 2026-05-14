import { NextRequest, NextResponse } from 'next/server'
import { requireMutationRole } from '@/lib/rbac'
import { handleApiError } from '@/lib/api-utils'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/decimal'

export async function GET(request: NextRequest) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  try {
  const cobrancas = await db.cobranca.findMany({
    where: { deletedAt: null, status: { in: ['Atrasado', 'Parcial', 'Pendente'] } },
    orderBy: { dataVencimento: 'asc' },
  })

  const totalInadimplente = cobrancas.filter(c => c.status === 'Atrasado')
    .reduce((s, c) => s + toNumber(c.totalClientePaga) - toNumber(c.valorRecebido), 0)

  const porCliente: Record<string, { nome: string; total: number; count: number }> = {}
  cobrancas.forEach(c => {
    if (!porCliente[c.clienteId]) {
      porCliente[c.clienteId] = { nome: c.clienteNome, total: 0, count: 0 }
    }
    porCliente[c.clienteId].total += toNumber(c.totalClientePaga) - toNumber(c.valorRecebido)
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
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar relatório de inadimplência')
  }
}
