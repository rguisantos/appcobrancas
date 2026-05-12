import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import {
  writeSyncLog,
  BIDI_SYNC_ENTITIES,
  getPrismaModel,
  type SyncEntity,
  type SyncOperation,
} from '@/lib/sync-log'
import { z } from 'zod/v4'

const pushChangeSchema = z.object({
  entidade: z.string(),
  entidadeId: z.string(),
  operacao: z.enum(['create', 'update', 'delete']),
  dados: z.record(z.unknown()).optional(),
  updatedAt: z.string(), // ISO 8601
})

const pushBodySchema = z.object({
  changes: z.array(pushChangeSchema).max(500),
  deviceId: z.string().optional(),
})

/**
 * POST /api/sync/push
 * Receives local changes from a mobile device and applies them using LWW.
 */
export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { changes, deviceId } = pushBodySchema.parse(body)

    const results: Array<{
      entidadeId: string
      entidade: string
      status: 'applied' | 'server-wins' | 'error'
      serverVersion?: Record<string, unknown>
      serverEntidadeId?: string
      error?: string
    }> = []

    for (const change of changes) {
      const entidade = change.entidade as SyncEntity

      // Validate entity is syncable bidirectionally
      if (!BIDI_SYNC_ENTITIES.includes(entidade)) {
        results.push({
          entidadeId: change.entidadeId,
          entidade: change.entidade,
          status: 'error',
          error: `Entidade '${change.entidade}' nao permite sync bidirecional`,
        })
        continue
      }

      try {
        const model = getPrismaModel(entidade)
        const clientTime = new Date(change.updatedAt).getTime()

        if (change.operacao === 'create') {
          // For creates, check if record already exists (idempotency)
          const existing = await model.findUnique({
            where: { id: change.entidadeId },
          })

          if (existing) {
            // Already exists - treat as update with LWW
            const serverTime = new Date(existing.updatedAt).getTime()
            if (clientTime > serverTime) {
              const { id, createdAt, updatedAt, ...updateData } = change.dados || {}
              await model.update({
                where: { id: change.entidadeId },
                data: { ...updateData, syncOrigin: deviceId || 'mobile' },
              })
              const updated = await model.findUnique({ where: { id: change.entidadeId } })
              await writeSyncLog(entidade, change.entidadeId, 'update', updated, new Date())
              results.push({
                entidadeId: change.entidadeId,
                entidade: change.entidade,
                status: 'applied',
                serverEntidadeId: change.entidadeId,
              })
            } else {
              results.push({
                entidadeId: change.entidadeId,
                entidade: change.entidade,
                status: 'server-wins',
                serverVersion: existing,
              })
            }
          } else {
            // New record
            const { createdAt, updatedAt, ...createData } = change.dados || {}
            const created = await model.create({
              data: {
                id: change.entidadeId,
                ...createData,
                syncOrigin: deviceId || 'mobile',
              },
            })
            await writeSyncLog(entidade, created.id, 'create', created, new Date())
            results.push({
              entidadeId: change.entidadeId,
              entidade: change.entidade,
              status: 'applied',
              serverEntidadeId: created.id,
            })
          }
        } else if (change.operacao === 'update') {
          const existing = await model.findUnique({
            where: { id: change.entidadeId },
          })

          if (!existing) {
            results.push({
              entidadeId: change.entidadeId,
              entidade: change.entidade,
              status: 'error',
              error: 'Registro nao encontrado no servidor',
            })
            continue
          }

          const serverTime = new Date(existing.updatedAt).getTime()

          if (clientTime > serverTime) {
            // Client wins - apply update
            const { id, createdAt, updatedAt, ...updateData } = change.dados || {}
            await model.update({
              where: { id: change.entidadeId },
              data: { ...updateData, syncOrigin: deviceId || 'mobile' },
            })
            const updated = await model.findUnique({ where: { id: change.entidadeId } })
            await writeSyncLog(entidade, change.entidadeId, 'update', updated, new Date())
            results.push({
              entidadeId: change.entidadeId,
              entidade: change.entidade,
              status: 'applied',
            })
          } else {
            // Server wins
            results.push({
              entidadeId: change.entidadeId,
              entidade: change.entidade,
              status: 'server-wins',
              serverVersion: existing,
            })
          }
        } else if (change.operacao === 'delete') {
          const existing = await model.findUnique({
            where: { id: change.entidadeId },
          })

          if (!existing) {
            results.push({
              entidadeId: change.entidadeId,
              entidade: change.entidade,
              status: 'applied', // Already gone
            })
            continue
          }

          const serverTime = new Date(existing.updatedAt).getTime()

          if (clientTime > serverTime) {
            // Soft-delete
            await model.update({
              where: { id: change.entidadeId },
              data: { deletedAt: new Date(), syncOrigin: deviceId || 'mobile' },
            })
            await writeSyncLog(entidade, change.entidadeId, 'delete', null, new Date())
            results.push({
              entidadeId: change.entidadeId,
              entidade: change.entidade,
              status: 'applied',
            })
          } else {
            results.push({
              entidadeId: change.entidadeId,
              entidade: change.entidade,
              status: 'server-wins',
              serverVersion: existing,
            })
          }
        }
      } catch (error) {
        console.error(`Sync push error for ${change.entidade}/${change.entidadeId}:`, error)
        results.push({
          entidadeId: change.entidadeId,
          entidade: change.entidade,
          status: 'error',
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        })
      }
    }

    const accepted = results.filter((r) => r.status === 'applied')
    const conflicts = results.filter((r) => r.status === 'server-wins')
    const errors = results.filter((r) => r.status === 'error')

    return NextResponse.json({ accepted, conflicts, errors })
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: (error as { issues: unknown }).issues },
        { status: 400 }
      )
    }
    console.error('Sync push error:', error)
    return NextResponse.json({ error: 'Erro ao processar push' }, { status: 500 })
  }
}
