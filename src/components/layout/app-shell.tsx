'use client'

import { useNavigation, ViewType } from '@/lib/store/navigation'
import { useAuth } from '@/lib/store/auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LayoutDashboard,
  Users,
  Package,
  Map,
  FileText,
  Calendar,
  Wrench,
  Gauge,
  BarChart3,
  Route,
  Shield,
  Smartphone,
  ClipboardList,
  Target,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  DollarSign,
  Settings,
  User,
  Bell,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { TopBar } from '@/components/layout/top-bar'
import { PageTransition } from '@/components/layout/page-transition'
import { KeyboardShortcuts } from '@/components/shared/keyboard-shortcuts'

// Loading fallback spinner for dynamically loaded views
const ViewLoading = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
  </div>
)

// Dynamic imports with ssr: false to prevent OOM from loading all 27+ views during SSR
const DashboardView = dynamic(() => import('@/components/views/dashboard-view').then(m => ({ default: m.DashboardView })), { ssr: false, loading: ViewLoading })
const ClientesView = dynamic(() => import('@/components/views/clientes-view').then(m => ({ default: m.ClientesView })), { ssr: false, loading: ViewLoading })
const ClienteFormView = dynamic(() => import('@/components/views/cliente-form-view').then(m => ({ default: m.ClienteFormView })), { ssr: false, loading: ViewLoading })
const ClienteDetalheView = dynamic(() => import('@/components/views/cliente-detalhe-view').then(m => ({ default: m.ClienteDetalheView })), { ssr: false, loading: ViewLoading })
const ProdutosView = dynamic(() => import('@/components/views/produtos-view').then(m => ({ default: m.ProdutosView })), { ssr: false, loading: ViewLoading })
const ProdutoFormView = dynamic(() => import('@/components/views/produto-form-view').then(m => ({ default: m.ProdutoFormView })), { ssr: false, loading: ViewLoading })
const ProdutoDetalheView = dynamic(() => import('@/components/views/produto-detalhe-view').then(m => ({ default: m.ProdutoDetalheView })), { ssr: false, loading: ViewLoading })
const LocacoesView = dynamic(() => import('@/components/views/locacoes-view').then(m => ({ default: m.LocacoesView })), { ssr: false, loading: ViewLoading })
const LocacaoFormView = dynamic(() => import('@/components/views/locacao-form-view').then(m => ({ default: m.LocacaoFormView })), { ssr: false, loading: ViewLoading })
const LocacaoDetalheView = dynamic(() => import('@/components/views/locacao-detalhe-view').then(m => ({ default: m.LocacaoDetalheView })), { ssr: false, loading: ViewLoading })
const CobrancasView = dynamic(() => import('@/components/views/cobrancas-view').then(m => ({ default: m.CobrancasView })), { ssr: false, loading: ViewLoading })
const CobrancaFormView = dynamic(() => import('@/components/views/cobranca-form-view').then(m => ({ default: m.CobrancaFormView })), { ssr: false, loading: ViewLoading })
const CobrancaDetalheView = dynamic(() => import('@/components/views/cobranca-detalhe-view').then(m => ({ default: m.CobrancaDetalheView })), { ssr: false, loading: ViewLoading })
const RelatoriosView = dynamic(() => import('@/components/views/relatorios-view').then(m => ({ default: m.RelatoriosView })), { ssr: false, loading: ViewLoading })
const MapaView = dynamic(() => import('@/components/views/mapa-view').then(m => ({ default: m.MapaView })), { ssr: false, loading: ViewLoading })
const AgendaView = dynamic(() => import('@/components/views/agenda-view').then(m => ({ default: m.AgendaView })), { ssr: false, loading: ViewLoading })
const ManutencoesView = dynamic(() => import('@/components/views/manutencoes-view').then(m => ({ default: m.ManutencoesView })), { ssr: false, loading: ViewLoading })
const RelogiosView = dynamic(() => import('@/components/views/relogios-view').then(m => ({ default: m.RelogiosView })), { ssr: false, loading: ViewLoading })
const AdminUsuariosView = dynamic(() => import('@/components/views/admin-usuarios-view').then(m => ({ default: m.AdminUsuariosView })), { ssr: false, loading: ViewLoading })
const AdminRotasView = dynamic(() => import('@/components/views/admin-rotas-view').then(m => ({ default: m.AdminRotasView })), { ssr: false, loading: ViewLoading })
const AdminCadastrosView = dynamic(() => import('@/components/views/admin-cadastros-view').then(m => ({ default: m.AdminCadastrosView })), { ssr: false, loading: ViewLoading })
const AdminDispositivosView = dynamic(() => import('@/components/views/admin-dispositivos-view').then(m => ({ default: m.AdminDispositivosView })), { ssr: false, loading: ViewLoading })
const AdminAuditoriaView = dynamic(() => import('@/components/views/admin-auditoria-view').then(m => ({ default: m.AdminAuditoriaView })), { ssr: false, loading: ViewLoading })
const AdminMetasView = dynamic(() => import('@/components/views/admin-metas-view').then(m => ({ default: m.AdminMetasView })), { ssr: false, loading: ViewLoading })
const PerfilView = dynamic(() => import('@/components/views/perfil-view').then(m => ({ default: m.PerfilView })), { ssr: false, loading: ViewLoading })
const NotificacoesView = dynamic(() => import('@/components/views/notificacoes-view').then(m => ({ default: m.NotificacoesView })), { ssr: false, loading: ViewLoading })
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface NavItem {
  view: ViewType
  label: string
  icon: React.ReactNode
  permission?: string
  group?: string
  badge?: number
}

