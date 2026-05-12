import { describe, it, expect } from 'vitest'
import {
  calcularCobranca,
  calcularSaldoDevedor,
  determinarStatusPagamento,
  formatarMoeda,
} from '../cobranca-calculos'

describe('calcularCobranca', () => {
  describe('Periodo (fixed value)', () => {
    it('should return fixed value as totalClientePaga', () => {
      const result = calcularCobranca({
        formaPagamento: 'Periodo',
        relogioAnterior: 0,
        relogioAtual: 100,
        precoFicha: 1.5,
        percentualEmpresa: 50,
        valorFixo: 200,
      })

      expect(result.totalClientePaga).toBe(200)
      expect(result.fichasRodadas).toBe(0)
      expect(result.totalBruto).toBe(0)
      expect(result.subtotalAposDescontos).toBe(0)
      expect(result.valorPercentual).toBe(0)
    })

    it('should return 0 when no valorFixo is set', () => {
      const result = calcularCobranca({
        formaPagamento: 'Periodo',
        relogioAnterior: 0,
        relogioAtual: 100,
        precoFicha: 1.5,
        percentualEmpresa: 50,
      })

      expect(result.totalClientePaga).toBe(0)
    })
  })

  describe('PercentualPagar', () => {
    it('should calculate fichas and percentual correctly', () => {
      const result = calcularCobranca({
        formaPagamento: 'PercentualPagar',
        relogioAnterior: 1000,
        relogioAtual: 1100,
        precoFicha: 2.0,
        percentualEmpresa: 40,
      })

      expect(result.fichasRodadas).toBe(100)
      expect(result.totalBruto).toBe(200)
      expect(result.subtotalAposDescontos).toBe(200)
      expect(result.valorPercentual).toBe(80) // 200 * 40%
      expect(result.totalClientePaga).toBe(80) // cliente paga o percentual
    })

    it('should apply partidas discount correctly', () => {
      const result = calcularCobranca({
        formaPagamento: 'PercentualPagar',
        relogioAnterior: 0,
        relogioAtual: 50,
        precoFicha: 2.0,
        percentualEmpresa: 50,
        descontoPartidasQtd: 5,
      })

      // 50 fichas * R$2.00 = R$100 bruto
      // desconto: 5 partidas * R$2.00 = R$10
      // subtotal: R$90
      // percentual: R$90 * 50% = R$45
      expect(result.fichasRodadas).toBe(50)
      expect(result.totalBruto).toBe(100)
      expect(result.descontoPartidasValorTotal).toBe(10)
      expect(result.subtotalAposDescontos).toBe(90)
      expect(result.valorPercentual).toBe(45)
      expect(result.totalClientePaga).toBe(45)
    })

    it('should apply money discount correctly', () => {
      const result = calcularCobranca({
        formaPagamento: 'PercentualPagar',
        relogioAnterior: 0,
        relogioAtual: 100,
        precoFicha: 1.0,
        percentualEmpresa: 50,
        descontoDinheiro: 20,
      })

      // 100 * R$1 = R$100
      // desconto: R$20
      // subtotal: R$80
      // percentual: R$80 * 50% = R$40
      expect(result.totalBruto).toBe(100)
      expect(result.descontoDinheiroTotal).toBe(20)
      expect(result.subtotalAposDescontos).toBe(80)
      expect(result.totalClientePaga).toBe(40)
    })
  })

  describe('PercentualReceber', () => {
    it('should calculate cliente pays remainder after empresa percentage', () => {
      const result = calcularCobranca({
        formaPagamento: 'PercentualReceber',
        relogioAnterior: 500,
        relogioAtual: 600,
        precoFicha: 3.0,
        percentualEmpresa: 30,
      })

      // 100 fichas * R$3 = R$300
      // percentual empresa: R$300 * 30% = R$90
      // cliente paga: R$300 - R$90 = R$210
      expect(result.fichasRodadas).toBe(100)
      expect(result.totalBruto).toBe(300)
      expect(result.valorPercentual).toBe(90)
      expect(result.totalClientePaga).toBe(210)
    })
  })

  describe('edge cases', () => {
    it('should handle relogioAtual < relogioAnterior (negative fichas)', () => {
      const result = calcularCobranca({
        formaPagamento: 'PercentualPagar',
        relogioAnterior: 100,
        relogioAtual: 50,
        precoFicha: 2.0,
        percentualEmpresa: 50,
      })

      expect(result.fichasRodadas).toBe(0)
      expect(result.totalBruto).toBe(0)
      expect(result.totalClientePaga).toBe(0)
    })

    it('should never return negative totalClientePaga', () => {
      const result = calcularCobranca({
        formaPagamento: 'PercentualReceber',
        relogioAnterior: 0,
        relogioAtual: 10,
        precoFicha: 1.0,
        percentualEmpresa: 150, // more than 100% - edge case
      })

      expect(result.totalClientePaga).toBeGreaterThanOrEqual(0)
    })

    it('should handle zero fichas', () => {
      const result = calcularCobranca({
        formaPagamento: 'PercentualPagar',
        relogioAnterior: 500,
        relogioAtual: 500,
        precoFicha: 2.0,
        percentualEmpresa: 50,
      })

      expect(result.fichasRodadas).toBe(0)
      expect(result.totalBruto).toBe(0)
      expect(result.totalClientePaga).toBe(0)
    })

    it('should handle discounts exceeding total', () => {
      const result = calcularCobranca({
        formaPagamento: 'PercentualPagar',
        relogioAnterior: 0,
        relogioAtual: 5,
        precoFicha: 1.0,
        percentualEmpresa: 50,
        descontoDinheiro: 100, // discount larger than total
      })

      expect(result.subtotalAposDescontos).toBe(0)
      expect(result.totalClientePaga).toBe(0)
    })

    it('should prefer descontoPartidasValor over descontoPartidasQtd when both provided', () => {
      const result = calcularCobranca({
        formaPagamento: 'PercentualPagar',
        relogioAnterior: 0,
        relogioAtual: 100,
        precoFicha: 1.0,
        percentualEmpresa: 50,
        descontoPartidasQtd: 5,
        descontoPartidasValor: 20,
      })

      // descontoPartidasValor takes precedence (truthy check)
      expect(result.descontoPartidasValorTotal).toBe(20)
    })
  })
})

