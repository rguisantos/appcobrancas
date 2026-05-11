'use client'

import { useNavigation, ViewType } from '@/lib/store/navigation'
import { useAuth } from '@/lib/store/auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { TopBar } from '@/components/layout/top-bar'
import { PageTransition } from '@/components/layout/page-transition'
import { DashboardView } from '@/components/views/dashboard-view'
import { ClientesView } from '@/components/views/clientes-view'
import { ClienteFormView } from '@/components/views/cliente-form-view'
import { ClienteDetalheView } from '@/components/views/cliente-detalhe-view'
import { ProdutosView } from '@/components/views/produtos-view'
import { ProdutoFormView } from '@/components/views/produto-form-view'
import { ProdutoDetalheView } from '@/components/views/produto-detalhe-view'
import { LocacoesView } from '@/components/views/locacoes-view'
import { LocacaoFormView } from '@/components/views/locacao-form-view'
import { LocacaoDetalheView } from '@/components/views/locacao-detalhe-view'
import { CobrancasView } from '@/components/views/cobrancas-view'
import { CobrancaFormView } from '@/components/views/cobranca-form-view'
import { CobrancaDetalheView } from '@/components/views/cobranca-detalhe-view'
import { RelatoriosView } from '@/components/views/relatorios-view'
import { MapaView } from '@/components/views/mapa-view'
import { AgendaView } from '@/components/views/agenda-view'
import { ManutencoesView } from '@/components/views/manutencoes-view'
import { RelogiosView } from '@/components/views/relogios-view'
import { AdminUsuariosView } from '@/components/views/admin-usuarios-view'
import { AdminRotasView } from '@/components/views/admin-rotas-view'
import { AdminCadastrosView } from '@/components/views/admin-cadastros-view'
import { AdminDispositivosView } from '@/components/views/admin-dispositivos-view'
import { AdminAuditoriaView } from '@/components/views/admin-auditoria-view'
import { AdminMetasView } from '@/components/views/admin-metas-view'
import { PerfilView } from '@/components/views/perfil-view'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface NavItem {
  view: ViewType
  label: string
  icon: React.ReactNode
  permission?: string
  group?: string
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

  const permissoesWeb = user?.permissoesWeb || {}
  const isAdmin = user?.tipoPermissao === 'Administrador'

  const hasPermission = (permission?: string) => {
    if (!permission) return true
    if (isAdmin) return true
    return !!permissoesWeb[permission]
  }

  const filteredNavItems = navItems.filter((item) => hasPermission(item.permission))
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

  // Fetch pending cobranças count
  useEffect(() => {
    async function fetchPending() {
      try {
        const res = await fetch('/api/cobrancas?status=Pendente&limit=1')
        if (res.ok) {
          const data = await res.json()
          setPendingCount(data.total || data.pagination?.total || 0)
        }
      } catch {
        // silently ignore
      }
    }
    fetchPending()
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
        <div className={cn('flex items-center h-14 px-4 border-b', collapsed && 'lg:justify-center', mobileOpen && 'justify-between')}>
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

        {/* User Info Section */}
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 py-2 border-b"
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
          <div className="flex justify-center py-2 border-b">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
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
                          'w-full justify-start gap-3 h-10 sm:h-9 text-sm font-medium transition-all duration-200',
                          collapsed && !mobileOpen && 'lg:justify-center lg:px-0',
                          isActive(item.view) && 'bg-primary/10 text-primary hover:bg-primary/15'
                        )}
                        onClick={() => handleNavClick(item.view)}
                      >
                        {item.icon}
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

              {filteredAdminItems.length > 0 && (
                <>
                  <Separator className="my-3" />
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
                              'w-full justify-start gap-3 h-10 sm:h-9 text-sm font-medium transition-all duration-200',
                              collapsed && !mobileOpen && 'lg:justify-center lg:px-0',
                              isActive(item.view) && 'bg-primary/10 text-primary hover:bg-primary/15'
                            )}
                            onClick={() => handleNavClick(item.view)}
                          >
                            {item.icon}
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
        </ScrollArea>

        {/* Quick Stats Section */}
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 py-3 border-t"
          >
            <div className="rounded-lg bg-primary/5 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Cobranças Pendentes</p>
              <p className="text-lg font-bold text-primary">
                {pendingCount !== null ? pendingCount : '--'}
              </p>
            </div>
          </motion.div>
        )}
        {collapsed && (
          <div className="px-2 py-3 border-t">
            <div className="rounded-md bg-primary/5 p-1.5 text-center">
              <p className="text-[9px] font-medium text-muted-foreground">Pend.</p>
              <p className="text-xs font-bold text-primary">
                {pendingCount !== null ? pendingCount : '--'}
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
