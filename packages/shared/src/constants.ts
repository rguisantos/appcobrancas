/**
 * Application-wide constants shared between web and mobile.
 */

export const PAYMENT_METHODS = ['Periodo', 'PercentualPagar', 'PercentualReceber'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PERIODICITIES = ['Semanal', 'Quinzenal', 'Mensal'] as const
export type Periodicity = (typeof PERIODICITIES)[number]

export const CLIENT_STATUSES = ['Ativo', 'Inativo'] as const
export const PRODUCT_STATUSES = ['Ativo', 'Inativo', 'Manutencao'] as const
export const LOCACAO_STATUSES = ['Ativa', 'Inativa'] as const
export const COBRANCA_STATUSES = ['Pago', 'Parcial', 'Pendente', 'Atrasado'] as const
export const MANUTENCAO_STATUSES = ['EmAndamento', 'Concluida', 'Cancelada'] as const
export const MANUTENCAO_TYPES = ['preventiva', 'corretiva', 'troca_pano', 'outra'] as const
export const CONSERVATION_LEVELS = ['Otima', 'Boa', 'Regular', 'Ruim', 'Pessima'] as const
export const PERMISSION_TYPES = ['Administrador', 'Secretario', 'AcessoControlado'] as const
export const PAYMENT_FORMS = ['Dinheiro', 'Pix', 'Cartao', 'Transferencia'] as const

export const SYNC_ENTITIES = [
  'rota',
  'cliente',
  'tipoProduto',
  'descricaoProduto',
  'tamanhoProduto',
  'produto',
  'estabelecimento',
  'locacao',
  'cobranca',
  'pagamentoCobranca',
  'historicoRelogio',
  'manutencao',
] as const

export type SyncEntityName = (typeof SYNC_ENTITIES)[number]