describe('calcularSaldoDevedor', () => {
  it('should calculate debt when partial payment', () => {
    const result = calcularSaldoDevedor(100, 60)
    expect(result.saldoDevedorGerado).toBe(40)
    expect(result.troco).toBe(0)
  })

  it('should calculate change when overpayment', () => {
    const result = calcularSaldoDevedor(100, 120)
    expect(result.saldoDevedorGerado).toBe(0)
    expect(result.troco).toBe(20)
  })

  it('should handle exact payment', () => {
    const result = calcularSaldoDevedor(100, 100)
    expect(result.saldoDevedorGerado).toBe(0)
    expect(result.troco).toBe(0)
  })

  it('should handle zero payment', () => {
    const result = calcularSaldoDevedor(100, 0)
    expect(result.saldoDevedorGerado).toBe(100)
    expect(result.troco).toBe(0)
  })

  it('should handle zero total', () => {
    const result = calcularSaldoDevedor(0, 0)
    expect(result.saldoDevedorGerado).toBe(0)
    expect(result.troco).toBe(0)
  })
})

describe('determinarStatusPagamento', () => {
  it('should return Pago when fully paid', () => {
    expect(determinarStatusPagamento(100, 100, false)).toBe('Pago')
    expect(determinarStatusPagamento(100, 150, false)).toBe('Pago')
  })

  it('should return Parcial when partially paid', () => {
    expect(determinarStatusPagamento(100, 50, false)).toBe('Parcial')
    expect(determinarStatusPagamento(100, 1, false)).toBe('Parcial')
  })

  it('should return Atrasado when overdue and unpaid', () => {
    expect(determinarStatusPagamento(100, 0, true)).toBe('Atrasado')
  })

  it('should return Pendente when not paid and not overdue', () => {
    expect(determinarStatusPagamento(100, 0, false)).toBe('Pendente')
  })

  it('should return Pago even if overdue when fully paid', () => {
    expect(determinarStatusPagamento(100, 100, true)).toBe('Pago')
  })

  it('should return Parcial even if overdue when partially paid', () => {
    expect(determinarStatusPagamento(100, 50, true)).toBe('Parcial')
  })
})

describe('formatarMoeda', () => {
  it('should format positive values', () => {
    const result = formatarMoeda(1234.56)
    // Brazilian format: R$ 1.234,56
    expect(result).toContain('1.234')
    expect(result).toContain('56')
  })

  it('should format zero', () => {
    const result = formatarMoeda(0)
    expect(result).toContain('0,00')
  })

  it('should format negative values', () => {
    const result = formatarMoeda(-50)
    expect(result).toContain('50')
  })
})
