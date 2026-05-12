import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/hash'
import { PERMISSOES_WEB_ADMIN, PERMISSOES_MOBILE_DEFAULT } from '../src/lib/permissoes-padrao'

const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

async function main() {
  console.log('🌱 Seeding database...')

  // Ensure database connection is established (important for Neon cold starts)
  await prisma.$connect()
  console.log('✅ Database connection established')

  // Create admin user
  const existingAdmin = await prisma.usuario.findUnique({ where: { email: 'admin@locacao.com' } })
  if (!existingAdmin) {
    const senhaHash = await hashPassword('admin123')
    await prisma.usuario.create({
      data: {
        nome: 'Administrador',
        email: 'admin@locacao.com',
        senha: senhaHash,
        tipoPermissao: 'Administrador',
        permissoesWeb: JSON.stringify(PERMISSOES_WEB_ADMIN),
        permissoesMobile: JSON.stringify(PERMISSOES_MOBILE_DEFAULT),
        rotasPermitidas: '[]',
        status: 'Ativo',
      },
    })
    console.log('✅ Admin user created')
  } else {
    console.log('⏭️ Admin user already exists')
  }

  // Create sample rotas
  const rotas = [
    { descricao: 'Centro', cor: '#2563EB', regiao: 'Zona Central', ordem: 1 },
    { descricao: 'Linha Norte', cor: '#16A34A', regiao: 'Zona Norte', ordem: 2 },
    { descricao: 'Linha Sul', cor: '#DC2626', regiao: 'Zona Sul', ordem: 3 },
    { descricao: 'Linha Leste', cor: '#F59E0B', regiao: 'Zona Leste', ordem: 4 },
    { descricao: 'Linha Oeste', cor: '#7C3AED', regiao: 'Zona Oeste', ordem: 5 },
  ]

  for (const rota of rotas) {
    const existing = await prisma.rota.findFirst({ where: { descricao: rota.descricao } })
    if (!existing) {
      await prisma.rota.create({ data: rota })
    }
  }
  console.log('✅ Rotas created')

  // Create tipos, descricoes, tamanhos de produto
  const tipos = ['Bilhar', 'Jukebox', 'Mesa', 'Pebolim', 'Air Hockey', 'Fliperama']
  const descricoes = ['Azul', 'Preto', 'Branco', 'Vermelho', 'Verde', 'Madeira', 'Mármore']
  const tamanhos = ['2,00m', '2,20m', '2,40m', '2,60m', 'Pequeno', 'Médio', 'Grande']

  for (const nome of tipos) {
    const existing = await prisma.tipoProduto.findFirst({ where: { nome } })
    if (!existing) {
      await prisma.tipoProduto.create({ data: { nome } })
    }
  }

  for (const nome of descricoes) {
    const existing = await prisma.descricaoProduto.findFirst({ where: { nome } })
    if (!existing) {
      await prisma.descricaoProduto.create({ data: { nome } })
    }
  }

  for (const nome of tamanhos) {
    const existing = await prisma.tamanhoProduto.findFirst({ where: { nome } })
    if (!existing) {
      await prisma.tamanhoProduto.create({ data: { nome } })
    }
  }
  console.log('✅ Tipos, descrições e tamanhos criados')

  // Create estabelecimentos
  const estabelecimentos = ['Depósito Central', 'Galpão Norte', 'Galpão Sul']
  for (const nome of estabelecimentos) {
    const existing = await prisma.estabelecimento.findFirst({ where: { nome } })
    if (!existing) {
      await prisma.estabelecimento.create({ data: { nome, endereco: 'Campo Grande, MS' } })
    }
  }
  console.log('✅ Estabelecimentos criados')

  // Create sample clientes
  const allRotas = await prisma.rota.findMany()
  const sampleClientes = [
    { tipoPessoa: 'Fisica', identificador: 'C001', nomeExibicao: 'Bar do João', nomeCompleto: 'João da Silva', telefonePrincipal: '(67) 99999-0001', cidade: 'Campo Grande', estado: 'MS', bairro: 'Centro', logradouro: 'Rua Afonso Pena', numero: '123', cep: '79000-000', rotaId: allRotas[0]?.id },
    { tipoPessoa: 'Juridica', identificador: 'C002', nomeExibicao: 'Restaurante Sabor & Arte', razaoSocial: 'Sabor & Arte Ltda', cnpj: '12.345.678/0001-00', telefonePrincipal: '(67) 99999-0002', cidade: 'Campo Grande', estado: 'MS', bairro: 'Jardim América', logradouro: 'Av. Brasil', numero: '456', cep: '79001-000', rotaId: allRotas[1]?.id },
    { tipoPessoa: 'Fisica', identificador: 'C003', nomeExibicao: 'Lanchonete do Zé', nomeCompleto: 'José Pereira', telefonePrincipal: '(67) 99999-0003', cidade: 'Campo Grande', estado: 'MS', bairro: 'Vila Mariana', logradouro: 'Rua Cuiabá', numero: '789', cep: '79002-000', rotaId: allRotas[0]?.id },
    { tipoPessoa: 'Juridica', identificador: 'C004', nomeExibicao: 'Padaria Pão Quente', razaoSocial: 'Pão Quente Ltda', cnpj: '98.765.432/0001-00', telefonePrincipal: '(67) 99999-0004', cidade: 'Campo Grande', estado: 'MS', bairro: 'Centro', logradouro: 'Rua 14 de Julho', numero: '321', cep: '79003-000', rotaId: allRotas[2]?.id },
    { tipoPessoa: 'Fisica', identificador: 'C005', nomeExibicao: 'Boteco do Pedrão', nomeCompleto: 'Pedro Alves', telefonePrincipal: '(67) 99999-0005', cidade: 'Campo Grande', estado: 'MS', bairro: 'Jardim dos Estados', logradouro: 'Av. Mato Grosso', numero: '654', cep: '79004-000', rotaId: allRotas[3]?.id },
    { tipoPessoa: 'Fisica', identificador: 'C006', nomeExibicao: 'Café Central', nomeCompleto: 'Maria Souza', telefonePrincipal: '(67) 99999-0006', cidade: 'Campo Grande', estado: 'MS', bairro: 'Centro', logradouro: 'Rua Antonio Maria Coelho', numero: '88', cep: '79005-000', rotaId: allRotas[4]?.id },
    { tipoPessoa: 'Juridica', identificador: 'C007', nomeExibicao: 'Churrascaria Gaúcha', razaoSocial: 'Gaúcha Ltda', cnpj: '11.222.333/0001-44', telefonePrincipal: '(67) 99999-0007', cidade: 'Campo Grande', estado: 'MS', bairro: 'Jardim Paulista', logradouro: 'Av. Sen. Filinto Muller', numero: '200', cep: '79006-000', rotaId: allRotas[1]?.id },
    { tipoPessoa: 'Fisica', identificador: 'C008', nomeExibicao: 'Bar do Luiz', nomeCompleto: 'Luiz Carlos', telefonePrincipal: '(67) 99999-0008', cidade: 'Campo Grande', estado: 'MS', bairro: 'Vila Planinho', logradouro: 'Rua Planalto', numero: '55', cep: '79007-000', rotaId: allRotas[2]?.id },
  ]

  for (const cliente of sampleClientes) {
    const existing = await prisma.cliente.findFirst({ where: { identificador: cliente.identificador } })
    if (!existing) {
      await prisma.cliente.create({ data: cliente })
    }
  }
  console.log('✅ Clientes criados')

  // Create sample produtos
  const allTipos = await prisma.tipoProduto.findMany()
  const allDescricoes = await prisma.descricaoProduto.findMany()
  const allTamanhos = await prisma.tamanhoProduto.findMany()

  const sampleProdutos = [
    { identificador: 'BIL-001', numeroRelogio: '1500', tipoId: allTipos.find(t => t.nome === 'Bilhar')?.id || '', tipoNome: 'Bilhar', descricaoId: allDescricoes.find(d => d.nome === 'Azul')?.id || '', descricaoNome: 'Azul', tamanhoId: allTamanhos.find(t => t.nome === '2,60m')?.id || '', tamanhoNome: '2,60m', conservacao: 'Boa' },
    { identificador: 'BIL-002', numeroRelogio: '2300', tipoId: allTipos.find(t => t.nome === 'Bilhar')?.id || '', tipoNome: 'Bilhar', descricaoId: allDescricoes.find(d => d.nome === 'Preto')?.id || '', descricaoNome: 'Preto', tamanhoId: allTamanhos.find(t => t.nome === '2,40m')?.id || '', tamanhoNome: '2,40m', conservacao: 'Ótima' },
    { identificador: 'BIL-003', numeroRelogio: '890', tipoId: allTipos.find(t => t.nome === 'Bilhar')?.id || '', tipoNome: 'Bilhar', descricaoId: allDescricoes.find(d => d.nome === 'Vermelho')?.id || '', descricaoNome: 'Vermelho', tamanhoId: allTamanhos.find(t => t.nome === '2,20m')?.id || '', tamanhoNome: '2,20m', conservacao: 'Regular' },
    { identificador: 'JUK-001', numeroRelogio: '4500', tipoId: allTipos.find(t => t.nome === 'Jukebox')?.id || '', tipoNome: 'Jukebox', descricaoId: allDescricoes.find(d => d.nome === 'Preto')?.id || '', descricaoNome: 'Preto', tamanhoId: allTamanhos.find(t => t.nome === 'Grande')?.id || '', tamanhoNome: 'Grande', conservacao: 'Boa' },
    { identificador: 'JUK-002', numeroRelogio: '3100', tipoId: allTipos.find(t => t.nome === 'Jukebox')?.id || '', tipoNome: 'Jukebox', descricaoId: allDescricoes.find(d => d.nome === 'Branco')?.id || '', descricaoNome: 'Branco', tamanhoId: allTamanhos.find(t => t.nome === 'Médio')?.id || '', tamanhoNome: 'Médio', conservacao: 'Ótima' },
    { identificador: 'MES-001', numeroRelogio: '0', tipoId: allTipos.find(t => t.nome === 'Mesa')?.id || '', tipoNome: 'Mesa', descricaoId: allDescricoes.find(d => d.nome === 'Madeira')?.id || '', descricaoNome: 'Madeira', tamanhoId: allTamanhos.find(t => t.nome === 'Grande')?.id || '', tamanhoNome: 'Grande', conservacao: 'Boa' },
    { identificador: 'PEB-001', numeroRelogio: '5600', tipoId: allTipos.find(t => t.nome === 'Pebolim')?.id || '', tipoNome: 'Pebolim', descricaoId: allDescricoes.find(d => d.nome === 'Verde')?.id || '', descricaoNome: 'Verde', tamanhoId: allTamanhos.find(t => t.nome === 'Médio')?.id || '', tamanhoNome: 'Médio', conservacao: 'Boa' },
    { identificador: 'BIL-004', numeroRelogio: '1200', tipoId: allTipos.find(t => t.nome === 'Bilhar')?.id || '', tipoNome: 'Bilhar', descricaoId: allDescricoes.find(d => d.nome === 'Branco')?.id || '', descricaoNome: 'Branco', tamanhoId: allTamanhos.find(t => t.nome === '2,00m')?.id || '', tamanhoNome: '2,00m', conservacao: 'Ruim', statusProduto: 'Manutenção' },
    { identificador: 'AIR-001', numeroRelogio: '780', tipoId: allTipos.find(t => t.nome === 'Air Hockey')?.id || '', tipoNome: 'Air Hockey', descricaoId: allDescricoes.find(d => d.nome === 'Vermelho')?.id || '', descricaoNome: 'Vermelho', tamanhoId: allTamanhos.find(t => t.nome === 'Pequeno')?.id || '', tamanhoNome: 'Pequeno', conservacao: 'Boa' },
    { identificador: 'FLP-001', numeroRelogio: '9200', tipoId: allTipos.find(t => t.nome === 'Fliperama')?.id || '', tipoNome: 'Fliperama', descricaoId: allDescricoes.find(d => d.nome === 'Preto')?.id || '', descricaoNome: 'Preto', tamanhoId: allTamanhos.find(t => t.nome === 'Grande')?.id || '', tamanhoNome: 'Grande', conservacao: 'Ótima' },
  ]

  for (const produto of sampleProdutos) {
    const existing = await prisma.produto.findFirst({ where: { identificador: produto.identificador } })
    if (!existing) {
      await prisma.produto.create({ data: produto })
    }
  }
  console.log('✅ Produtos criados')

  // Create sample locações
  const allClientes = await prisma.cliente.findMany()
  const allProdutos = await prisma.produto.findMany({ where: { statusProduto: 'Ativo' } })

  const sampleLocacoes = [
    { clienteId: allClientes[0]?.id || '', clienteNome: 'Bar do João', produtoId: allProdutos.find(p => p.identificador === 'BIL-001')?.id || '', produtoIdentificador: 'BIL-001', produtoTipo: 'Bilhar', dataLocacao: '2024-01-15', formaPagamento: 'PercentualReceber', numeroRelogio: '1500', precoFicha: 2.0, percentualEmpresa: 40, percentualCliente: 60, periodicidade: 'Mensal', dataPrimeiraCobranca: '2024-02-01' },
    { clienteId: allClientes[1]?.id || '', clienteNome: 'Restaurante Sabor & Arte', produtoId: allProdutos.find(p => p.identificador === 'BIL-002')?.id || '', produtoIdentificador: 'BIL-002', produtoTipo: 'Bilhar', dataLocacao: '2024-02-01', formaPagamento: 'Periodo', numeroRelogio: '2300', precoFicha: 2.5, percentualEmpresa: 50, percentualCliente: 50, valorFixo: 500, periodicidade: 'Mensal', dataPrimeiraCobranca: '2024-03-01' },
    { clienteId: allClientes[2]?.id || '', clienteNome: 'Lanchonete do Zé', produtoId: allProdutos.find(p => p.identificador === 'JUK-001')?.id || '', produtoIdentificador: 'JUK-001', produtoTipo: 'Jukebox', dataLocacao: '2024-03-10', formaPagamento: 'PercentualPagar', numeroRelogio: '4500', precoFicha: 1.5, percentualEmpresa: 30, percentualCliente: 70, periodicidade: 'Quinzenal', dataPrimeiraCobranca: '2024-03-25' },
    { clienteId: allClientes[3]?.id || '', clienteNome: 'Padaria Pão Quente', produtoId: allProdutos.find(p => p.identificador === 'BIL-003')?.id || '', produtoIdentificador: 'BIL-003', produtoTipo: 'Bilhar', dataLocacao: '2024-04-01', formaPagamento: 'PercentualReceber', numeroRelogio: '890', precoFicha: 2.0, percentualEmpresa: 45, percentualCliente: 55, periodicidade: 'Mensal', dataPrimeiraCobranca: '2024-05-01' },
    { clienteId: allClientes[4]?.id || '', clienteNome: 'Boteco do Pedrão', produtoId: allProdutos.find(p => p.identificador === 'PEB-001')?.id || '', produtoIdentificador: 'PEB-001', produtoTipo: 'Pebolim', dataLocacao: '2024-05-15', formaPagamento: 'Periodo', numeroRelogio: '5600', precoFicha: 1.0, percentualEmpresa: 50, percentualCliente: 50, valorFixo: 300, periodicidade: 'Semanal', dataPrimeiraCobranca: '2024-05-22' },
    { clienteId: allClientes[5]?.id || '', clienteNome: 'Café Central', produtoId: allProdutos.find(p => p.identificador === 'JUK-002')?.id || '', produtoIdentificador: 'JUK-002', produtoTipo: 'Jukebox', dataLocacao: '2024-06-01', formaPagamento: 'PercentualReceber', numeroRelogio: '3100', precoFicha: 1.5, percentualEmpresa: 35, percentualCliente: 65, periodicidade: 'Mensal', dataPrimeiraCobranca: '2024-07-01' },
    { clienteId: allClientes[6]?.id || '', clienteNome: 'Churrascaria Gaúcha', produtoId: allProdutos.find(p => p.identificador === 'AIR-001')?.id || '', produtoIdentificador: 'AIR-001', produtoTipo: 'Air Hockey', dataLocacao: '2024-07-01', formaPagamento: 'Periodo', numeroRelogio: '780', precoFicha: 2.0, percentualEmpresa: 50, percentualCliente: 50, valorFixo: 250, periodicidade: 'Mensal', dataPrimeiraCobranca: '2024-08-01' },
  ]

  for (const locacao of sampleLocacoes) {
    if (locacao.clienteId && locacao.produtoId) {
      const existing = await prisma.locacao.findFirst({
        where: { produtoId: locacao.produtoId, status: 'Ativa' }
      })
      if (!existing) {
        await prisma.locacao.create({ data: locacao })
      }
    }
  }
  console.log('✅ Locações criadas')

  // Create sample cobranças
  const allLocacoes = await prisma.locacao.findMany({ where: { status: 'Ativa' } })
  const cobrancaStatuses = ['Pago', 'Parcial', 'Pendente', 'Atrasado'] as const

  for (const locacao of allLocacoes.slice(0, 5)) {
    const relogioAnterior = parseFloat(locacao.numeroRelogio)
    const relogioAtual = relogioAnterior + Math.floor(Math.random() * 200 + 50)
    const fichasRodadas = relogioAtual - relogioAnterior
    const totalBruto = fichasRodadas * locacao.precoFicha
    const statusIdx = Math.floor(Math.random() * 4)
    const status = cobrancaStatuses[statusIdx]
    const valorRecebido = status === 'Pago' ? totalBruto * (locacao.percentualEmpresa / 100) : status === 'Parcial' ? totalBruto * (locacao.percentualEmpresa / 100) * 0.5 : 0

    const existingCobranca = await prisma.cobranca.findFirst({
      where: { locacaoId: locacao.id }
    })

    if (!existingCobranca) {
      await prisma.cobranca.create({
        data: {
          locacaoId: locacao.id,
          clienteId: locacao.clienteId,
          clienteNome: locacao.clienteNome,
          produtoId: locacao.produtoId,
          produtoIdentificador: locacao.produtoIdentificador,
          dataInicio: '2024-11-01',
          dataFim: '2024-11-30',
          dataVencimento: '2024-11-30',
          dataPagamento: status === 'Pago' || status === 'Parcial' ? new Date().toISOString().split('T')[0] : null,
          relogioAnterior,
          relogioAtual,
          fichasRodadas,
          valorFicha: locacao.precoFicha,
          totalBruto,
          percentualEmpresa: locacao.percentualEmpresa,
          subtotalAposDescontos: totalBruto,
          valorPercentual: totalBruto * (locacao.percentualEmpresa / 100),
          totalClientePaga: locacao.formaPagamento === 'Periodo' ? (locacao.valorFixo || 0) : totalBruto * (locacao.percentualEmpresa / 100),
          valorRecebido,
          saldoDevedorGerado: Math.max(0, (locacao.formaPagamento === 'Periodo' ? (locacao.valorFixo || 0) : totalBruto * (locacao.percentualEmpresa / 100)) - valorRecebido),
          status,
          formaPagamento: locacao.formaPagamento,
        },
      })
    }
  }
  console.log('✅ Cobranças criadas')

  // Create sample notificações for admin
  const admin = await prisma.usuario.findUnique({ where: { email: 'admin@locacao.com' } })
  if (admin) {
    const notificacoes = [
      { tipo: 'cobranca_vencida', titulo: 'Cobrança Vencida', mensagem: 'A cobrança de Bar do João venceu há 5 dias.' },
      { tipo: 'info', titulo: 'Bem-vindo ao App Cobranças', mensagem: 'Sistema inicializado com sucesso. Configure suas rotas e comece a gerenciar cobranças!' },
    ]
    for (const n of notificacoes) {
      const existing = await prisma.notificacao.findFirst({ where: { titulo: n.titulo } })
      if (!existing) {
        await prisma.notificacao.create({ data: { usuarioId: admin.id, ...n } })
      }
    }
    console.log('✅ Notificações criadas')
  }

  console.log('🎉 Seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
