import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { requireMutationRole, requireAdmin } from '@/lib/rbac'
import { manutencaoSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'
import { handleApiError } from '@/lib/api-utils'

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
    return handleApiError(error, 'Erro ao buscar manutenção')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  const { id } = await params
  const existing = await db.manutencao.findFirst({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Manutenção não encontrada' }, { status: 404 })

  try {
    const body = await request.json()
    const data = manutencaoSchema.parse(body)
    const antes = existing as Record<string, unknown>

    // Wrap update + produto status check in transaction for atomicity
    const manutencao = await db.$transaction(async (tx) => {
      const updated = await tx.manutencao.update({
        where: { id },
        data: {
          produtoId: data.produtoId,
          tipo: data.tipo,
          descricao: data.descricao,
          dataInicio: new Date(data.dataInicio),
          dataFim: data.dataFim ? new Date(data.dataFim) : undefined,
          custo: data.custo,
          status: data.status,
          observacao: data.observacao,
        },
      })

      // Se concluída ou cancelada, verificar se há outras manutenções em andamento
      if (data.status === 'Concluida' || data.status === 'Cancelada') {
        const outrasManutencoes = await tx.manutencao.count({
          where: {
            produtoId: data.produtoId,
            status: 'EmAndamento',
            id: { not: id },
          },
        })
        if (outrasManutencoes === 0) {
          await tx.produto.update({
            where: { id: data.produtoId },
            data: { statusProduto: 'Ativo' },
          })
        }
      } else if (data.status === 'EmAndamento') {
        await tx.produto.update({
          where: { id: data.produtoId },
          data: { statusProduto: 'Manutenção' },
        })
      }

      return updated
    })

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
    return handleApiError(error, 'Erro ao atualizar manutenção')
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
  const existing = await db.manutencao.findFirst({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Manutenção não encontrada' }, { status: 404 })

  // Wrap delete + produto status check in transaction for atomicity
  await db.$transaction(async (tx) => {
    await tx.manutencao.delete({ where: { id } })

    // Se estava em andamento, verificar se produto deve voltar a Ativo
    if (existing.status === 'EmAndamento') {
      const outrasManutencoes = await tx.manutencao.count({
        where: {
          produtoId: existing.produtoId,
          status: 'EmAndamento',
        },
      })
      if (outrasManutencoes === 0) {
        await tx.produto.update({
          where: { id: existing.produtoId },
          data: { statusProduto: 'Ativo' },
        })
      }
    }
  })

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
    return handleApiError(error, 'Erro ao excluir manutenção')
  }
}
