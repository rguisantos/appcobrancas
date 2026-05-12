import { create } from 'zustand'

interface User {
  id: string
  nome: string
  email: string
  tipoPermissao: string
  permissoesMobile: Record<string, boolean>
  rotasPermitidas: string[]
}

interface Device {
  id: string
  nome: string
  rotasPermitidas: string[]
}

interface AuthState {
  user: User | null
  device: Device | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean

  setAuth: (user: User | null, device: Device | null, token: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void

  // Permission helpers
  hasPermission: (permission: string) => boolean
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  device: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, device, token) => {
    set({
      user,
      device,
      token,
      isAuthenticated: true,
      isLoading: false,
    })
  },

  logout: () => {
    set({
      user: null,
      device: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    })
  },

  setLoading: (loading) => set({ isLoading: loading }),

  hasPermission: (permission: string) => {
    const { user } = get()
    if (!user) return false
    if (user.tipoPermissao === 'Administrador') return true
    return user.permissoesMobile?.[permission] === true
  },

  isAdmin: () => {
    const { user } = get()
    return user?.tipoPermissao === 'Administrador'
  },
}))
