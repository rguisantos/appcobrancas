import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { manutencaoSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const { id } = await params
  const manutencao = await db.manutencao.findFirst({
    where: { id },
    include: { produto: true },
  })

  if (!manutencao) return NextResponse.json({ error: 'Manutenção não encontrada' }, { status: 404 })
  return NextResponse.json(manutencao)
  } catch (error) {
    console.error('Erro ao buscar manutenção:', error)
    return NextResponse.json({ error: 'Erro ao buscar manutenção' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const existing = await db.manutencao.findFirst({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Manutenção não encontrada' }, { status: 404 })

  try {
    const body = await request.json()
    const data = manutencaoSchema.parse(body)
    const antes = existing as Record<string, unknown>

    const manutencao = await db.manutencao.update({
      where: { id },
      data: {
        produtoId: data.produtoId,
        tipo: data.tipo,
        descricao: data.descricao,
        dataInicio: data.dataInicio,
        dataFim: data.dataFim,
        custo: data.custo,
        status: data.status,
        observacao: data.observacao,
      },
    })

    // Se concluída ou cancelada, verificar se há outras manutenções em andamento
    if (data.status === 'Concluida' || data.status === 'Cancelada') {
      const outrasManutencoes = await db.manutencao.count({
        where: {
          produtoId: data.produtoId,
          status: 'EmAndamento',
          id: { not: id },
        },
      })
      if (outrasManutencoes === 0) {
        await db.produto.update({
          where: { id: data.produtoId },
          data: { statusProduto: 'Ativo' },
        })
      }
    } else if (data.status === 'EmAndamento') {
      await db.produto.update({
        where: { id: data.produtoId },
        data: { statusProduto: 'Manutenção' },
      })
    }

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'atualizar_manutencao',
      entidade: 'manutencao',
      entidadeId: manutencao.id,
      entidadeNome: `${existing.produtoIdentificador} - ${data.tipo}`,
      antes,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    return NextResponse.json(manutencao)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar manutenção' }, { status: 500 })
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
  const existing = await db.manutencao.findFirst({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Manutenção não encontrada' }, { status: 404 })

  await db.manutencao.delete({ where: { id } })

  // Se estava em andamento, verificar se produto deve voltar a Ativo
  if (existing.status === 'EmAndamento') {
    const outrasManutencoes = await db.manutencao.count({
      where: {
        produtoId: existing.produtoId,
        status: 'EmAndamento',
      },
    })
    if (outrasManutencoes === 0) {
      await db.produto.update({
        where: { id: existing.produtoId },
        data: { statusProduto: 'Ativo' },
      })
    }
  }

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: 'excluir_manutencao',
    entidade: 'manutencao',
    entidadeId: id,
    entidadeNome: `${existing.produtoIdentificador} - ${existing.tipo}`,
    antes: existing as Record<string, unknown>,
    severidade: 'aviso',
  })

  return NextResponse.json({ message: 'Manutenção excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir manutenção:', error)
    return NextResponse.json({ error: 'Erro ao excluir manutenção' }, { status: 500 })
  }
}
