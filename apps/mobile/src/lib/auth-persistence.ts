import * as SecureStore from 'expo-secure-store'
import { useAuthStore } from '@/store/auth'

const AUTH_KEY = 'auth_data'

interface PersistedAuth {
  token: string
  expiresAt: number | null // Unix timestamp in milliseconds
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

// JWT tokens expire in 7 days (604800 seconds)
const TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Persist auth data to SecureStore.
 * Called after successful login.
 */
export async function persistAuth(data: PersistedAuth & { expiresIn?: number }): Promise<void> {
  try {
    const expiresAt = data.expiresAt || (Date.now() + (data.expiresIn ? data.expiresIn * 1000 : TOKEN_LIFETIME_MS))
    const toStore = { ...data, expiresAt }
    await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(toStore))
  } catch (error) {
    console.error('Failed to persist auth:', error)
  }
}

/**
 * Restore auth from SecureStore on app launch.
 * Updates the Zustand auth store if a valid session exists.
 * Checks token expiry — clears auth if expired.
 */
export async function restoreAuth(): Promise<void> {
  try {
    const stored = await SecureStore.getItemAsync(AUTH_KEY)
    if (!stored) {
      useAuthStore.getState().setLoading(false)
      return
    }

    const data: PersistedAuth = JSON.parse(stored)
    
    // Check if token is expired
    if (data.expiresAt && Date.now() > data.expiresAt) {
      // Token expired — clear persisted auth and show login
      await clearPersistedAuth()
      useAuthStore.getState().setLoading(false)
      return
    }

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
