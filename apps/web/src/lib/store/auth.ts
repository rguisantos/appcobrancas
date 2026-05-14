import { create } from 'zustand'

interface User {
  id: string
  nome: string
  email: string
  tipoPermissao: string
  permissoesWeb: Record<string, boolean>
  rotasPermitidas: string[]
  createdAt?: string
  dataUltimoAcesso?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, senha: string) => Promise<boolean>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  clearError: () => void
}

// Guard to prevent concurrent login attempts
let isLoggingIn = false

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, senha: string) => {
    // Prevent concurrent login calls (e.g., double-click)
    if (isLoggingIn) return false
    isLoggingIn = true

    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        set({ isLoading: false, error: data.error || 'Erro ao fazer login' })
        return false
      }
      const data = await res.json()
      set({ user: data.user, isAuthenticated: true, isLoading: false, error: null })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro de conexão'
      set({ isLoading: false, error: message })
      return false
    } finally {
      isLoggingIn = false
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      set({ user: null, isAuthenticated: false, error: null })
    }
  },

  checkAuth: async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) {
        set({ user: null, isAuthenticated: false, isLoading: false, error: null })
        return
      }
      const data = await res.json()
      set({ user: data.user, isAuthenticated: true, isLoading: false, error: null })
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false, error: null })
    }
  },

  clearError: () => set({ error: null }),
}))