const navItems: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, permission: 'dashboard' },
  { view: 'clientes', label: 'Clientes', icon: <Users className="h-4 w-4" />, permission: 'clientes' },
  { view: 'produtos', label: 'Produtos', icon: <Package className="h-4 w-4" />, permission: 'produtos' },
  { view: 'locacoes', label: 'Locações', icon: <DollarSign className="h-4 w-4" />, permission: 'locacaoRelocacaoEstoque' },
  { view: 'cobrancas', label: 'Cobranças', icon: <FileText className="h-4 w-4" />, permission: 'cobrancas' },
  { view: 'manutencoes', label: 'Manutenções', icon: <Wrench className="h-4 w-4" />, permission: 'manutencoes' },
  { view: 'relogios', label: 'Relógios', icon: <Gauge className="h-4 w-4" />, permission: 'relogios' },
  { view: 'relatorios', label: 'Relatórios', icon: <BarChart3 className="h-4 w-4" />, permission: 'relatorios' },
  { view: 'mapa', label: 'Mapa de Rotas', icon: <Map className="h-4 w-4" />, permission: 'mapa' },
  { view: 'agenda', label: 'Agenda', icon: <Calendar className="h-4 w-4" />, permission: 'agenda' },
  { view: 'notificacoes', label: 'Notificações', icon: <Bell className="h-4 w-4" /> },
]

const adminItems: NavItem[] = [
  { view: 'admin-usuarios', label: 'Usuários', icon: <User className="h-4 w-4" />, permission: 'adminUsuarios', group: 'admin' },
  { view: 'admin-rotas', label: 'Rotas', icon: <Route className="h-4 w-4" />, permission: 'rotas', group: 'admin' },
  { view: 'admin-cadastros', label: 'Cadastros', icon: <Settings className="h-4 w-4" />, permission: 'adminCadastros', group: 'admin' },
  { view: 'admin-dispositivos', label: 'Dispositivos', icon: <Smartphone className="h-4 w-4" />, permission: 'adminDispositivos', group: 'admin' },
  { view: 'admin-auditoria', label: 'Auditoria', icon: <Shield className="h-4 w-4" />, permission: 'adminAuditoria', group: 'admin' },
  { view: 'admin-metas', label: 'Metas', icon: <Target className="h-4 w-4" />, permission: 'relatorios', group: 'admin' },
]

