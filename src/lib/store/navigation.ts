import { create } from 'zustand'

export type ViewType =
  | 'dashboard'
  | 'clientes'
  | 'cliente-novo'
  | 'cliente-detalhe'
  | 'cliente-editar'
  | 'produtos'
  | 'produto-novo'
  | 'produto-detalhe'
  | 'produto-editar'
  | 'locacoes'
  | 'locacao-nova'
  | 'locacao-detalhe'
  | 'locacao-editar'
  | 'cobrancas'
  | 'cobranca-nova'
  | 'cobranca-detalhe'
  | 'cobranca-editar'
  | 'relatorios'
  | 'mapa'
  | 'agenda'
  | 'manutencoes'
  | 'manutencao-nova'
  | 'relogios'
  | 'relogio-novo'
  | 'admin-usuarios'
  | 'admin-usuario-novo'
  | 'admin-usuario-editar'
  | 'admin-rotas'
  | 'admin-rota-nova'
  | 'admin-rota-editar'
  | 'admin-cadastros'
  | 'admin-dispositivos'
  | 'admin-auditoria'
  | 'admin-metas'
  | 'admin-meta-nova'
  | 'perfil'

interface NavigationState {
  currentView: ViewType
  selectedId: string | null
  params: Record<string, string>
  navigate: (view: ViewType, id?: string | null, params?: Record<string, string>) => void
  goBack: () => void
  history: Array<{ view: ViewType; id: string | null; params: Record<string, string> }>
}

export const useNavigation = create<NavigationState>((set, get) => ({
  currentView: 'dashboard',
  selectedId: null,
  params: {},
  history: [],
  navigate: (view, id = null, params = {}) => {
    const { currentView, selectedId, params: currentParams } = get()
    set((state) => ({
      history: [...state.history, { view: currentView, id: selectedId, params: currentParams }],
      currentView: view,
      selectedId: id,
      params,
    }))
  },
  goBack: () => {
    const { history } = get()
    if (history.length > 0) {
      const last = history[history.length - 1]
      set({
        currentView: last.view,
        selectedId: last.id,
        params: last.params,
        history: history.slice(0, -1),
      })
    }
  },
}))

// Helper to check if a view is a detail/edit form
export function getViewParent(view: ViewType): ViewType {
  if (view.startsWith('cliente-')) return 'clientes'
  if (view.startsWith('produto-')) return 'produtos'
  if (view.startsWith('locacao-')) return 'locacoes'
  if (view.startsWith('cobranca-')) return 'cobranças'
  if (view.startsWith('manutencao-')) return 'manutencoes'
  if (view.startsWith('relogio-')) return 'relogios'
  if (view.startsWith('admin-usuario')) return 'admin-usuarios'
  if (view.startsWith('admin-rota')) return 'admin-rotas'
  if (view.startsWith('admin-meta')) return 'admin-metas'
  return 'dashboard'
}
