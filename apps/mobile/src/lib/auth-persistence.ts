import * as SecureStore from 'expo-secure-store'
import { useAuthStore } from '@/store/auth'

const AUTH_KEY = 'auth_data'

interface PersistedAuth {
  token: string
  user: {
    id: string
    nome: string
    email: string
    tipoPermissao: string
    permissoesMobile: Record<string, boolean>
    rotasPermitidas: string[]
  }
  device: {
    id: string
    nome: string
    rotasPermitidas: string[]
  } | null
}

/**
 * Persist auth data to SecureStore.
 * Called after successful login.
 */
export async function persistAuth(data: PersistedAuth): Promise<void> {
  try {
    await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to persist auth:', error)
  }
}

/**
 * Restore auth from SecureStore on app launch.
 * Updates the Zustand auth store if a valid session exists.
 */
export async function restoreAuth(): Promise<void> {
  try {
    const stored = await SecureStore.getItemAsync(AUTH_KEY)
    if (!stored) {
      useAuthStore.getState().setLoading(false)
      return
    }

    const data: PersistedAuth = JSON.parse(stored)
    if (data.token && data.user) {
      useAuthStore.getState().setAuth(data.user, data.device, data.token)
    } else {
      useAuthStore.getState().setLoading(false)
    }
  } catch (error) {
    console.error('Failed to restore auth:', error)
    useAuthStore.getState().setLoading(false)
  }
}

/**
 * Clear persisted auth data.
 * Called on logout.
 */
export async function clearPersistedAuth(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(AUTH_KEY)
  } catch (error) {
    console.error('Failed to clear auth:', error)
  }
}
