import { describe, it, expect } from 'vitest'
import {
  PAYMENT_METHODS,
  PERIODICITIES,
  CLIENT_STATUSES,
  PRODUCT_STATUSES,
  COBRANCA_STATUSES,
  MANUTENCAO_STATUSES,
  SYNC_ENTITIES,
} from '../constants'

describe('constants', () => {
  it('should have valid payment methods', () => {
    expect(PAYMENT_METHODS).toContain('Periodo')
    expect(PAYMENT_METHODS).toContain('PercentualPagar')
    expect(PAYMENT_METHODS).toContain('PercentualReceber')
    expect(PAYMENT_METHODS).toHaveLength(3)
  })

  it('should have valid periodicities', () => {
    expect(PERIODICITIES).toContain('Semanal')
    expect(PERIODICITIES).toContain('Quinzenal')
    expect(PERIODICITIES).toContain('Mensal')
    expect(PERIODICITIES).toHaveLength(3)
  })

  it('should have valid client statuses', () => {
    expect(CLIENT_STATUSES).toContain('Ativo')
    expect(CLIENT_STATUSES).toContain('Inativo')
  })

  it('should have valid cobranca statuses', () => {
    expect(COBRANCA_STATUSES).toContain('Pago')
    expect(COBRANCA_STATUSES).toContain('Parcial')
    expect(COBRANCA_STATUSES).toContain('Pendente')
    expect(COBRANCA_STATUSES).toContain('Atrasado')
    expect(COBRANCA_STATUSES).toHaveLength(4)
  })

  it('should have valid product statuses', () => {
    expect(PRODUCT_STATUSES).toContain('Ativo')
    expect(PRODUCT_STATUSES).toContain('Inativo')
    expect(PRODUCT_STATUSES).toContain('Manutencao')
  })

  it('should have valid manutencao statuses', () => {
    expect(MANUTENCAO_STATUSES).toContain('EmAndamento')
    expect(MANUTENCAO_STATUSES).toContain('Concluida')
    expect(MANUTENCAO_STATUSES).toContain('Cancelada')
  })

  it('should have all syncable entities defined', () => {
    expect(SYNC_ENTITIES).toContain('cliente')
    expect(SYNC_ENTITIES).toContain('produto')
    expect(SYNC_ENTITIES).toContain('locacao')
    expect(SYNC_ENTITIES).toContain('cobranca')
    expect(SYNC_ENTITIES).toContain('rota')
    expect(SYNC_ENTITIES).toContain('manutencao')
    expect(SYNC_ENTITIES).toContain('historicoRelogio')
    expect(SYNC_ENTITIES).toContain('pagamentoCobranca')
    expect(SYNC_ENTITIES.length).toBeGreaterThanOrEqual(12)
  })
})
