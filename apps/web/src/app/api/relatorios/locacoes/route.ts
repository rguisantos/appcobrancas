import { NextRequest, NextResponse } from 'next/server'
import { requireMutationRole } from '@/lib/rbac'
import { handleApiError } from '@/lib/api-utils'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/decimal'

export async function GET(request: NextRequest) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  try {
  const locacoes = await db.locacao.findMany({
    where: { deletedAt: null },
    include: { cobrancas: { where: { deletedAt: null } } },
  })

  const data = locacoes.map(l => ({
    id: l.id,
    clienteNome: l.clienteNome,
    produtoIdentificador: l.produtoIdentificador,
    produtoTipo: l.produtoTipo,
    dataLocacao: l.dataLocacao,
    formaPagamento: l.formaPagamento,
    status: l.status,
    totalCobrancas: l.cobrancas.length,
    totalRecebido: l.cobrancas.filter(c => c.status === 'Pago' || c.status === 'Parcial').reduce((s, c) => s + toNumber(c.valorRecebido), 0),
  }))

  const porForma: Record<string, number> = {}
  data.forEach(l => { porForma[l.formaPagamento] = (porForma[l.formaPagamento] || 0) + 1 })

  return NextResponse.json({
    data,
    porForma,
    totalAtivas: data.filter(l => l.status === 'Ativa').length,
    totalFinalizadas: data.filter(l => l.status === 'Finalizada').length,
  })
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar relatório de locações')
  }
}