export function AppShell() {
  const { currentView, navigate } = useNavigation()
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [overdueCount, setOverdueCount] = useState<number | null>(null)
  const [prevPendingCount, setPrevPendingCount] = useState<number | null>(null)
  const [prevOverdueCount, setPrevOverdueCount] = useState<number | null>(null)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0)

  const permissoesWeb = user?.permissoesWeb || {}
  const isAdmin = user?.tipoPermissao === 'Administrador'

  const hasPermission = (permission?: string) => {
    if (!permission) return true
    if (isAdmin) return true
    return !!permissoesWeb[permission]
  }

  const filteredNavItems = navItems.filter((item) => hasPermission(item.permission)).map((item) => {
    if (item.view === 'notificacoes') {
      return { ...item, badge: unreadNotificationCount }
    }
    return item
  })
  const filteredAdminItems = adminItems.filter((item) => hasPermission(item.permission))

  const isActive = (view: ViewType) => {
    return currentView === view || currentView.startsWith(view.replace(/s$/, ''))
  }

  const handleNavClick = (view: ViewType) => {
    navigate(view)
    setMobileOpen(false)
  }

  const handleLogout = async () => {
    await logout()
  }

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  // Fetch pending and overdue cobranças count
  useEffect(() => {
    async function fetchCounts() {
      try {
        const [pendRes, atrasRes] = await Promise.all([
          fetch('/api/cobrancas?status=Pendente&limit=1'),
          fetch('/api/cobrancas?status=Atrasado&limit=1'),
        ])

        if (pendRes.ok) {
          const data = await pendRes.json()
          const newCount = data.total || data.pagination?.total || 0
          setPrevPendingCount(pendingCount)
          setPendingCount(newCount)
        }

        if (atrasRes.ok) {
          const data = await atrasRes.json()
          const newCount = data.total || data.pagination?.total || 0
          setPrevOverdueCount(overdueCount)
          setOverdueCount(newCount)
        }
      } catch {
        // silently ignore
      }
    }
    fetchCounts()
  }, [currentView])

  // Fetch unread notification count
  useEffect(() => {
    async function fetchUnreadCount() {
      try {
        const res = await fetch('/api/notificacoes')
        if (res.ok) {
          const data = await res.json()
          const notificacoes = Array.isArray(data) ? data : []
          const unread = notificacoes.filter((n: { lida: boolean }) => !n.lida).length
          setUnreadNotificationCount(unread)
        }
      } catch {
        // silently ignore
      }
    }
    fetchUnreadCount()
  }, [currentView])

  return (
    <div className="min-h-screen flex bg-background safe-top safe-right safe-bottom safe-left">
      {/* Mobile overlay - covers content */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 flex flex-col border-r bg-card transition-all duration-300 ease-in-out',
          collapsed ? 'w-16' : 'w-64',
          // On mobile: overlay mode (translate off-screen when closed, on-screen when open)
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          // Safe area for iOS
          'pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)]'
        )}
        style={{
          // Ensure sidebar is above content on mobile
          ...(mobileOpen ? { height: '100dvh' } : {}),
        }}
      >
        {/* Logo */}
        <div className={cn('flex items-center h-14 px-4', collapsed && !mobileOpen && 'lg:justify-center', mobileOpen && 'justify-between')}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-primary-foreground">C</span>
            </div>
            {(!collapsed || mobileOpen) && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-w-0 overflow-hidden"
              >
                <h1 className="text-base font-bold truncate">Cobranças</h1>
                <p className="text-[10px] text-muted-foreground truncate">Gestão de Cobranças</p>
              </motion.div>
            )}
          </div>
          {/* Desktop collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex h-7 w-7 shrink-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </Button>
          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-7 w-7 shrink-0"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {/* Gradient bottom border on logo section */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* User Info Section */}
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 py-2"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-sm bg-primary text-primary-foreground">
                  {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.nome}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.tipoPermissao}</p>
              </div>
            </div>
          </motion.div>
        )}
        {collapsed && (
          <div className="flex justify-center py-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Scrollable content area - includes nav, quick stats, and bottom actions */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Navigation */}
          <div className="py-3">
            <TooltipProvider delayDuration={0}>
              <nav className="space-y-1 px-2">
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2"
                  >
                    Menu Principal
                  </motion.p>
                )}
                {filteredNavItems.map((item, index) => (
                  <Tooltip key={item.view}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15, delay: index * 0.02 }}
                      >
                        <Button
                          variant={isActive(item.view) ? 'secondary' : 'ghost'}
                          className={cn(
                            'w-full justify-start gap-3 h-10 sm:h-9 text-sm font-medium transition-all duration-200 rounded-lg',
                            collapsed && !mobileOpen && 'lg:justify-center lg:px-0',
                            isActive(item.view) 
                              ? 'bg-primary/10 text-primary hover:bg-primary/15' 
                              : 'hover:bg-muted/60'
                          )}
                          onClick={() => handleNavClick(item.view)}
                        >
                          <span className="relative">
                            {item.icon}
                            {isActive(item.view) && (
                              <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-primary" />
                            )}
                            {item.badge !== undefined && item.badge > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-[9px] font-bold text-white">
                                {item.badge > 9 ? '9+' : item.badge}
                              </span>
                            )}
                          </span>
                          {(!collapsed || mobileOpen) && (
                            <span className="truncate flex-1">{item.label}</span>
                          )}
                          {(!collapsed || mobileOpen) && item.badge !== undefined && item.badge > 0 && (
                            <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-red-100 dark:bg-red-900 text-[10px] font-bold text-red-700 dark:text-red-200 shrink-0">
                              {item.badge > 99 ? '99+' : item.badge}
                            </span>
                          )}
                        </Button>
                      </motion.div>
                    </TooltipTrigger>
                    {collapsed && !mobileOpen && (
                      <TooltipContent side="right" className="font-medium">
                        {item.label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}

                {filteredAdminItems.length > 0 && (
                  <>
                    <div className="mx-3 my-2 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                    {!collapsed && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2"
                      >
                        Administração
                      </motion.p>
                    )}
                    {filteredAdminItems.map((item, index) => (
                      <Tooltip key={item.view}>
                        <TooltipTrigger asChild>
                          <motion.div
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.15, delay: index * 0.02 }}
                          >
                            <Button
                              variant={isActive(item.view) ? 'secondary' : 'ghost'}
                              className={cn(
                                'w-full justify-start gap-3 h-10 sm:h-9 text-sm font-medium transition-all duration-200 rounded-lg',
                                collapsed && !mobileOpen && 'lg:justify-center lg:px-0',
                                isActive(item.view) 
                                  ? 'bg-primary/10 text-primary hover:bg-primary/15' 
                                  : 'hover:bg-muted/60'
                              )}
                              onClick={() => handleNavClick(item.view)}
                            >
                              <span className="relative">
                                {item.icon}
                                {isActive(item.view) && (
                                  <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-primary" />
                                )}
                              </span>
                              {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
                            </Button>
                          </motion.div>
                        </TooltipTrigger>
                        {collapsed && !mobileOpen && (
                          <TooltipContent side="right" className="font-medium">
                            {item.label}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    ))}
                  </>
                )}
              </nav>
            </TooltipProvider>
          </div>

          {/* Quick Stats Section */}
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-3 border-t space-y-2"
            >
              <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/80 dark:from-emerald-950/50 dark:to-emerald-900/30 p-3 border border-emerald-200/50 dark:border-emerald-800/30">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Cobranças Pendentes</p>
                  {pendingCount !== null && prevPendingCount !== null && pendingCount !== prevPendingCount && (
                    <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                      pendingCount < prevPendingCount ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {pendingCount < prevPendingCount ? '↓' : '↑'}
                      {Math.abs(pendingCount - prevPendingCount)}
                    </span>
                  )}
                </div>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {pendingCount !== null ? pendingCount : '--'}
                </p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-red-50 to-amber-50/80 dark:from-red-950/50 dark:to-amber-900/20 p-3 border border-red-200/50 dark:border-red-800/30">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-red-700 dark:text-red-400">Cobranças Atrasadas</p>
                  {overdueCount !== null && prevOverdueCount !== null && overdueCount !== prevOverdueCount && (
                    <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                      overdueCount < prevOverdueCount ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {overdueCount < prevOverdueCount ? '↓' : '↑'}
                      {Math.abs(overdueCount - prevOverdueCount)}
                    </span>
                  )}
                </div>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  {overdueCount !== null ? overdueCount : '--'}
                </p>
              </div>
            </motion.div>
          )}
          {collapsed && (
            <div className="px-2 py-3 border-t space-y-1.5">
              <div className="rounded-md bg-gradient-to-br from-emerald-50 to-emerald-100/80 dark:from-emerald-950/50 dark:to-emerald-900/30 p-1.5 text-center border border-emerald-200/50 dark:border-emerald-800/30">
                <p className="text-[9px] font-medium text-emerald-700 dark:text-emerald-400">Pend.</p>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {pendingCount !== null ? pendingCount : '--'}
                </p>
              </div>
              <div className="rounded-md bg-gradient-to-br from-red-50 to-amber-50/80 dark:from-red-950/50 dark:to-amber-900/20 p-1.5 text-center border border-red-200/50 dark:border-red-800/30">
                <p className="text-[9px] font-medium text-red-700 dark:text-red-400">Atras.</p>
                <p className="text-xs font-bold text-red-600 dark:text-red-400">
                  {overdueCount !== null ? overdueCount : '--'}
                </p>
              </div>
            </div>
          )}

          {/* Bottom section */}
          <div className="border-t p-3 space-y-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              variant="ghost"
              className={cn('w-full justify-start gap-3 h-10 sm:h-9 text-sm transition-all duration-200', collapsed && !mobileOpen && 'lg:justify-center lg:px-0')}
              onClick={() => navigate('perfil')}
            >
              <User className="h-4 w-4" />
              {(!collapsed || mobileOpen) && <span className="truncate">Perfil</span>}
            </Button>
            <Button
              variant="ghost"
              className={cn('w-full justify-start gap-3 h-10 sm:h-9 text-sm text-destructive hover:text-destructive transition-all duration-200', collapsed && !mobileOpen && 'lg:justify-center lg:px-0')}
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              {(!collapsed || mobileOpen) && <span className="truncate">Sair</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-auto">
          <PageTransition>
            <ViewRouter currentView={currentView} />
          </PageTransition>
        </main>
      </div>

      {/* Keyboard Shortcuts Panel */}
      <KeyboardShortcuts />
    </div>
  )
}

