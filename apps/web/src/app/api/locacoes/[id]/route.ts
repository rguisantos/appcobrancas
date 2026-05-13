import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { locacaoSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const { id } = await params
  const locacao = await db.locacao.findFirst({
    where: { id, deletedAt: null },
    include: { cliente: true, produto: true, cobrancas: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } } },
  })

  if (!locacao) return NextResponse.json({ error: 'Locação não encontrada' }, { status: 404 })
  return NextResponse.json(locacao)
  } catch (error) {
    console.error('Erro ao buscar locação:', error)
    return NextResponse.json({ error: 'Erro ao buscar locação' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const existing = await db.locacao.findFirst({ where: { id, deletedAt: null } })
  if (!existing) return NextResponse.json({ error: 'Locação não encontrada' }, { status: 404 })

  try {
    const body = await request.json()
    const data = locacaoSchema.parse(body)
    const antes = existing as Record<string, unknown>

    // Buscar dados do cliente e produto para campos denormalizados
    const [cliente, produto] = await Promise.all([
      db.cliente.findFirst({ where: { id: data.clienteId, deletedAt: null } }),
      db.produto.findFirst({ where: { id: data.produtoId, deletedAt: null } }),
    ])

    if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 400 })
    if (!produto) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 400 })

    const locacao = await db.locacao.update({
      where: { id },
      data: {
        clienteId: data.clienteId,
        clienteNome: cliente.nomeExibicao,
        produtoId: data.produtoId,
        produtoIdentificador: produto.identificador,
        produtoTipo: produto.tipoNome,
        dataLocacao: new Date(data.dataLocacao),
        dataFim: data.dataFim ? new Date(data.dataFim) : undefined,
        formaPagamento: data.formaPagamento,
        numeroRelogio: data.numeroRelogio,
        precoFicha: data.precoFicha,
        percentualEmpresa: data.percentualEmpresa,
        percentualCliente: data.percentualCliente,
        valorFixo: data.valorFixo,
        periodicidade: data.periodicidade,
        dataPrimeiraCobranca: data.dataPrimeiraCobranca ? new Date(data.dataPrimeiraCobranca) : undefined,
        observacoes: data.observacoes,
        trocaPano: data.trocaPano,
        version: { increment: 1 },
      },
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'atualizar_locacao',
      entidade: 'locacao',
      entidadeId: locacao.id,
      entidadeNome: `${cliente.nomeExibicao} - ${produto.identificador}`,
      antes,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    return NextResponse.json(locacao)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar locação' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const { id } = await params
  const existing = await db.locacao.findFirst({ where: { id, deletedAt: null } })
  if (!existing) return NextResponse.json({ error: 'Locação não encontrada' }, { status: 404 })

  const locacao = await db.locacao.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: 'excluir_locacao',
    entidade: 'locacao',
    entidadeId: locacao.id,
    entidadeNome: `${existing.clienteNome} - ${existing.produtoIdentificador}`,
    antes: existing as Record<string, unknown>,
    severidade: 'aviso',
  })

  return NextResponse.json({ message: 'Locação excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir locação:', error)
    return NextResponse.json({ error: 'Erro ao excluir locação' }, { status: 500 })
  }
}
