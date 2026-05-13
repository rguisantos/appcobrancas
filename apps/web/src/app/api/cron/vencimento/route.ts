import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { registrarAuditoria } from '@/lib/auditoria'
import { timingSafeEqual } from 'crypto'

/** Timing-safe string comparison to prevent timing attacks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession()

  // Allow either authenticated admin or cron secret
  const cronSecret = request.headers.get('x-cron-secret')
  const isCronAuthorized = process.env.CRON_SECRET && cronSecret
    ? safeEqual(cronSecret, process.env.CRON_SECRET)
    : false

  if (!session && !isCronAuthorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // If session exists but not admin, check permission
  if (session && session.tipoPermissao !== 'Administrador' && !isCronAuthorized) {
    return NextResponse.json({ error: 'Permissão negada. Apenas administradores podem executar esta ação.' }, { status: 403 })
  }

  try {
    const today = new Date()

    // Find all pending cobranças past their due date
    const cobrancasVencidas = await db.cobranca.findMany({
      where: {
        status: 'Pendente',
        dataVencimento: { lt: today },
        deletedAt: null,
      },
      select: { id: true, clienteId: true, clienteNome: true, produtoIdentificador: true },
    })

    if (cobrancasVencidas.length === 0) {
      return NextResponse.json({ updated: 0, message: 'Nenhuma cobrança vencida encontrada.' })
    }

    // Update all to Atrasado
    const result = await db.cobranca.updateMany({
      where: {
        status: 'Pendente',
        dataVencimento: { lt: today },
        deletedAt: null,
      },
      data: { status: 'Atrasado' },
    })

    // Create notifications for admins
    const admins = await db.usuario.findMany({
      where: {
        tipoPermissao: 'Administrador',
        status: 'Ativo',
        deletedAt: null,
      },
      select: { id: true },
    })

    for (const admin of admins) {
      await db.notificacao.create({
        data: {
          usuarioId: admin.id,
          tipo: 'cobranca_vencida',
          titulo: 'Cobranças Vencidas',
          mensagem: `${result.count} cobrança(s) foram marcadas como atrasadas automaticamente.`,
        },
      })
    }

    // Log audit
    await registrarAuditoria({
      usuarioId: session?.userId || undefined,
      acao: 'cron_vencimento',
      entidade: 'cobranca',
      detalhes: {
        count: result.count,
        cobrancaIds: cobrancasVencidas.map((c) => c.id),
        executedAt: today,
      },
      origem: 'cron',
      severidade: 'info',
    })

    return NextResponse.json({
      updated: result.count,
      message: `${result.count} cobrança(s) marcada(s) como atrasada(s).`,
      cobrancas: cobrancasVencidas.map((c) => ({
        id: c.id,
        cliente: c.clienteNome,
        produto: c.produtoIdentificador,
      })),
    })
  } catch (error) {
    console.error('Erro ao processar vencimentos:', error)
    return NextResponse.json({ error: 'Erro ao processar vencimentos' }, { status: 500 })
  }
}
