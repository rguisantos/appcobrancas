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
import { Input } from '@/components/ui/input'
import { getViewParent } from '@/lib/store/navigation'
import { useState, useEffect, useRef } from 'react'

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth()
  const { currentView, goBack, history } = useNavigation()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const searchRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/busca-global?q=${encodeURIComponent(searchQuery)}`)
          if (res.ok) {
            const data = await res.json()
            setSearchResults(data)
          }
        } catch {}
      }, 300)
      return () => clearTimeout(timer)
    }
    return () => {
      // Cleanup
    }
  }, [searchQuery])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
        setSearchResults(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const { navigate } = useNavigation()

  return (
    <header className="h-14 border-b bg-card flex items-center px-4 gap-3 shrink-0">
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
      <h2 className="text-base font-semibold truncate">{currentLabel}</h2>

      <div className="flex-1" />

      {/* Search */}
      <div className="relative" ref={searchRef}>
        {searchOpen ? (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-8 w-64 pl-8 text-sm"
              placeholder="Buscar clientes, produtos..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (e.target.value.length < 2) setSearchResults(null)
              }}
              autoFocus
            />
          </div>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSearchOpen(true)}>
            <Search className="h-4 w-4" />
          </Button>
        )}

        {/* Search results dropdown */}
        {searchResults && searchQuery.length >= 2 && (
          <div className="absolute right-0 top-full mt-1 w-80 bg-popover border rounded-lg shadow-lg z-50 max-h-96 overflow-auto">
            {['clientes', 'produtos', 'locacoes', 'cobrancas'].map((type) => {
              const items = searchResults[type] || []
              if (items.length === 0) return null
              return (
                <div key={type} className="p-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1 px-2">
                    {type === 'cobrancas' ? 'Cobranças' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </p>
                  {items.slice(0, 5).map((item: any) => (
                    <button
                      key={item.id}
                      className="w-full text-left px-2 py-1.5 rounded-md hover:bg-accent text-sm"
                      onClick={() => {
                        const viewMap: Record<string, string> = {
                          clientes: 'cliente-detalhe',
                          produtos: 'produto-detalhe',
                          locacoes: 'locacao-detalhe',
                          cobrancas: 'cobranca-detalhe',
                        }
                        navigate(viewMap[type] as any, item.id)
                        setSearchOpen(false)
                        setSearchQuery('')
                      }}
                    >
                      <span className="font-medium">
                        {item.nomeExibicao || item.identificador || item.clienteNome || item.id}
                      </span>
                      {item.status && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          {item.status}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )
            })}
            {Object.values(searchResults).every((arr: any) => !arr?.length) && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum resultado encontrado
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 relative">
            <Bell className="h-4 w-4" />
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
  )
}
