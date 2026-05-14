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

    // Wrap findMany + updateMany + notifications + audit in a transaction for atomicity
    const { cobrancasVencidas, result } = await db.$transaction(async (tx) => {
      // Find all pending cobranças past their due date
      const cobrancasVencidas = await tx.cobranca.findMany({
        where: {
          status: 'Pendente',
          dataVencimento: { lt: today },
          deletedAt: null,
        },
        select: { id: true, clienteId: true, clienteNome: true, produtoIdentificador: true },
      })

      if (cobrancasVencidas.length === 0) {
        return { cobrancasVencidas, result: { count: 0 } }
      }

      // Update all to Atrasado
      const result = await tx.cobranca.updateMany({
        where: {
          status: 'Pendente',
          dataVencimento: { lt: today },
          deletedAt: null,
        },
        data: { status: 'Atrasado' },
      })

      // Create notifications for admins using createMany (atomic batch insert)
      const admins = await tx.usuario.findMany({
        where: {
          tipoPermissao: 'Administrador',
          status: 'Ativo',
          deletedAt: null,
        },
        select: { id: true },
      })

      if (admins.length > 0) {
        await tx.notificacao.createMany({
          data: admins.map((admin) => ({
            usuarioId: admin.id,
            tipo: 'cobranca_vencida',
            titulo: 'Cobranças Vencidas',
            mensagem: `${result.count} cobrança(s) foram marcadas como atrasadas automaticamente.`,
          })),
        })
      }

      return { cobrancasVencidas, result }
    })

    if (cobrancasVencidas.length === 0) {
      return NextResponse.json({ updated: 0, message: 'Nenhuma cobrança vencida encontrada.' })
    }

    // Log audit (outside transaction — audit logging should not roll back the business operation)
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
