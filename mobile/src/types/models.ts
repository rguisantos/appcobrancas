/**
 * Shared model types matching the Prisma schema.
 * Used across the mobile app for type safety.
 */

export interface Rota {
  id: string
  descricao: string
  cor: string
  regiao: string | null
  ordem: number
  observacao: string | null
  status: string
  version: number
  syncOrigin: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Cliente {
  id: string
  tipoPessoa: string
  identificador: string
  nomeExibicao: string
  nomeCompleto: string | null
  razaoSocial: string | null
  cpf: string | null
  cnpj: string | null
  rg: string | null
  inscricaoEstadual: string | null
  telefonePrincipal: string
  email: string | null
  contatos: string | null
  cep: string
  logradouro: string
  numero: string
  complemento: string | null
  bairro: string
  cidade: string
  estado: string
  latitude: number | null
  longitude: number | null
  rotaId: string | null
  status: string
  version: number
  syncOrigin: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  rota?: Rota | null
}

export interface TipoProduto {
  id: string
  nome: string
  createdAt: string
  updatedAt: string
}

export interface DescricaoProduto {
  id: string
  nome: string
  createdAt: string
  updatedAt: string
}

export interface TamanhoProduto {
  id: string
  nome: string
  createdAt: string
  updatedAt: string
}

export interface Produto {
  id: string
  identificador: string
  numeroRelogio: string
  tipoId: string
  tipoNome: string
  descricaoId: string
  descricaoNome: string
  tamanhoId: string
  tamanhoNome: string
  codigoCH: string | null
  codigoABLF: string | null
  conservacao: string
  statusProduto: string
  estabelecimento: string | null
  observacao: string | null
  version: number
  syncOrigin: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Locacao {
  id: string
  clienteId: string
  clienteNome: string
  produtoId: string
  produtoIdentificador: string
  produtoTipo: string
  dataLocacao: string
  dataFim: string | null
  formaPagamento: string
  numeroRelogio: string
  precoFicha: number
  percentualEmpresa: number
  percentualCliente: number
  valorFixo: number | null
  periodicidade: string | null
  dataPrimeiraCobranca: string | null
  observacoes: string | null
  status: string
  ultimaLeituraRelogio: number | null
  trocaPano: boolean
  version: number
  syncOrigin: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Cobranca {
  id: string
  locacaoId: string
  clienteId: string
  clienteNome: string
  produtoId: string | null
  produtoIdentificador: string
  dataInicio: string
  dataFim: string
  dataPagamento: string | null
  dataVencimento: string | null
  relogioAnterior: number
  relogioAtual: number
  fichasRodadas: number
  valorFicha: number
  totalBruto: number
  descontoPartidasQtd: number | null
  descontoPartidasValor: number | null
  descontoDinheiro: number | null
  percentualEmpresa: number
  subtotalAposDescontos: number
  valorPercentual: number
  totalClientePaga: number
  valorRecebido: number
  saldoDevedorGerado: number
  status: string
  formaPagamento: string
  observacao: string | null
  version: number
  syncOrigin: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PagamentoCobranca {
  id: string
  cobrancaId: string
  valor: number
  formaPagamento: string
  dataPagamento: string
  observacao: string | null
  usuarioId: string | null
  usuarioNome: string | null
  syncOrigin: string | null
  createdAt: string
  updatedAt: string
}

export interface HistoricoRelogio {
  id: string
  produtoId: string
  relogioAnterior: string
  relogioNovo: string
  motivo: string | null
  observacao: string | null
  usuarioId: string | null
  usuarioNome: string | null
  syncOrigin: string | null
  createdAt: string
  updatedAt: string
}

export interface Manutencao {
  id: string
  produtoId: string
  produtoIdentificador: string | null
  tipo: string
  descricao: string
  dataInicio: string
  dataFim: string | null
  custo: number
  status: string
  observacao: string | null
  usuarioId: string | null
  usuarioNome: string | null
  syncOrigin: string | null
  createdAt: string
  updatedAt: string
}

export interface Estabelecimento {
  id: string
  nome: string
  endereco: string | null
  createdAt: string
  updatedAt: string
}
