import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getNetworkStateAsync } from 'expo-network'
import { api } from '@/services/api'
import { useAuthStore } from './auth'

type SyncStatus = 'idle' | 'syncing' | 'error' | 'success'

interface SyncState {
  status: SyncStatus
  lastSyncAt: string | null
  pendingChanges: number
  error: string | null
  isOnline: boolean

  // Local change queue for offline mutations — now persisted to AsyncStorage
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
  checkConnectivity: () => Promise<void>
  startNetworkListener: (intervalMs?: number) => void
  stopNetworkListener: () => void
}

function generateSyncId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

let networkInterval: ReturnType<typeof setInterval> | null = null

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      lastSyncAt: null,
      pendingChanges: 0,
      error: null,
      isOnline: true,
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
          await get().pullChanges()
          return
        }

        set({ status: 'syncing', error: null })

        try {
          const result = await api.syncPush(
            changeQueue.map(({ id, ...rest }) => rest),
            device?.id
          )

          const acceptedIds = new Set(result.accepted.map((a) => a.entidadeId))
          set((state) => ({
            changeQueue: state.changeQueue.filter(
              (c) => !acceptedIds.has(c.entidadeId)
            ),
            pendingChanges: state.changeQueue.filter(
              (c) => !acceptedIds.has(c.entidadeId)
            ).length,
          }))

          if (result.conflicts.length > 0) {
            console.log(`${result.conflicts.length} conflict(s) resolved with server version`)
          }

          if (result.errors.length > 0) {
            console.error('Sync errors:', result.errors)
          }

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

            const totalChanges = Object.values(result.changes).reduce(
              (sum, arr) => sum + arr.length,
              0
            )
            console.log(`Pulled ${totalChanges} changes, cursor: ${cursor}`)
          }

          set({
            lastSyncAt: cursor,
            status: 'success',
            error: null,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Erro ao buscar atualizações'
          console.error('Pull error:', error)
          set({
            status: 'error',
            error: message,
          })
        }
      },

      setLastSyncAt: (date) => set({ lastSyncAt: date }),

      checkConnectivity: async () => {
        try {
          const state = await getNetworkStateAsync()
          const online = state.isConnected === true && state.isInternetReachable !== false
          set({ isOnline: online })
        } catch {
          set({ isOnline: false })
        }
      },

      startNetworkListener: (intervalMs = 5000) => {
        get().checkConnectivity()
        if (networkInterval) clearInterval(networkInterval)
        networkInterval = setInterval(() => {
          get().checkConnectivity()
        }, intervalMs)
      },

      stopNetworkListener: () => {
        if (networkInterval) {
          clearInterval(networkInterval)
          networkInterval = null
        }
      },
    }),
    {
      name: 'sync-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist changeQueue, lastSyncAt, and pendingChanges
      partialize: (state) => ({
        changeQueue: state.changeQueue,
        lastSyncAt: state.lastSyncAt,
        pendingChanges: state.pendingChanges,
      }),
    }
  )
)
