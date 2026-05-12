import { create } from 'zustand'
import { api } from '@/services/api'
import { useAuthStore } from './auth'

type SyncStatus = 'idle' | 'syncing' | 'error' | 'success'

interface SyncState {
  status: SyncStatus
  lastSyncAt: string | null
  pendingChanges: number
  error: string | null

  // Local change queue for offline mutations
  changeQueue: Array<{
    id: string
    entidade: string
    entidadeId: string
    operacao: 'create' | 'update' | 'delete'
    dados?: Record<string, unknown>
    updatedAt: string
  }>

  addToQueue: (change: Omit<SyncState['changeQueue'][0], 'id'>) => void
  removeFromQueue: (id: string) => void
  clearQueue: () => void
  sync: () => Promise<void>
  pullChanges: () => Promise<void>
  setLastSyncAt: (date: string) => void
}

let syncIdCounter = 0
function generateSyncId(): string {
  syncIdCounter++
  return `sync_${Date.now()}_${syncIdCounter}`
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'idle',
  lastSyncAt: null,
  pendingChanges: 0,
  error: null,
  changeQueue: [],

  addToQueue: (change) => {
    const entry = { ...change, id: generateSyncId() }
    set((state) => ({
      changeQueue: [...state.changeQueue, entry],
      pendingChanges: state.pendingChanges + 1,
    }))
  },

  removeFromQueue: (id) => {
    set((state) => ({
      changeQueue: state.changeQueue.filter((c) => c.id !== id),
      pendingChanges: Math.max(0, state.pendingChanges - 1),
    }))
  },

  clearQueue: () => {
    set({ changeQueue: [], pendingChanges: 0 })
  },

  sync: async () => {
    const { changeQueue } = get()
    const device = useAuthStore.getState().device

    if (changeQueue.length === 0) {
      // Nothing to push, just pull
      await get().pullChanges()
      return
    }

    set({ status: 'syncing', error: null })

    try {
      // Push local changes
      const result = await api.syncPush(
        changeQueue.map(({ id, ...rest }) => rest),
        device?.id
      )

      // Remove accepted changes from queue
      const acceptedIds = new Set(result.accepted.map((a) => a.entidadeId))
      set((state) => ({
        changeQueue: state.changeQueue.filter(
          (c) => !acceptedIds.has(c.entidadeId)
        ),
        pendingChanges: state.changeQueue.filter(
          (c) => !acceptedIds.has(c.entidadeId)
        ).length,
      }))

      // Handle conflicts: server-wins means we accept server version
      // In a full implementation, this would update local SQLite
      if (result.conflicts.length > 0) {
        console.log(`${result.conflicts.length} conflict(s) resolved with server version`)
      }

      if (result.errors.length > 0) {
        console.error('Sync errors:', result.errors)
      }

      // Now pull server changes
      await get().pullChanges()

      set({ status: 'success' })
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro de sincronizacao',
      })
    }
  },

  pullChanges: async () => {
    const { lastSyncAt } = get()
    const device = useAuthStore.getState().device
    const since = lastSyncAt || '2000-01-01T00:00:00Z'

    try {
      let hasMore = true
      let cursor = since

      while (hasMore) {
        const result = await api.syncPull(cursor, undefined, device?.id)
        hasMore = result.hasMore
        cursor = result.cursor

        // In a full implementation, this would apply changes to local SQLite/WatermelonDB
        // For now, we just update the cursor
        const totalChanges = Object.values(result.changes).reduce(
          (sum, arr) => sum + arr.length,
          0
        )
        console.log(`Pulled ${totalChanges} changes, cursor: ${cursor}`)
      }

      set({
        lastSyncAt: cursor,
        status: 'success',
      })
    } catch (error) {
      console.error('Pull error:', error)
    }
  },

  setLastSyncAt: (date) => set({ lastSyncAt: date }),
}))
