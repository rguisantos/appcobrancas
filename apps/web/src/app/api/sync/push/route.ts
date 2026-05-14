import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-jwt'
import { requireMutationRole } from '@/lib/rbac'
import {
  writeSyncLog,
  BIDI_SYNC_ENTITIES,
  getPrismaModel,
  type SyncEntity,
  type SyncOperation,
} from '@/lib/sync-log'
import { pickAllowedFields } from '@/lib/sync-allowed-fields'
import { handleApiError } from '@/lib/api-utils'
import { z } from 'zod/v4'

const pushChangeSchema = z.object({
  entidade: z.string(),
  entidadeId: z.string(),
  operacao: z.enum(['create', 'update', 'delete']),
  dados: z.record(z.string(), z.unknown()).optional(),
  updatedAt: z.string().datetime({ local: true }).or(z.string().datetime()),
})

const pushBodySchema = z.object({
  changes: z.array(pushChangeSchema).max(500),
  deviceId: z.string().optional(),
})

/**
 * POST /api/sync/push
 * Receives local changes from a mobile device and applies them using LWW.
 * All changes are wrapped in a transaction for atomicity.
 */
export async function POST(request: NextRequest) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

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

    await db.$transaction(async (tx) => {
      for (const change of changes) {
        const entidade = change.entidade as SyncEntity

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
          const txModel = (tx as Record<string, unknown>)[entidade] as {
            findUnique: (args: { where: { id: string } }) => Promise<Record<string, unknown> | null>
            create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>
            update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<Record<string, unknown>>
          }

          const clientTime = new Date(change.updatedAt).getTime()

          // Validate parsed date is not NaN
          if (Number.isNaN(clientTime)) {
            results.push({
              entidadeId: change.entidadeId,
              entidade: change.entidade,
              status: 'error',
              error: 'updatedAt inválido — deve ser data ISO 8601 válida',
            })
            continue
          }

          if (change.operacao === 'create') {
            const existing = await txModel.findUnique({
              where: { id: change.entidadeId },
            })

            if (existing) {
              const serverTime = new Date(existing.updatedAt as string | Date).getTime()
              if (clientTime > serverTime) {
                const updateData = pickAllowedFields(entidade, change.dados)
                await txModel.update({
                  where: { id: change.entidadeId },
                  data: { ...updateData, syncOrigin: deviceId || 'mobile' },
                })
                const updated = await txModel.findUnique({ where: { id: change.entidadeId } })
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
              const createData = pickAllowedFields(entidade, change.dados)
              const created = await txModel.create({
                data: {
                  id: change.entidadeId,
                  ...createData,
                  syncOrigin: deviceId || 'mobile',
                },
              })
              await writeSyncLog(entidade, String(created.id), 'create', created, new Date())
              results.push({
                entidadeId: change.entidadeId,
                entidade: change.entidade,
                status: 'applied',
                serverEntidadeId: String(created.id),
              })
            }
          } else if (change.operacao === 'update') {
            const existing = await txModel.findUnique({
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

            const serverTime = new Date(existing.updatedAt as string | Date).getTime()

            if (clientTime > serverTime) {
              const updateData = pickAllowedFields(entidade, change.dados)
              await txModel.update({
                where: { id: change.entidadeId },
                data: { ...updateData, syncOrigin: deviceId || 'mobile' },
              })
              const updated = await txModel.findUnique({ where: { id: change.entidadeId } })
              await writeSyncLog(entidade, change.entidadeId, 'update', updated, new Date())
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
          } else if (change.operacao === 'delete') {
            const existing = await txModel.findUnique({
              where: { id: change.entidadeId },
            })

            if (!existing) {
              results.push({
                entidadeId: change.entidadeId,
                entidade: change.entidade,
                status: 'applied',
              })
              continue
            }

            const serverTime = new Date(existing.updatedAt as string | Date).getTime()

            if (clientTime > serverTime) {
              await txModel.update({
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
            error: 'Erro interno ao processar alteração',
          })
        }
      }
    })

    const accepted = results.filter((r) => r.status === 'applied')
    const conflicts = results.filter((r) => r.status === 'server-wins')
    const errors = results.filter((r) => r.status === 'error')

    return NextResponse.json({ accepted, conflicts, errors })
  } catch (error) {
    return handleApiError(error, 'Erro ao processar sync push')
  }
}
