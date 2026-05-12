import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { registrarAuditoria } from '@/lib/auditoria'

export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Admin only
  if (session.tipoPermissao !== 'Admin') {
    return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { action, cobrancaIds } = body as {
      action: 'marcar-atrasado' | 'enviar-lembrete'
      cobrancaIds: string[]
    }

    if (!action || !cobrancaIds || !Array.isArray(cobrancaIds) || cobrancaIds.length === 0) {
      return NextResponse.json(
        { error: 'action e cobrancaIds são obrigatórios' },
        { status: 400 }
      )
    }

    if (action !== 'marcar-atrasado' && action !== 'enviar-lembrete') {
      return NextResponse.json(
        { error: 'Ação inválida. Use: marcar-atrasado ou enviar-lembrete' },
        { status: 400 }
      )
    }

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
    console.error('Erro na operação batch:', error)
    return NextResponse.json({ error: 'Erro ao processar operação batch' }, { status: 500 })
  }
}
