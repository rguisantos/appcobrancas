import { describe, it, expect, beforeEach } from 'vitest'
import { useNavigation, getViewParent } from '../lib/store/navigation'

describe('navigation store', () => {
  beforeEach(() => {
    // Reset store state
    useNavigation.setState({
      currentView: 'dashboard',
      selectedId: null,
      params: {},
      history: [],
    })
  })

  it('should start on dashboard', () => {
    const state = useNavigation.getState()
    expect(state.currentView).toBe('dashboard')
    expect(state.selectedId).toBeNull()
    expect(state.history).toHaveLength(0)
  })

  it('should navigate to a new view', () => {
    useNavigation.getState().navigate('clientes')
    const state = useNavigation.getState()
    expect(state.currentView).toBe('clientes')
    expect(state.history).toHaveLength(1)
    expect(state.history[0].view).toBe('dashboard')
  })

  it('should navigate with an id', () => {
    useNavigation.getState().navigate('cliente-detalhe', 'client-123')
    const state = useNavigation.getState()
    expect(state.currentView).toBe('cliente-detalhe')
    expect(state.selectedId).toBe('client-123')
  })

  it('should navigate with params', () => {
    useNavigation.getState().navigate('cobrancas', null, { status: 'Pendente' })
    const state = useNavigation.getState()
    expect(state.params.status).toBe('Pendente')
  })

  it('should go back to previous view', () => {
    const { navigate, goBack } = useNavigation.getState()
    navigate('clientes')
    navigate('cliente-detalhe', 'c1')
    goBack()

    const state = useNavigation.getState()
    expect(state.currentView).toBe('clientes')
    expect(state.selectedId).toBeNull()
    expect(state.history).toHaveLength(1) // dashboard still in history
  })

  it('should not crash when going back with empty history', () => {
    useNavigation.getState().goBack()
    const state = useNavigation.getState()
    expect(state.currentView).toBe('dashboard') // unchanged
  })

  it('should build history chain correctly', () => {
    const { navigate } = useNavigation.getState()
    navigate('clientes')
    navigate('cliente-detalhe', 'c1')
    navigate('cobranca-detalhe', 'cob1')

    const state = useNavigation.getState()
    expect(state.history).toHaveLength(3)
    expect(state.history[0].view).toBe('dashboard')
    expect(state.history[1].view).toBe('clientes')
    expect(state.history[2].view).toBe('cliente-detalhe')
  })
})

describe('getViewParent', () => {
  it('should return clientes for cliente views', () => {
    expect(getViewParent('cliente-novo')).toBe('clientes')
    expect(getViewParent('cliente-detalhe')).toBe('clientes')
    expect(getViewParent('cliente-editar')).toBe('clientes')
  })

  it('should return produtos for produto views', () => {
    expect(getViewParent('produto-novo')).toBe('produtos')
    expect(getViewParent('produto-detalhe')).toBe('produtos')
  })

  it('should return locacoes for locacao views', () => {
    expect(getViewParent('locacao-nova')).toBe('locacoes')
    expect(getViewParent('locacao-detalhe')).toBe('locacoes')
  })

  it('should return cobrancas for cobranca views (BUG FIX verified)', () => {
    // This was the bug: previously returned 'cobranças' with cedilla
    expect(getViewParent('cobranca-nova')).toBe('cobrancas')
    expect(getViewParent('cobranca-detalhe')).toBe('cobrancas')
    expect(getViewParent('cobranca-editar')).toBe('cobrancas')
  })

  it('should return manutencoes for manutencao views', () => {
    expect(getViewParent('manutencao-nova')).toBe('manutencoes')
  })

  it('should return admin-usuarios for admin-usuario views', () => {
    expect(getViewParent('admin-usuario-novo')).toBe('admin-usuarios')
    expect(getViewParent('admin-usuario-editar')).toBe('admin-usuarios')
  })

  it('should return dashboard as default', () => {
    expect(getViewParent('dashboard')).toBe('dashboard')
    expect(getViewParent('perfil')).toBe('dashboard')
    expect(getViewParent('notificacoes')).toBe('dashboard')
  })
})
