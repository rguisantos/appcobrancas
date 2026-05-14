import { z } from 'zod/v4'

// Cliente
export const clienteSchema = z.object({
  tipoPessoa: z.enum(['Fisica', 'Juridica']).default('Fisica'),
  identificador: z.string().optional(), // Auto-generated when not provided
  nomeExibicao: z.string().min(1, 'Nome de exibição é obrigatório'),
  nomeCompleto: z.string().optional(),
  razaoSocial: z.string().optional(),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
  rg: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
  telefonePrincipal: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  contatos: z.array(z.object({
    nome: z.string().min(1, 'Nome do contato é obrigatório'),
    telefone: z.string().min(1, 'Telefone do contato é obrigatório'),
    funcao: z.string().optional(),
  })).nullable().optional(),
  cep: z.string().default(''),
  logradouro: z.string().default(''),
  numero: z.string().default(''),
  complemento: z.string().optional(),
  bairro: z.string().default(''),
  cidade: z.string().default(''),
  estado: z.string().default(''),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  rotaId: z.string().optional(),
  status: z.enum(['Ativo', 'Inativo']).default('Ativo'),
})

// Produto
export const produtoSchema = z.object({
  identificador: z.string().min(1, 'Identificador é obrigatório'),
  numeroRelogio: z.string().default('0'),
  tipoId: z.string().min(1, 'Tipo é obrigatório'),
  tipoNome: z.string().min(1),
  descricaoId: z.string().min(1, 'Descrição é obrigatória'),
  descricaoNome: z.string().min(1),
  tamanhoId: z.string().min(1, 'Tamanho é obrigatório'),
  tamanhoNome: z.string().min(1),
  codigoCH: z.string().optional(),
  codigoABLF: z.string().optional(),
  conservacao: z.enum(['Ótima', 'Boa', 'Regular', 'Ruim', 'Péssima']).default('Boa'),
  statusProduto: z.enum(['Ativo', 'Inativo', 'Manutenção']).default('Ativo'),
  estabelecimento: z.string().optional(),
  observacao: z.string().optional(),
})

// Rota
export const rotaSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  cor: z.string().default('#2563EB'),
  regiao: z.string().optional(),
  ordem: z.number().default(0),
  observacao: z.string().optional(),
  status: z.enum(['Ativo', 'Inativo']).default('Ativo'),
})

// Locação
export const locacaoSchema = z.object({
  clienteId: z.string().min(1, 'Cliente é obrigatório'),
  produtoId: z.string().min(1, 'Produto é obrigatório'),
  dataLocacao: z.coerce.date(),
  dataFim: z.coerce.date().optional(),
  formaPagamento: z.enum(['Periodo', 'PercentualPagar', 'PercentualReceber']),
  numeroRelogio: z.string().default('0'),
  precoFicha: z.number().min(0).default(0),
  percentualEmpresa: z.number().min(0).max(100).default(0),
  percentualCliente: z.number().min(0).max(100).default(0),
  valorFixo: z.number().min(0).optional(),
  periodicidade: z.enum(['Semanal', 'Quinzenal', 'Mensal']).optional(),
  dataPrimeiraCobranca: z.coerce.date().optional(),
  observacoes: z.string().optional(),
  trocaPano: z.boolean().default(false),
})

// Cobrança
export const cobrancaSchema = z.object({
  locacaoId: z.string().min(1, 'Locação é obrigatória'),
  dataInicio: z.coerce.date(),
  dataFim: z.coerce.date(),
  relogioAnterior: z.number().default(0),
  relogioAtual: z.number().default(0),
  descontoPartidasQtd: z.number().optional(),
  descontoPartidasValor: z.number().optional(),
  descontoDinheiro: z.number().optional(),
  valorRecebido: z.number().default(0),
  status: z.enum(['Pago', 'Parcial', 'Pendente', 'Atrasado']).default('Pendente'),
  observacao: z.string().optional(),
})

// Usuário
export const usuarioSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional(),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
  tipoPermissao: z.enum(['Administrador', 'Secretario', 'AcessoControlado']).default('AcessoControlado'),
  permissoesWeb: z.record(z.string(), z.boolean()).default({}),
  permissoesMobile: z.record(z.string(), z.boolean()).default({}),
  rotasPermitidas: z.array(z.string()).default([]),
  status: z.enum(['Ativo', 'Inativo']).default('Ativo'),
})

// Login
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha é obrigatória'),
})

// Meta
export const metaSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  tipo: z.enum(['receita', 'cobrancas', 'adimplencia']),
  valorMeta: z.number().min(0),
  dataInicio: z.string(),
  dataFim: z.string(),
  rotaId: z.string().optional(),
})

// Manutenção
export const manutencaoSchema = z.object({
  produtoId: z.string().min(1, 'Produto é obrigatório'),
  tipo: z.enum(['preventiva', 'corretiva', 'troca_pano', 'outra']),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  dataInicio: z.coerce.date(),
  dataFim: z.coerce.date().optional(),
  custo: z.number().default(0),
  status: z.enum(['EmAndamento', 'Concluida', 'Cancelada']).default('EmAndamento'),
  observacao: z.string().optional(),
})

// Histórico Relógio
export const historicoRelogioSchema = z.object({
  produtoId: z.string().min(1, 'Produto é obrigatório'),
  relogioAnterior: z.string().min(1),
  relogioNovo: z.string().min(1),
  motivo: z.string().optional(),
  observacao: z.string().optional(),
})
