import { describe, it, expect } from 'vitest'
import {
  clienteSchema,
  produtoSchema,
  rotaSchema,
  locacaoSchema,
  cobrancaSchema,
  usuarioSchema,
  loginSchema,
  metaSchema,
  manutencaoSchema,
  historicoRelogioSchema,
} from '../lib/validations'

describe('loginSchema', () => {
  it('should accept valid login data', () => {
    const result = loginSchema.safeParse({
      email: 'admin@test.com',
      senha: '123456',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      senha: '123456',
    })
    expect(result.success).toBe(false)
  })

  it('should reject empty senha', () => {
    const result = loginSchema.safeParse({
      email: 'admin@test.com',
      senha: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('clienteSchema', () => {
  it('should accept valid cliente with required fields', () => {
    const result = clienteSchema.safeParse({
      nomeExibicao: 'Test Cliente',
      telefonePrincipal: '11999999999',
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing nomeExibicao', () => {
    const result = clienteSchema.safeParse({
      telefonePrincipal: '11999999999',
    })
    expect(result.success).toBe(false)
  })

  it('should reject missing telefone', () => {
    const result = clienteSchema.safeParse({
      nomeExibicao: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('should accept valid email', () => {
    const result = clienteSchema.safeParse({
      nomeExibicao: 'Test',
      telefonePrincipal: '1199999',
      email: 'test@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('should accept empty email string', () => {
    const result = clienteSchema.safeParse({
      nomeExibicao: 'Test',
      telefonePrincipal: '1199999',
      email: '',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid email', () => {
    const result = clienteSchema.safeParse({
      nomeExibicao: 'Test',
      telefonePrincipal: '1199999',
      email: 'not-valid',
    })
    expect(result.success).toBe(false)
  })

  it('should default tipoPessoa to Fisica', () => {
    const result = clienteSchema.parse({
      nomeExibicao: 'Test',
      telefonePrincipal: '1199999',
    })
    expect(result.tipoPessoa).toBe('Fisica')
  })

  it('should default status to Ativo', () => {
    const result = clienteSchema.parse({
      nomeExibicao: 'Test',
      telefonePrincipal: '1199999',
    })
    expect(result.status).toBe('Ativo')
  })
})

describe('produtoSchema', () => {
  it('should accept valid produto', () => {
    const result = produtoSchema.safeParse({
      identificador: 'P001',
      tipoId: 'tipo1',
      tipoNome: 'Bilhar',
      descricaoId: 'desc1',
      descricaoNome: 'Azul',
      tamanhoId: 'tam1',
      tamanhoNome: '2.20m',
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty identificador', () => {
    const result = produtoSchema.safeParse({
      identificador: '',
      tipoId: 'tipo1',
      tipoNome: 'Bilhar',
      descricaoId: 'desc1',
      descricaoNome: 'Azul',
      tamanhoId: 'tam1',
      tamanhoNome: '2.20m',
    })
    expect(result.success).toBe(false)
  })

  it('should default conservacao to Boa', () => {
    const result = produtoSchema.parse({
      identificador: 'P001',
      tipoId: 'tipo1',
      tipoNome: 'Bilhar',
      descricaoId: 'desc1',
      descricaoNome: 'Azul',
      tamanhoId: 'tam1',
      tamanhoNome: '2.20m',
    })
    expect(result.conservacao).toBe('Boa')
  })
})

describe('cobrancaSchema', () => {
  it('should accept valid cobranca', () => {
    const result = cobrancaSchema.safeParse({
      locacaoId: 'loc1',
      dataInicio: '2025-01-01',
      dataFim: '2025-01-31',
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing locacaoId', () => {
    const result = cobrancaSchema.safeParse({
      dataInicio: '2025-01-01',
      dataFim: '2025-01-31',
    })
    expect(result.success).toBe(false)
  })

  it('should default status to Pendente', () => {
    const result = cobrancaSchema.parse({
      locacaoId: 'loc1',
      dataInicio: '2025-01-01',
      dataFim: '2025-01-31',
    })
    expect(result.status).toBe('Pendente')
  })

  it('should default relogio values to 0', () => {
    const result = cobrancaSchema.parse({
      locacaoId: 'loc1',
      dataInicio: '2025-01-01',
      dataFim: '2025-01-31',
    })
    expect(result.relogioAnterior).toBe(0)
    expect(result.relogioAtual).toBe(0)
    expect(result.valorRecebido).toBe(0)
  })
})

describe('usuarioSchema', () => {
  it('should accept valid usuario', () => {
    const result = usuarioSchema.safeParse({
      nome: 'Admin',
      email: 'admin@test.com',
      senha: '123456',
    })
    expect(result.success).toBe(true)
  })

  it('should reject short senha', () => {
    const result = usuarioSchema.safeParse({
      nome: 'Admin',
      email: 'admin@test.com',
      senha: '123',
    })
    expect(result.success).toBe(false)
  })

  it('should allow optional senha (for updates)', () => {
    const result = usuarioSchema.safeParse({
      nome: 'Admin',
      email: 'admin@test.com',
    })
    expect(result.success).toBe(true)
  })

  it('should default tipoPermissao to AcessoControlado', () => {
    const result = usuarioSchema.parse({
      nome: 'Test',
      email: 'test@test.com',
    })
    expect(result.tipoPermissao).toBe('AcessoControlado')
  })
})

describe('rotaSchema', () => {
  it('should accept valid rota', () => {
    const result = rotaSchema.safeParse({
      descricao: 'Centro',
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty descricao', () => {
    const result = rotaSchema.safeParse({
      descricao: '',
    })
    expect(result.success).toBe(false)
  })

  it('should default cor to blue', () => {
    const result = rotaSchema.parse({ descricao: 'Test' })
    expect(result.cor).toBe('#2563EB')
  })
})

describe('locacaoSchema', () => {
  it('should accept valid locacao', () => {
    const result = locacaoSchema.safeParse({
      clienteId: 'c1',
      produtoId: 'p1',
      dataLocacao: '2025-01-01',
      formaPagamento: 'Periodo',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid formaPagamento', () => {
    const result = locacaoSchema.safeParse({
      clienteId: 'c1',
      produtoId: 'p1',
      dataLocacao: '2025-01-01',
      formaPagamento: 'InvalidMethod',
    })
    expect(result.success).toBe(false)
  })
})

describe('manutencaoSchema', () => {
  it('should accept valid manutencao', () => {
    const result = manutencaoSchema.safeParse({
      produtoId: 'p1',
      tipo: 'preventiva',
      descricao: 'Troca de componente',
      dataInicio: '2025-01-01',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid tipo', () => {
    const result = manutencaoSchema.safeParse({
      produtoId: 'p1',
      tipo: 'invalid_tipo',
      descricao: 'Test',
      dataInicio: '2025-01-01',
    })
    expect(result.success).toBe(false)
  })
})

describe('metaSchema', () => {
  it('should accept valid meta', () => {
    const result = metaSchema.safeParse({
      nome: 'Meta Q1',
      tipo: 'receita',
      valorMeta: 10000,
      dataInicio: '2025-01-01',
      dataFim: '2025-03-31',
    })
    expect(result.success).toBe(true)
  })

  it('should reject negative valorMeta', () => {
    const result = metaSchema.safeParse({
      nome: 'Meta Q1',
      tipo: 'receita',
      valorMeta: -100,
      dataInicio: '2025-01-01',
      dataFim: '2025-03-31',
    })
    expect(result.success).toBe(false)
  })
})

describe('historicoRelogioSchema', () => {
  it('should accept valid historico', () => {
    const result = historicoRelogioSchema.safeParse({
      produtoId: 'p1',
      relogioAnterior: '1000',
      relogioNovo: '0',
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing produtoId', () => {
    const result = historicoRelogioSchema.safeParse({
      relogioAnterior: '1000',
      relogioNovo: '0',
    })
    expect(result.success).toBe(false)
  })
})
