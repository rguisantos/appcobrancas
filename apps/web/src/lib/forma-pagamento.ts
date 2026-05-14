/**
 * Shared payment method formatting and display utilities.
 * Previously duplicated across: locacoes-view, cobranca-form-view,
 * cobranca-detalhe-view, locacao-detalhe-view.
 */

/** Map of raw formaPagamento values to display labels */
const FORMA_PAGAMENTO_LABELS: Record<string, string> = {
  Periodo: 'Período',
  PercentualPagar: '% Pagar',
  PercentualReceber: '% Receber',
  Dinheiro: 'Dinheiro',
  Pix: 'Pix',
  Cartao: 'Cartão',
  Transferencia: 'Transferência',
}

/**
 * Format a raw formaPagamento value to a user-friendly display label.
 * Example: 'PercentualPagar' → '% Pagar'
 */
export function formatFormaPagamento(fp: string | null | undefined): string {
  if (!fp) return '—'
  return FORMA_PAGAMENTO_LABELS[fp] || fp
}

/**
 * Format a raw formaPagamento value with a suffix indicating if it's fixed value.
 * Example: 'Periodo' → 'Período (Valor Fixo)'
 */
export function formatFormaPagamentoExtended(
  fp: string | null | undefined,
  isFixedValue?: boolean
): string {
  const label = formatFormaPagamento(fp)
  if (isFixedValue && fp === 'Periodo') {
    return `${label} (Valor Fixo)`
  }
  return label
}

/**
 * Get all available payment method options for form dropdowns.
 */
export function getFormaPagamentoOptions(): Array<{
  value: string
  label: string
}> {
  return [
    { value: 'Periodo', label: 'Período' },
    { value: 'PercentualPagar', label: '% Pagar' },
    { value: 'PercentualReceber', label: '% Receber' },
  ]
}
