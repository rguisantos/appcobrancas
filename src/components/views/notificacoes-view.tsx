'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bell, BellOff, CheckCheck, AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react'
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
  const [markingAll, setMarkingAll] = useState(false)

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

  const filteredNotificacoes = notificacoes.filter((n) => {
    if (filter === 'nao-lidas') return !n.lida
    if (filter === 'lidas') return n.lida
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

      {/* Filter Tabs */}
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
                    {filter === 'todas' && 'Nenhuma notificação'}
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
