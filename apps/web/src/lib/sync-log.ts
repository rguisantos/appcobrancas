import { db } from './db'

/**
 * Syncable entity names matching Prisma model names (lowercase).
 */
export type SyncEntity =
  | 'rota'
  | 'cliente'
  | 'tipoProduto'
  | 'descricaoProduto'
  | 'tamanhoProduto'
  | 'produto'
  | 'estabelecimento'
  | 'locacao'
  | 'cobranca'
  | 'pagamentoCobranca'
  | 'historicoRelogio'
  | 'manutencao'

export type SyncOperation = 'create' | 'update' | 'delete'

/**
 * Write a sync log entry. Called after every mutation on syncable entities.
 */
export async function writeSyncLog(
  entidade: SyncEntity,
  entidadeId: string,
  operacao: SyncOperation,
  dados: Record<string, unknown> | null,
  updatedAt: Date
) {
  try {
    await db.syncLog.create({
      data: {
        entidade,
        entidadeId,
        operacao,
        dados: dados ? JSON.stringify(dados) : null,
        updatedAt,
      },
    })
  } catch (error) {
    // Sync log failures should not break the main operation
    console.error('Failed to write sync log:', error)
  }
}

/**
 * Entities that sync bidirectionally (mobile can create/update).
 */
export const BIDI_SYNC_ENTITIES: SyncEntity[] = [
  'cliente',
  'produto',
  'locacao',
  'cobranca',
  'pagamentoCobranca',
  'historicoRelogio',
  'manutencao',
]

/**
 * Entities that sync server-to-mobile only (read-only on mobile).
 */
export const READONLY_SYNC_ENTITIES: SyncEntity[] = [
  'rota',
  'tipoProduto',
  'descricaoProduto',
  'tamanhoProduto',
  'estabelecimento',
]

/**
 * All syncable entities.
 */
export const ALL_SYNC_ENTITIES: SyncEntity[] = [
  ...BIDI_SYNC_ENTITIES,
  ...READONLY_SYNC_ENTITIES,
]

/**
 * Map entity name to the Prisma model accessor.
 */
export function getPrismaModel(entidade: SyncEntity) {
  const map: Record<SyncEntity, unknown> = {
    rota: db.rota,
    cliente: db.cliente,
    tipoProduto: db.tipoProduto,
    descricaoProduto: db.descricaoProduto,
    tamanhoProduto: db.tamanhoProduto,
    produto: db.produto,
    estabelecimento: db.estabelecimento,
    locacao: db.locacao,
    cobranca: db.cobranca,
    pagamentoCobranca: db.pagamentoCobranca,
    historicoRelogio: db.historicoRelogio,
    manutencao: db.manutencao,
  }
  return map[entidade] as any // eslint-disable-line @typescript-eslint/no-explicit-any
}
