import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  // Verify client exists
  const cliente = await db.cliente.findFirst({
    where: { id, deletedAt: null },
  })
  if (!cliente) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
  }

  // Fetch all cobranças for this client
  const cobrancas = await db.cobranca.findMany({
    where: {
      clienteId: id,
      deletedAt: null,
    },
    select: {
      id: true,
      status: true,
      totalClientePaga: true,
      valorRecebido: true,
      saldoDevedorGerado: true,
      dataInicio: true,
      dataFim: true,
      dataPagamento: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Calculate totals
  const totalCobrancas = cobrancas.length
  const totalPago = cobrancas
    .filter((c) => c.status === 'Pago' || c.status === 'Parcial')
    .reduce((acc, c) => acc + c.valorRecebido, 0)
  const totalPendente = cobrancas
    .filter((c) => c.status === 'Pendente')
    .reduce((acc, c) => acc + (c.totalClientePaga - c.valorRecebido), 0)
  const totalAtrasado = cobrancas
    .filter((c) => c.status === 'Atrasado')
    .reduce((acc, c) => acc + (c.totalClientePaga - c.valorRecebido), 0)
  const totalParcial = cobrancas
    .filter((c) => c.status === 'Parcial')
    .reduce((acc, c) => acc + (c.totalClientePaga - c.valorRecebido), 0)

  // Payment history - last 6 months, month-by-month totals
  const now = new Date()
  const paymentHistory = []

  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const monthKey = monthDate.toISOString().slice(0, 7) // YYYY-MM
    const monthLabel = monthDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })

    const monthCobrancas = cobrancas.filter((c) => {
      const created = new Date(c.createdAt)
      return created >= monthDate && created <= monthEnd
    })

    const monthPago = monthCobrancas
      .filter((c) => c.status === 'Pago' || c.status === 'Parcial')
      .reduce((acc, c) => acc + c.valorRecebido, 0)

    const monthTotal = monthCobrancas.reduce((acc, c) => acc + c.totalClientePaga, 0)

    paymentHistory.push({
      mes: monthKey,
      label: monthLabel,
      total: monthTotal,
      pago: monthPago,
      quantidade: monthCobrancas.length,
    })
  }

  // Average monthly payment (based on months with payments)
  const monthsWithPayments = paymentHistory.filter((m) => m.pago > 0)
  const averageMonthlyPayment = monthsWithPayments.length > 0
    ? monthsWithPayments.reduce((acc, m) => acc + m.pago, 0) / monthsWithPayments.length
    : 0

  // Accumulated debt balance
  const saldoDevedorAcumulado = cobrancas.reduce((acc, c) => {
    if (c.status === 'Atrasado' || c.status === 'Pendente' || c.status === 'Parcial') {
      return acc + (c.totalClientePaga - c.valorRecebido)
    }
    return acc
  }, 0)

  return NextResponse.json({
    clienteId: id,
    nomeExibicao: cliente.nomeExibicao,
    identificador: cliente.identificador,
    totalCobrancas,
    totalPago,
    totalPendente,
    totalAtrasado,
    totalParcial,
    averageMonthlyPayment,
    saldoDevedorAcumulado,
    paymentHistory,
  })
}