function ViewRouter({ currentView }: { currentView: ViewType }) {
  switch (currentView) {
    case 'dashboard':
      return <DashboardView />
    case 'clientes':
      return <ClientesView />
    case 'cliente-novo':
      return <ClienteFormView />
    case 'cliente-editar':
      return <ClienteFormView />
    case 'cliente-detalhe':
      return <ClienteDetalheView />
    case 'produtos':
      return <ProdutosView />
    case 'produto-novo':
      return <ProdutoFormView />
    case 'produto-editar':
      return <ProdutoFormView />
    case 'produto-detalhe':
      return <ProdutoDetalheView />
    case 'locacoes':
      return <LocacoesView />
    case 'locacao-nova':
      return <LocacaoFormView />
    case 'locacao-editar':
      return <LocacaoFormView />
    case 'locacao-detalhe':
      return <LocacaoDetalheView />
    case 'cobrancas':
      return <CobrancasView />
    case 'cobranca-nova':
      return <CobrancaFormView />
    case 'cobranca-editar':
      return <CobrancaFormView />
    case 'cobranca-detalhe':
      return <CobrancaDetalheView />
    case 'relatorios':
      return <RelatoriosView />
    case 'mapa':
      return <MapaView />
    case 'agenda':
      return <AgendaView />
    case 'manutencoes':
      return <ManutencoesView />
    case 'manutencao-nova':
      return <ManutencoesView />
    case 'relogios':
      return <RelogiosView />
    case 'relogio-novo':
      return <RelogiosView />
    case 'admin-usuarios':
      return <AdminUsuariosView />
    case 'admin-usuario-novo':
      return <AdminUsuariosView />
    case 'admin-usuario-editar':
      return <AdminUsuariosView />
    case 'admin-rotas':
      return <AdminRotasView />
    case 'admin-rota-nova':
      return <AdminRotasView />
    case 'admin-rota-editar':
      return <AdminRotasView />
    case 'admin-cadastros':
      return <AdminCadastrosView />
    case 'admin-dispositivos':
      return <AdminDispositivosView />
    case 'admin-auditoria':
      return <AdminAuditoriaView />
    case 'admin-metas':
      return <AdminMetasView />
    case 'admin-meta-nova':
      return <AdminMetasView />
    case 'perfil':
      return <PerfilView />
    case 'notificacoes':
      return <NotificacoesView />
    default:
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">{currentView}</h2>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      )
  }
}
