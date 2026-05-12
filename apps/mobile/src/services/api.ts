import { API_BASE_URL } from '@/lib/config'
import { useAuthStore } from '@/store/auth'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  params?: Record<string, string>
  headers?: Record<string, string>
}

class ApiService {
  private baseUrl: string

  constructor() {
    this.baseUrl = API_BASE_URL
  }

  private getToken(): string | null {
    return useAuthStore.getState().token
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(path, this.baseUrl)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value)
      })
    }
    return url.toString()
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params, headers = {} } = options
    const token = this.getToken()

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`
    }

    const url = this.buildUrl(path, params)

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (response.status === 401) {
      // Token expired or invalid
      useAuthStore.getState().logout()
      throw new Error('Sessao expirada')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
      throw new Error(error.error || `Erro HTTP ${response.status}`)
    }

    return response.json()
  }

  // Auth
  async deviceLogin(deviceKey: string, senha: string) {
    return this.request<{
      token: string
      expiresIn: number
      device: { id: string; nome: string; rotasPermitidas: string[] }
      user: {
        id: string
        nome: string
        email: string
        tipoPermissao: string
        permissoesMobile: Record<string, boolean>
        rotasPermitidas: string[]
      } | null
    }>('/api/auth/device-login', {
      method: 'POST',
      body: { deviceKey, senha },
    })
  }

  async userLogin(email: string, senha: string) {
    return this.request<{
      token: string
      user: {
        id: string
        nome: string
        email: string
        tipoPermissao: string
        permissoesWeb: Record<string, boolean>
        rotasPermitidas: string[]
      }
    }>('/api/auth/login', {
      method: 'POST',
      body: { email, senha },
    })
  }

  // Clientes
  async getClientes(params?: { page?: string; limit?: string; search?: string; rotaId?: string }) {
    return this.request<{
      data: import('@/types/models').Cliente[]
      total: number
      page: number
      totalPages: number
    }>('/api/clientes', { params })
  }

  async getCliente(id: string) {
    return this.request<import('@/types/models').Cliente>(`/api/clientes/${id}`)
  }

  async createCliente(data: Partial<import('@/types/models').Cliente>) {
    return this.request<import('@/types/models').Cliente>('/api/clientes', {
      method: 'POST',
      body: data,
    })
  }

  async updateCliente(id: string, data: Partial<import('@/types/models').Cliente>) {
    return this.request<import('@/types/models').Cliente>(`/api/clientes/${id}`, {
      method: 'PUT',
      body: data,
    })
  }

  // Produtos
  async getProdutos(params?: { page?: string; limit?: string; search?: string }) {
    return this.request<{
      data: import('@/types/models').Produto[]
      total: number
      page: number
      totalPages: number
    }>('/api/produtos', { params })
  }

  async getProduto(id: string) {
    return this.request<import('@/types/models').Produto>(`/api/produtos/${id}`)
  }

  // Locacoes
  async getLocacoes(params?: { page?: string; limit?: string; clienteId?: string }) {
    return this.request<{
      data: import('@/types/models').Locacao[]
      total: number
      page: number
      totalPages: number
    }>('/api/locacoes', { params })
  }

  async getLocacao(id: string) {
    return this.request<import('@/types/models').Locacao>(`/api/locacoes/${id}`)
  }

  // Cobrancas
  async getCobrancas(params?: {
    page?: string
    limit?: string
    status?: string
    clienteId?: string
    locacaoId?: string
  }) {
    return this.request<{
      data: import('@/types/models').Cobranca[]
      total: number
      page: number
      totalPages: number
    }>('/api/cobrancas', { params })
  }

  async getCobranca(id: string) {
    return this.request<import('@/types/models').Cobranca>(`/api/cobrancas/${id}`)
  }

  async createCobranca(data: Record<string, unknown>) {
    return this.request<import('@/types/models').Cobranca>('/api/cobrancas', {
      method: 'POST',
      body: data,
    })
  }

  // Rotas
  async getRotas() {
    return this.request<{
      data: import('@/types/models').Rota[]
      total: number
    }>('/api/rotas')
  }

  // Reference data
  async getTiposProduto() {
    return this.request<import('@/types/models').TipoProduto[]>('/api/tipos-produto')
  }

  async getDescricoesProduto() {
    return this.request<import('@/types/models').DescricaoProduto[]>('/api/descricoes-produto')
  }

  async getTamanhosProduto() {
    return this.request<import('@/types/models').TamanhoProduto[]>('/api/tamanhos-produto')
  }

  // Manutencoes
  async getManutencoes(params?: { page?: string; limit?: string; produtoId?: string }) {
    return this.request<{
      data: import('@/types/models').Manutencao[]
      total: number
    }>('/api/manutencoes', { params })
  }

  // Historico Relogio
  async getHistoricoRelogio(params?: { produtoId?: string }) {
    return this.request<{
      data: import('@/types/models').HistoricoRelogio[]
      total: number
    }>('/api/historico-relogio', { params })
  }

  async createHistoricoRelogio(data: Record<string, unknown>) {
    return this.request<import('@/types/models').HistoricoRelogio>('/api/historico-relogio', {
      method: 'POST',
      body: data,
    })
  }

  // Dashboard
  async getDashboard() {
    return this.request<Record<string, unknown>>('/api/dashboard')
  }

  // Sync
  async syncPush(changes: Array<{
    entidade: string
    entidadeId: string
    operacao: 'create' | 'update' | 'delete'
    dados?: Record<string, unknown>
    updatedAt: string
  }>, deviceId?: string) {
    return this.request<{
      accepted: Array<{ entidadeId: string; status: string; serverEntidadeId?: string }>
      conflicts: Array<{ entidadeId: string; status: string; serverVersion: Record<string, unknown> }>
      errors: Array<{ entidadeId: string; status: string; error: string }>
    }>('/api/sync/push', {
      method: 'POST',
      body: { changes, deviceId },
    })
  }

  async syncPull(since: string, entities?: string[], deviceId?: string) {
    const params: Record<string, string> = { since }
    if (entities) params.entities = entities.join(',')
    if (deviceId) params.deviceId = deviceId
    return this.request<{
      changes: Record<string, Array<Record<string, unknown>>>
      cursor: string
      hasMore: boolean
    }>('/api/sync/pull', { params })
  }

  async syncStatus(deviceId: string) {
    return this.request<{
      deviceId: string
      deviceName: string
      ativo: boolean
      ultimoSync: string | null
      cursors: Record<string, string>
      pendingChanges: number
    }>('/api/sync/status', { params: { deviceId } })
  }
}

export const api = new ApiService()
