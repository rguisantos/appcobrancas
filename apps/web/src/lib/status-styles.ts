/**
 * Shared status styling utilities.
 * Previously duplicated across: produtos-view, locacoes-view,
 * dashboard-view, cliente-detalhe-view, cobrancas-view.
 */

/** Product status to border color class mapping */
const PRODUTO_STATUS_BORDER: Record<string, string> = {
  Ativo: 'border-l-emerald-500',
  Inativo: 'border-l-gray-400',
  'Manutenção': 'border-l-amber-500',
}

/** Locação status to border color class mapping */
const LOCACAO_STATUS_BORDER: Record<string, string> = {
  Ativa: 'border-l-emerald-500',
  Finalizada: 'border-l-gray-400',
  Cancelada: 'border-l-red-500',
}

/** Cobrança status to border/background color mapping */
const COBRANCA_STATUS_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  Pendente: {
    border: 'border-l-yellow-500',
    bg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    text: 'text-yellow-700 dark:text-yellow-300',
  },
  Pago: {
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  Atrasado: {
    border: 'border-l-red-500',
    bg: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    text: 'text-red-700 dark:text-red-300',
  },
  Parcial: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    text: 'text-blue-700 dark:text-blue-300',
  },
  Cancelada: {
    border: 'border-l-gray-400',
    bg: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    text: 'text-gray-700 dark:text-gray-300',
  },
}

/** Cliente status to border color class mapping */
const CLIENTE_STATUS_BORDER: Record<string, string> = {
  Ativo: 'border-l-emerald-500',
  Inativo: 'border-l-gray-400',
}

/** Conservação badge style mapping */
const CONSERVACAO_BADGE: Record<string, string> = {
  'Ótima': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Boa: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  Regular: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  Ruim: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Péssima': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export function getProdutoStatusBorder(status: string): string {
  return PRODUTO_STATUS_BORDER[status] || 'border-l-gray-300'
}

export function getLocacaoStatusBorder(status: string): string {
  return LOCACAO_STATUS_BORDER[status] || 'border-l-gray-300'
}

export function getCobrancaStatusBorder(status: string): string {
  return COBRANCA_STATUS_COLORS[status]?.border || 'border-l-gray-300'
}

export function getCobrancaStatusBadge(status: string): string {
  return COBRANCA_STATUS_COLORS[status]?.bg || 'bg-gray-100 text-gray-800'
}

export function getCobrancaStatusText(status: string): string {
  return COBRANCA_STATUS_COLORS[status]?.text || 'text-gray-700'
}

export function getClienteStatusBorder(status: string): string {
  return CLIENTE_STATUS_BORDER[status] || 'border-l-gray-300'
}

export function getConservacaoBadge(conservacao: string): string {
  return CONSERVACAO_BADGE[conservacao] || 'bg-gray-100 text-gray-800'
}

/** Generic status border color — tries cobrança first, then produto, then default */
export function getStatusBorderColor(status: string): string {
  if (COBRANCA_STATUS_COLORS[status]) return COBRANCA_STATUS_COLORS[status].border
  if (PRODUTO_STATUS_BORDER[status]) return PRODUTO_STATUS_BORDER[status]
  if (LOCACAO_STATUS_BORDER[status]) return LOCACAO_STATUS_BORDER[status]
  return 'border-l-gray-300'
}
