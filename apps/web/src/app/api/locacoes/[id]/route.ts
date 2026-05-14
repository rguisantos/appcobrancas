import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { requireMutationRole, requireAdmin } from '@/lib/rbac'
import { locacaoSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'
import { writeSyncLog } from '@/lib/sync-log'
import { handleApiError } from '@/lib/api-utils'

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
    return handleApiError(error, 'Erro ao buscar locação')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  const { id } = await params
  const existing = await db.locacao.findFirst({ where: { id, deletedAt: null } })
  if (!existing) return NextResponse.json({ error: 'Locação não encontrada' }, { status: 404 })

  try {
    const body = await request.json()
    const data = locacaoSchema.parse(body)
    const antes = existing as Record<string, unknown>

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

    await writeSyncLog('locacao', locacao.id, 'update', locacao as unknown as Record<string, unknown>, new Date())

    return NextResponse.json(locacao)
  } catch (error: unknown) {
    return handleApiError(error, 'Erro ao atualizar locação')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireAdmin()
  if (!authorized || !session) return response

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

  await writeSyncLog('locacao', locacao.id, 'delete', null, new Date())

  return NextResponse.json({ message: 'Locação excluída com sucesso' })
  } catch (error) {
    return handleApiError(error, 'Erro ao excluir locação')
  }
}
