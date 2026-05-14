import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-jwt'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/decimal'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

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
    console.error('Erro ao buscar relatório de locações:', error)
    return NextResponse.json({ error: 'Erro ao buscar relatório de locações' }, { status: 500 })
  }
}
