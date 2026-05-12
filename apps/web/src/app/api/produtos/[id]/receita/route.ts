import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  const produto = await db.produto.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  })

  if (!produto) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })

  // Get all cobranças for this product
  const cobrancas = await db.cobranca.findMany({
    where: { produtoId: id, deletedAt: null },
    select: {
      id: true,
      status: true,
      totalClientePaga: true,
      valorRecebido: true,
      dataInicio: true,
      dataPagamento: true,
    },
    orderBy: { dataInicio: 'asc' },
  })

  const totalCobrancas = cobrancas.length
  const totalReceita = cobrancas.reduce((acc, c) => acc + c.valorRecebido, 0)
  const totalPendente = cobrancas
    .filter(c => c.status === 'Pendente' || c.status === 'Atrasado' || c.status === 'Parcial')
    .reduce((acc, c) => acc + (c.totalClientePaga - c.valorRecebido), 0)
  const cobrancasPagas = cobrancas.filter(c => c.status === 'Pago' || c.status === 'Parcial').length
  const taxaPagamento = totalCobrancas > 0 ? (cobrancasPagas / totalCobrancas) * 100 : 0
  const valorMedio = totalCobrancas > 0
    ? cobrancas.reduce((acc, c) => acc + c.totalClientePaga, 0) / totalCobrancas
    : 0

  // Revenue by month
  const receitaMensal: Record<string, { mes: string; receita: number; cobrancas: number }> = {}
  cobrancas.forEach(c => {
    if (c.valorRecebido > 0) {
      let mesKey = ''
      try {
        const date = c.dataPagamento ? new Date(c.dataPagamento) : new Date(c.dataInicio)
        mesKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      } catch {
        mesKey = 'unknown'
      }
      if (!receitaMensal[mesKey]) {
        receitaMensal[mesKey] = { mes: mesKey, receita: 0, cobrancas: 0 }
      }
      receitaMensal[mesKey].receita += c.valorRecebido
      receitaMensal[mesKey].cobrancas += 1
    }
  })

  const receitaPorMes = Object.values(receitaMensal).sort((a, b) => a.mes.localeCompare(b.mes))

  return NextResponse.json({
    totalReceita,
    totalPendente,
    totalCobrancas,
    cobrancasPagas,
    taxaPagamento: Math.round(taxaPagamento * 100) / 100,
    valorMedio: Math.round(valorMedio * 100) / 100,
    receitaPorMes,
  })
}
