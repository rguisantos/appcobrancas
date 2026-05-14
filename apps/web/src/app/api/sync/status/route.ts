import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { handleApiError } from '@/lib/api-utils'

/**
 * GET /api/sync/status?deviceId=xxx
 * Returns the sync status for a device: cursors per entity and pending changes.
 */
export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  try {
    const deviceId = request.nextUrl.searchParams.get('deviceId')

    if (!deviceId) {
      return NextResponse.json({ error: 'Parametro "deviceId" e obrigatorio' }, { status: 400 })
    }

    const dispositivo = await db.dispositivo.findUnique({
      where: { id: deviceId },
      include: { syncCursors: true },
    })

    if (!dispositivo) {
      return NextResponse.json({ error: 'Dispositivo nao encontrado' }, { status: 404 })
    }

    // Build cursors map
    const cursors: Record<string, string> = {}
    for (const cursor of dispositivo.syncCursors) {
      cursors[cursor.entidade] = cursor.lastSyncAt.toISOString()
    }

    // Count pending changes (changes on server since device's last sync)
    let pendingChanges = 0
    for (const cursor of dispositivo.syncCursors) {
      const count = await db.syncLog.count({
        where: {
          entidade: cursor.entidade,
          updatedAt: { gt: cursor.lastSyncAt },
        },
      })
      pendingChanges += count
    }

    return NextResponse.json({
      deviceId: dispositivo.id,
      deviceName: dispositivo.nome,
      ativo: dispositivo.ativo,
      ultimoSync: dispositivo.ultimoSync?.toISOString() || null,
      cursors,
      pendingChanges,
    })
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar status de sync')
  }
}
