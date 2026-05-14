import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import {
  ALL_SYNC_ENTITIES,
  type SyncEntity,
} from '@/lib/sync-log'
import { handleApiError } from '@/lib/api-utils'

const PAGE_SIZE = 1000

/**
 * GET /api/sync/pull?since=ISO_DATE&entities=cliente,cobranca&deviceId=xxx
 * Returns changes from the SyncLog since the given cursor.
 * Results are scoped by the device's rotasPermitidas.
 */
export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const since = searchParams.get('since')
    const entitiesParam = searchParams.get('entities')
    const deviceId = searchParams.get('deviceId')

    if (!since) {
      return NextResponse.json({ error: 'Parametro "since" e obrigatorio' }, { status: 400 })
    }

    const sinceDate = new Date(since)
    if (isNaN(sinceDate.getTime())) {
      return NextResponse.json({ error: 'Parametro "since" invalido' }, { status: 400 })
    }

    // Determine which entities to pull
    let requestedEntities: SyncEntity[]
    if (entitiesParam) {
      requestedEntities = entitiesParam.split(',').filter(
        (e) => ALL_SYNC_ENTITIES.includes(e as SyncEntity)
      ) as SyncEntity[]
    } else {
      requestedEntities = [...ALL_SYNC_ENTITIES]
    }

    if (requestedEntities.length === 0) {
      return NextResponse.json({ error: 'Nenhuma entidade valida informada' }, { status: 400 })
    }

    // Determine rota scoping
    let allowedRotaIds: string[] | null = null
    if (deviceId) {
      const dispositivo = await db.dispositivo.findUnique({
        where: { id: deviceId },
      })
      if (dispositivo) {
        const rotas = (dispositivo.rotasPermitidas as string[]) || []
        if (rotas.length > 0) {
          allowedRotaIds = rotas
        }
      }
    }
    // Also check user-level rota permissions
    if (!allowedRotaIds && session.rotasPermitidas && session.rotasPermitidas.length > 0) {
      allowedRotaIds = session.rotasPermitidas
    }

    // Query SyncLog for changes after the cursor
    const syncLogs = await db.syncLog.findMany({
      where: {
        entidade: { in: requestedEntities },
        updatedAt: { gt: sinceDate },
      },
      orderBy: { updatedAt: 'asc' },
      take: PAGE_SIZE + 1, // Fetch one extra to detect hasMore
    })

    const hasMore = syncLogs.length > PAGE_SIZE
    const logsToReturn = hasMore ? syncLogs.slice(0, PAGE_SIZE) : syncLogs

    // Group changes by entity
    const changes: Record<string, Array<{
      id: string
      _operacao: 'upsert' | 'delete'
      _updatedAt: string
      [key: string]: unknown
    }>> = {}

    for (const entity of requestedEntities) {
      changes[entity] = []
    }

    for (const log of logsToReturn) {
      const entidade = log.entidade as SyncEntity
      if (!changes[entidade]) continue

      if (log.operacao === 'delete') {
        changes[entidade].push({
          id: log.entidadeId,
          _operacao: 'delete',
          _updatedAt: log.updatedAt.toISOString(),
        })
      } else {
        // Parse the stored record data
        let record: Record<string, unknown> = { id: log.entidadeId }
        if (log.dados) {
          record = log.dados as Record<string, unknown>
        }

        // Apply rota scoping for cliente-related entities
        if (allowedRotaIds) {
          if (entidade === 'cliente' && record.rotaId && !allowedRotaIds.includes(record.rotaId as string)) {
            continue // Skip clients not in allowed rotas
          }
          // For locacao/cobranca, check via clienteId relationship at sync time
          // (the mobile app will handle filtering based on its local client set)
        }

        changes[entidade].push({
          ...record,
          id: log.entidadeId,
          _operacao: 'upsert',
          _updatedAt: log.updatedAt.toISOString(),
        })
      }
    }

    // Calculate new cursor
    const cursor = logsToReturn.length > 0
      ? logsToReturn[logsToReturn.length - 1].updatedAt.toISOString()
      : since

    // Update device sync cursor if deviceId provided
    if (deviceId && !hasMore) {
      for (const entidade of requestedEntities) {
        await db.deviceSyncCursor.upsert({
          where: {
            dispositivoId_entidade: {
              dispositivoId: deviceId,
              entidade,
            },
          },
          update: { lastSyncAt: new Date(cursor) },
          create: {
            dispositivoId: deviceId,
            entidade,
            lastSyncAt: new Date(cursor),
          },
        })
      }

      // Update device last sync
      await db.dispositivo.update({
        where: { id: deviceId },
        data: { ultimoSync: new Date() },
      })
    }

    return NextResponse.json({
      changes,
      cursor,
      hasMore,
    })
  } catch (error) {
    return handleApiError(error, 'Erro ao processar sync pull')
  }
}
