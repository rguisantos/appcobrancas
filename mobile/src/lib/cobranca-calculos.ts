/**
 * Business logic for billing calculations.
 * Mirrors the web app's cobranca-calculos.ts exactly.
 */

export interface CobrancaCalcInput {
  formaPagamento: 'Periodo' | 'PercentualPagar' | 'PercentualReceber'
  relogioAnterior: number
  relogioAtual: number
  precoFicha: number
  percentualEmpresa: number
  valorFixo?: number
  descontoPartidasQtd?: number
  descontoPartidasValor?: number
  descontoDinheiro?: number
}

export interface CobrancaCalcResult {
  fichasRodadas: number
  totalBruto: number
  subtotalAposDescontos: number
  valorPercentual: number
  totalClientePaga: number
  descontoPartidasValorTotal: number
  descontoDinheiroTotal: number
}

export function calcularCobranca(input: CobrancaCalcInput): CobrancaCalcResult {
  const {
    formaPagamento,
    relogioAnterior,
    relogioAtual,
    precoFicha,
    percentualEmpresa,
    valorFixo,
    descontoPartidasQtd = 0,
    descontoPartidasValor = 0,
    descontoDinheiro = 0,
  } = input

  if (formaPagamento === 'Periodo') {
    return {
      fichasRodadas: 0,
      totalBruto: 0,
      subtotalAposDescontos: 0,
      valorPercentual: 0,
      totalClientePaga: valorFixo || 0,
      descontoPartidasValorTotal: 0,
      descontoDinheiroTotal: 0,
    }
  }

  const fichasRodadas = Math.max(0, relogioAtual - relogioAnterior)
  const totalBruto = fichasRodadas * precoFicha
  const descontoPartidasValorTotal = descontoPartidasValor || (descontoPartidasQtd * precoFicha)
  const descontoDinheiroTotal = descontoDinheiro || 0
  const subtotalAposDescontos = Math.max(0, totalBruto - descontoPartidasValorTotal - descontoDinheiroTotal)
  const valorPercentual = subtotalAposDescontos * (percentualEmpresa / 100)

  let totalClientePaga = 0

  if (formaPagamento === 'PercentualReceber') {
    totalClientePaga = subtotalAposDescontos - valorPercentual
  } else if (formaPagamento === 'PercentualPagar') {
    totalClientePaga = valorPercentual
  }

  return {
    fichasRodadas,
    totalBruto,
    subtotalAposDescontos,
    valorPercentual,
    totalClientePaga: Math.max(0, totalClientePaga),
    descontoPartidasValorTotal,
    descontoDinheiroTotal,
  }
}

export function calcularSaldoDevedor(totalClientePaga: number, valorRecebido: number) {
  return {
    saldoDevedorGerado: Math.max(0, totalClientePaga - valorRecebido),
    troco: Math.max(0, valorRecebido - totalClientePaga),
  }
}

export function determinarStatusPagamento(totalClientePaga: number, valorRecebido: number, vencido: boolean): string {
  if (valorRecebido >= totalClientePaga && valorRecebido > 0) return 'Pago'
  if (valorRecebido > 0 && valorRecebido < totalClientePaga) return 'Parcial'
  if (vencido) return 'Atrasado'
  return 'Pendente'
}

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}
