import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/rbac'
import { registrarAuditoria } from '@/lib/auditoria'
import { checkRateLimit } from '@/lib/rate-limit'
import { handleApiError } from '@/lib/api-utils'
import { z } from 'zod/v4'

const batchSchema = z.object({
  action: z.enum(['marcar-atrasado', 'enviar-lembrete']),
  cobrancaIds: z.array(z.string().min(1)).min(1, 'Pelo menos uma cobrança é obrigatória').max(100, 'Máximo de 100 cobranças por operação'),
})

export async function POST(request: NextRequest) {
  const { authorized, response, session } = await requireAdmin()
  if (!authorized || !session) return response

  // Rate limit: 20 batch operations per 15 minutes per user
  const rateLimit = checkRateLimit(`batch-cobrancas-${session.userId}`, 20, 15 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Muitas operações batch. Tente novamente em alguns minutos.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimit.resetAtMs - Date.now()) / 1000)) } }
    )
  }

  try {
    const body = await request.json()
    const { action, cobrancaIds } = batchSchema.parse(body)

    if (action === 'marcar-atrasado') {
      // Update all specified cobranças with status 'Pendente' to 'Atrasado'
      const result = await db.cobranca.updateMany({
        where: {
          id: { in: cobrancaIds },
          status: 'Pendente',
          deletedAt: null,
        },
        data: {
          status: 'Atrasado',
        },
      })

      await registrarAuditoria({
        usuarioId: session.userId,
        acao: 'batch_marcar_atrasado',
        entidade: 'cobranca',
        entidadeNome: `Batch: ${cobrancaIds.length} cobrança(s)`,
        detalhes: {
          action: 'marcar-atrasado',
          cobrancaIds,
          updatedCount: result.count,
        },
        severidade: 'aviso',
        origem: 'web',
      })

      return NextResponse.json({ updated: result.count })
    }

    if (action === 'enviar-lembrete') {
      // Log that reminders would be sent (no actual email configured)
      console.log(
        `[BATCH LEITOS] Lembretes seriam enviados para ${cobrancaIds.length} cobrança(s):`,
        cobrancaIds
      )

      await registrarAuditoria({
        usuarioId: session.userId,
        acao: 'batch_enviar_lembrete',
        entidade: 'cobranca',
        entidadeNome: `Batch: ${cobrancaIds.length} cobrança(s)`,
        detalhes: {
          action: 'enviar-lembrete',
          cobrancaIds,
          note: 'Lembretes simulados (sem serviço de e-mail configurado)',
        },
        severidade: 'info',
        origem: 'web',
      })

      return NextResponse.json({ updated: cobrancaIds.length })
    }

    return NextResponse.json({ updated: 0 })
  } catch (error) {
    return handleApiError(error, 'Erro na operação batch de cobranças')
  }
}
