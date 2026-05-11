'use client'

import { useAuth } from '@/lib/store/auth'
import { useNavigation } from '@/lib/store/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Menu, Bell, Search, LogOut, User, ChevronLeft } from 'lucide-react'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { getViewParent } from '@/lib/store/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { Users, Package, DollarSign, FileText } from 'lucide-react'

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth()
  const { currentView, goBack, history, navigate } = useNavigation()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any>(null)
  const [searching, setSearching] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Load notifications
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/notificacoes')
        if (!cancelled && res.ok) {
          const data = await res.json()
          if (!cancelled) setNotifications(data.data || data || [])
        }
      } catch {}
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Debounced search
  useEffect(() => {
    if (!searchOpen) {
      setSearchQuery('')
      setSearchResults(null)
      return
    }
    if (searchQuery.length >= 2) {
      setSearching(true)
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/busca-global?q=${encodeURIComponent(searchQuery)}`)
          if (res.ok) {
            const data = await res.json()
            setSearchResults(data)
          }
        } catch {
        } finally {
          setSearching(false)
        }
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setSearchResults(null)
      setSearching(false)
    }
  }, [searchQuery, searchOpen])

  const unreadCount = notifications.filter((n: any) => !n.lida).length

  const viewLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    clientes: 'Clientes',
    'cliente-novo': 'Novo Cliente',
    'cliente-detalhe': 'Detalhes do Cliente',
    'cliente-editar': 'Editar Cliente',
    produtos: 'Produtos',
    'produto-novo': 'Novo Produto',
    'produto-detalhe': 'Detalhes do Produto',
    'produto-editar': 'Editar Produto',
    locacoes: 'Locações',
    'locacao-nova': 'Nova Locação',
    'locacao-detalhe': 'Detalhes da Locação',
    'locacao-editar': 'Editar Locação',
    cobrancas: 'Cobranças',
    'cobranca-nova': 'Nova Cobrança',
    'cobranca-detalhe': 'Detalhes da Cobrança',
    'cobranca-editar': 'Editar Cobrança',
    relatorios: 'Relatórios',
    mapa: 'Mapa de Rotas',
    agenda: 'Agenda',
    manutencoes: 'Manutenções',
    'manutencao-nova': 'Nova Manutenção',
    relogios: 'Relógios',
    'relogio-novo': 'Registrar Relógio',
    'admin-usuarios': 'Usuários',
    'admin-usuario-novo': 'Novo Usuário',
    'admin-usuario-editar': 'Editar Usuário',
    'admin-rotas': 'Rotas',
    'admin-rota-nova': 'Nova Rota',
    'admin-rota-editar': 'Editar Rota',
    'admin-cadastros': 'Cadastros',
    'admin-dispositivos': 'Dispositivos',
    'admin-auditoria': 'Auditoria',
    'admin-metas': 'Metas',
    'admin-meta-nova': 'Nova Meta',
    perfil: 'Perfil',
  }

  const currentLabel = viewLabels[currentView] || currentView
  const hasHistory = history.length > 0

  const handleSelectResult = (type: string, id: string) => {
    const viewMap: Record<string, string> = {
      clientes: 'cliente-detalhe',
      produtos: 'produto-detalhe',
      locacoes: 'locacao-detalhe',
      cobrancas: 'cobranca-detalhe',
    }
    navigate(viewMap[type] as any, id)
    setSearchOpen(false)
    setSearchQuery('')
  }

  const entityConfig: Record<string, { label: string; icon: React.ReactNode }> = {
    clientes: { label: 'Clientes', icon: <Users className="h-4 w-4 text-blue-500" /> },
    produtos: { label: 'Produtos', icon: <Package className="h-4 w-4 text-orange-500" /> },
    locacoes: { label: 'Locações', icon: <DollarSign className="h-4 w-4 text-green-500" /> },
    cobrancas: { label: 'Cobranças', icon: <FileText className="h-4 w-4 text-red-500" /> },
  }

  const hasAnyResults = searchResults && Object.values(searchResults).some((arr: any) => arr?.length > 0)

  return (
    <>
      <header className="h-12 sm:h-14 border-b bg-card flex items-center px-3 sm:px-4 gap-2 sm:gap-3 shrink-0 shadow-sm">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-8 w-8"
          onClick={onMenuClick}
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Back button */}
        {hasHistory && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Current view title */}
        <h2 className="text-sm sm:text-base font-semibold truncate">{currentLabel}</h2>

        <div className="flex-1" />

        {/* Search button with ⌘K hint */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 text-muted-foreground hidden sm:flex"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs">Buscar...</span>
          <kbd className="pointer-events-none ml-1 inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
        {/* Keyboard shortcut hint "?" */}
        <kbd className="pointer-events-none hidden lg:inline-flex h-5 select-none items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ?
        </kbd>
        {/* Mobile search icon */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 sm:hidden"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
              <Bell className={`h-4 w-4 ${unreadCount > 0 ? 'animate-pulse' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notificações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhuma notificação
              </div>
            ) : (
              notifications.slice(0, 5).map((n: any) => (
                <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 p-3">
                  <span className="font-medium text-sm">{n.titulo}</span>
                  <span className="text-xs text-muted-foreground line-clamp-2">{n.mensagem}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline-block max-w-[120px] truncate">
                {user?.nome || 'Usuário'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.nome}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('perfil')}>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Command Palette Search Dialog */}
      <CommandDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Busca Global"
        description="Buscar clientes, produtos, locações, cobranças..."
        showCloseButton={false}
        className="sm:max-w-lg"
      >
        <CommandInput
          placeholder="Buscar clientes, produtos, locações, cobranças..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          {searchQuery.length >= 2 && !searching && !hasAnyResults && (
            <CommandEmpty>Nenhum resultado encontrado</CommandEmpty>
          )}
          {searchQuery.length < 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Digite ao menos 2 caracteres para buscar
            </div>
          )}
          {searching && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Buscando...
            </div>
          )}
          {searchResults && !searching && ['clientes', 'produtos', 'locacoes', 'cobrancas'].map((type) => {
            const items = searchResults[type] || []
            if (items.length === 0) return null
            const config = entityConfig[type]
            return (
              <CommandGroup key={type} heading={config.label}>
                {items.slice(0, 8).map((item: any) => (
                  <CommandItem
                    key={item.id}
                    value={`${type}-${item.id}`}
                    onSelect={() => handleSelectResult(type, item.id)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    {config.icon}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm truncate block">
                        {item.nomeExibicao || item.identificador || item.clienteNome || item.id}
                      </span>
                      {item.identificador && item.nomeExibicao && (
                        <span className="text-xs text-muted-foreground truncate block">
                          {item.identificador}
                        </span>
                      )}
                    </div>
                    {item.status && (
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {item.status}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )
          })}
          {searchQuery.length >= 2 && !searching && (
            <div className="border-t px-4 py-2 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                Enter para selecionar ·↑↓ para navegar
              </span>
              <span className="text-[10px] text-muted-foreground">
                Esc para fechar
              </span>
            </div>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
