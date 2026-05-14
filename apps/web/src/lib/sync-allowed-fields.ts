import type { SyncEntity } from './sync-log'

/**
 * Field allowlists for sync push operations.
 * Only these fields can be set/modified via the mobile sync push API.
 * This prevents mass assignment attacks (e.g., setting status='Pago' from mobile).
 */
export const SYNC_ALLOWED_FIELDS: Record<SyncEntity, string[]> = {
  cliente: ['tipoPessoa', 'nomeExibicao', 'nomeCompleto', 'razaoSocial', 'cpf', 'cnpj', 'rg', 'inscricaoEstadual', 'telefonePrincipal', 'email', 'contatos', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'latitude', 'longitude', 'rotaId'],
  produto: ['identificador', 'numeroRelogio', 'tipoId', 'tipoNome', 'descricaoId', 'descricaoNome', 'tamanhoId', 'tamanhoNome', 'codigoCH', 'codigoABLF', 'conservacao', 'statusProduto', 'estabelecimento', 'observacao'],
  locacao: ['clienteId', 'clienteNome', 'produtoId', 'produtoIdentificador', 'produtoTipo', 'dataLocacao', 'dataFim', 'formaPagamento', 'numeroRelogio', 'precoFicha', 'percentualEmpresa', 'percentualCliente', 'valorFixo', 'periodicidade', 'dataPrimeiraCobranca', 'observacoes', 'trocaPano'],
  cobranca: ['locacaoId', 'clienteId', 'clienteNome', 'produtoId', 'produtoIdentificador', 'dataInicio', 'dataFim', 'relogioAnterior', 'relogioAtual', 'descontoPartidasQtd', 'descontoPartidasValor', 'descontoDinheiro', 'observacao'],
  pagamentoCobranca: ['cobrancaId', 'valor', 'formaPagamento', 'dataPagamento', 'observacao', 'usuarioId', 'usuarioNome'],
  historicoRelogio: ['produtoId', 'relogioAnterior', 'relogioNovo', 'motivo', 'observacao', 'usuarioId', 'usuarioNome'],
  manutencao: ['produtoId', 'produtoIdentificador', 'tipo', 'descricao', 'dataInicio', 'dataFim', 'custo', 'status', 'observacao', 'usuarioId', 'usuarioNome'],
  // Server-only entities — no bidirectional sync
  rota: [],
  tipoProduto: [],
  descricaoProduto: [],
  tamanhoProduto: [],
  estabelecimento: [],
}

/** Pick only allowed fields from a raw data object. */
export function pickAllowedFields(entidade: SyncEntity, dados: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!dados) return {}
  const allowed = SYNC_ALLOWED_FIELDS[entidade]
  if (!allowed || allowed.length === 0) return {}
  const result: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in dados) {
      result[key] = dados[key]
    }
  }
  return result
}
