import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { requireMutationRole, requireAdmin } from '@/lib/rbac'
import { historicoRelogioSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'
import { handleApiError } from '@/lib/api-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  const { id } = await params
  const existing = await db.historicoRelogio.findFirst({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Histórico de relógio não encontrado' }, { status: 404 })

  try {
    const body = await request.json()
    const data = historicoRelogioSchema.parse(body)
    const antes = existing as Record<string, unknown>

    const historico = await db.historicoRelogio.update({
      where: { id },
      data: {
        produtoId: data.produtoId,
        relogioAnterior: data.relogioAnterior,
        relogioNovo: data.relogioNovo,
        motivo: data.motivo,
        observacao: data.observacao,
      },
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'atualizar_historico_relogio',
      entidade: 'historico_relogio',
      entidadeId: historico.id,
      entidadeNome: `Produto: ${data.produtoId} - De ${data.relogioAnterior} para ${data.relogioNovo}`,
      antes,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    return NextResponse.json(historico)
  } catch (error: unknown) {
    return handleApiError(error, 'Erro ao atualizar histórico de relógio')
  }
}
