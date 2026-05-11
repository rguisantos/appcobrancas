'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Bell,
  BellOff,
  CheckCheck,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  Volume2,
  VolumeX,
  EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Notificacao {
  id: string
  usuarioId: string
  tipo: string
  titulo: string
  mensagem: string
  lida: boolean
  link: string | null
  createdAt: string
  updatedAt: string
}

type FilterTab = 'todas' | 'nao-lidas' | 'lidas'
type TypeFilter = 'todas' | 'cobranca_vencida' | 'saldo_devedor' | 'pagamento_recebido' | 'novo_cliente' | 'meta_atingida' | 'info'

function getNotificationIcon(tipo: string) {
  switch (tipo) {
    case 'cobranca_vencida':
    case 'saldo_devedor':
      return <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
    case 'novo_cliente':
    case 'pagamento_recebido':
    case 'meta_atingida':
      return <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
    case 'info':
    default:
      return <Info className="h-5 w-5 text-sky-500 shrink-0" />
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: ptBR })
  } catch {
    return dateStr
  }
}

export function NotificacoesView() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('todas')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todas')
  const [markingAll, setMarkingAll] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)

  const fetchNotificacoes = useCallback(async () => {
    try {
      const res = await fetch('/api/notificacoes')
      if (res.ok) {
        const data = await res.json()
        setNotificacoes(data)
      }
    } catch {
      toast.error('Erro ao carregar notificações')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotificacoes()
  }, [fetchNotificacoes])

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notificacoes/${id}`, { method: 'PUT' })
      if (res.ok) {
        setNotificacoes((prev) =>
          prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
        )
      }
    } catch {
      toast.error('Erro ao marcar notificação')
    }
  }

  const markAsUnread = async (id: string) => {
    try {
      const res = await fetch(`/api/notificacoes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lida: false }),
      })
      if (res.ok) {
        setNotificacoes((prev) =>
          prev.map((n) => (n.id === id ? { ...n, lida: false } : n))
        )
        toast.success('Marcada como não lida')
      }
    } catch {
      // If the API doesn't support marking as unread, just update locally
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: false } : n))
      )
    }
  }

  const markAllAsRead = async () => {
    setMarkingAll(true)
    try {
      const unread = notificacoes.filter((n) => !n.lida)
      await Promise.all(unread.map((n) => fetch(`/api/notificacoes/${n.id}`, { method: 'PUT' })))
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
      toast.success('Todas as notificações marcadas como lidas')
    } catch {
      toast.error('Erro ao marcar notificações')
    } finally {
      setMarkingAll(false)
    }
  }

  const playNotificationSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkZOQi4J3aWBbX2t0goqRl5KOfnVpYV5fb3WEipGXkI6Cd2lhYF1fbnWHipGWi4N5aWFfX2xziIqQlouDe2lhYl9cb3OIipCWioR4amJiX1xvc4iJj5WKg3lpYmJfXG90iImPlIqDeWpiYl9cb3SIiY+UioN5amJiX1xvdIiJj5SKg3lqYmJfXG90iImPlIqDeWpiYl9cb3SIiY+UioN5amJiX1xvdIiJj5SKg3lqYmJfXG90iImPlIqDeWpiYl9cb3SIiY+UioN5amJiX1xvdA==')
      audio.volume = 0.5
      audio.play()
    } catch {
      // ignore audio errors
    }
  }

  const filteredNotificacoes = notificacoes.filter((n) => {
    if (filter === 'nao-lidas' && n.lida) return false
    if (filter === 'lidas' && !n.lida) return false
    if (typeFilter !== 'todas' && n.tipo !== typeFilter) return false
    return true
  })

  const unreadCount = notificacoes.filter((n) => !n.lida).length

  if (loading) {
    return <NotificacoesSkeleton />
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Notificações</h1>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white hover:bg-red-600">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSoundEnabled(!soundEnabled)
              if (!soundEnabled) {
                playNotificationSound()
                toast.success('Som de notificação ativado')
              } else {
                toast.info('Som de notificação desativado')
              }
            }}
            title={soundEnabled ? 'Desativar som' : 'Ativar som'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={markAllAsRead}
              disabled={markingAll}
            >
              <CheckCheck className="h-4 w-4" />
              {markingAll ? 'Marcando...' : 'Marcar todas como lidas'}
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="todas" className="gap-1.5">
              Todas
              <span className="text-xs text-muted-foreground">({notificacoes.length})</span>
            </TabsTrigger>
            <TabsTrigger value="nao-lidas" className="gap-1.5">
              Não lidas
              {unreadCount > 0 && (
                <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 px-1.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="lidas" className="gap-1.5">
              Lidas
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os tipos</SelectItem>
            <SelectItem value="cobranca_vencida">Cobrança Vencida</SelectItem>
            <SelectItem value="saldo_devedor">Saldo Devedor</SelectItem>
            <SelectItem value="pagamento_recebido">Pagamento Recebido</SelectItem>
            <SelectItem value="novo_cliente">Novo Cliente</SelectItem>
            <SelectItem value="meta_atingida">Meta Atingida</SelectItem>
            <SelectItem value="info">Informação</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotificacoes.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-8">
              <div className="text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <BellOff className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {filter === 'nao-lidas' && 'Nenhuma notificação não lida'}
                    {filter === 'lidas' && 'Nenhuma notificação lida'}
                    {filter === 'todas' && typeFilter !== 'todas' && 'Nenhuma notificação deste tipo'}
                    {filter === 'todas' && typeFilter === 'todas' && 'Nenhuma notificação'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filter === 'nao-lidas'
                      ? 'Você está em dia com suas notificações!'
                      : 'As notificações aparecerão aqui quando houver atividades no sistema.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredNotificacoes.map((notificacao) => (
            <Card
              key={notificacao.id}
              className={`shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md ${
                !notificacao.lida ? 'border-l-4 border-l-primary bg-primary/[0.02]' : ''
              }`}
              onClick={() => {
                if (!notificacao.lida) {
                  markAsRead(notificacao.id)
                  if (soundEnabled) playNotificationSound()
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="mt-0.5">
                    {getNotificationIcon(notificacao.tipo)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!notificacao.lida ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>
                        {notificacao.titulo}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        {!notificacao.lida && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                        {notificacao.lida && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsUnread(notificacao.id)
                            }}
                            title="Marcar como não lida"
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className={`text-sm ${!notificacao.lida ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {notificacao.mensagem}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(notificacao.createdAt)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

function NotificacoesSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-9 w-44" />
      </div>
      <Skeleton className="h-10 w-72" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
