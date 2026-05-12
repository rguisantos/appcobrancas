'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isToday, isValid, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  List,
  Grid3X3,
  Rows3,
  CreditCard,
  CheckCircle,
} from 'lucide-react'

interface CobrancaAgenda {
  id: string
  clienteNome: string
  produtoIdentificador: string
  totalClientePaga: number
  valorRecebido: number
  status: string
  dataVencimento: string | null
  dataPagamento: string | null
  formaPagamento: string
  cliente: { id: string; nomeExibicao: string } | null
  locacao: { id: string; formaPagamento: string; produtoTipo: string } | null
}

type ViewMode = 'calendar' | 'list' | 'week'

export function AgendaView() {
  const { navigate } = useNavigation()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [cobrancas, setCobrancas] = useState<CobrancaAgenda[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')

  // Memoize monthStart/monthEnd to prevent infinite re-renders from new Date objects every render
  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate])
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate])

  const fetchCobrancas = useCallback(async () => {
    const dataInicio = format(monthStart, 'yyyy-MM-dd')
    const dataFim = format(monthEnd, 'yyyy-MM-dd')
    try {
      const res = await fetch(`/api/agenda?dataInicio=${dataInicio}&dataFim=${dataFim}`)
      if (res.ok) {
        const data = await res.json()
        setCobrancas(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Erro ao buscar agenda:', error)
    } finally {
      setLoading(false)
    }
  }, [monthStart, monthEnd])

  const hasFetched = useRef(false)
  useEffect(() => {
    // Prevent duplicate fetches on strict mode / re-renders
    if (!hasFetched.current) {
      setLoading(true)
      hasFetched.current = true
    }
    fetchCobrancas()
  }, [fetchCobrancas])

  // Group cobrancas by date
  const cobrancasByDate = useMemo(() => {
    const map: Record<string, CobrancaAgenda[]> = {}
    cobrancas.forEach((c) => {
      // Group by dataVencimento
      if (c.dataVencimento) {
        try {
          const date = format(parseISO(c.dataVencimento), 'yyyy-MM-dd')
          if (!map[date]) map[date] = []
          map[date].push(c)
        } catch {
          // skip invalid date
        }
      }
      // Also include by dataPagamento
      if (c.dataPagamento) {
        try {
          const date = format(parseISO(c.dataPagamento), 'yyyy-MM-dd')
          if (!map[date]) map[date] = []
          // Avoid duplicate
          const exists = map[date].some((existing) => existing.id === c.id)
          if (!exists) map[date].push(c)
        } catch {
          // skip invalid date
        }
      }
    })
    return map
  }, [cobrancas])

  // Calendar days for the grid
  const calendarDays = useMemo(() => {
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
    // Get the day of week for the first day (0=Sun, 1=Mon, ..., 6=Sat)
    const firstDayOfWeek = getDay(monthStart)
    // Adjust for Monday start (0=Mon, ..., 6=Sun)
    const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

    const blanks: (null | Date)[] = Array(offset).fill(null)
    return [...blanks, ...daysInMonth]
  }, [monthStart, monthEnd])

  // Selected day cobranças
  const selectedCobrancas = useMemo(() => {
    if (!selectedDate) return []
    const key = format(selectedDate, 'yyyy-MM-dd')
    return cobrancasByDate[key] || []
  }, [selectedDate, cobrancasByDate])

  // Count cobranças by status for a date
  const getStatusCounts = (dateKey: string) => {
    const items = cobrancasByDate[dateKey] || []
    return {
      pago: items.filter((c) => c.status === 'Pago').length,
      pendente: items.filter((c) => c.status === 'Pendente' || c.status === 'Parcial').length,
      atrasado: items.filter((c) => c.status === 'Atrasado').length,
      total: items.length,
    }
  }

  const monthLabel = format(currentDate, 'MMMM yyyy', { locale: ptBR })

  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

  // List view data: all dates with cobranças in the month
  const listDays = useMemo(() => {
    return Object.keys(cobrancasByDate)
      .filter((key) => {
        try {
          const d = parseISO(key)
          return d >= monthStart && d <= monthEnd
        } catch {
          return false
        }
      })
      .sort()
      .map((key) => ({
        dateKey: key,
        date: parseISO(key),
        cobrancas: cobrancasByDate[key],
      }))
  }, [cobrancasByDate, monthStart, monthEnd])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy')
    } catch {
      return dateStr
    }
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold">Agenda</h1>
          <p className="text-muted-foreground text-sm">
            Acompanhe cobranças por data de vencimento e pagamento
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950"
            onClick={() => {
              setCurrentDate(new Date())
              setSelectedDate(new Date())
            }}
          >
            <CalendarIcon className="h-4 w-4" />
            Hoje
          </Button>
          <div className="h-5 w-px bg-border" />
          <Button
            variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('calendar')}
            className="gap-1.5"
          >
            <Grid3X3 className="h-4 w-4" />
            Calendário
          </Button>
          <Button
            variant={viewMode === 'week' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('week')}
            className="gap-1.5"
          >
            <Rows3 className="h-4 w-4" />
            Semana
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="gap-1.5"
          >
            <List className="h-4 w-4" />
            Lista
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <Card className="shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-10 sm:w-10"
              onClick={() => setCurrentDate(viewMode === 'week' ? subWeeks(currentDate, 1) : subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              <h2 className="text-sm sm:text-lg font-semibold capitalize">
                {viewMode === 'week'
                  ? (() => {
                      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
                      const weekEnd = addDays(weekStart, 6)
                      return `${format(weekStart, "d 'de' MMM", { locale: ptBR })} — ${format(weekEnd, "d 'de' MMM 'de' yyyy", { locale: ptBR })}`
                    })()
                  : monthLabel
                }
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="text-xs h-7 sm:h-8"
              >
                Hoje
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10"
                onClick={() => setCurrentDate(viewMode === 'week' ? addWeeks(currentDate, 1) : addMonths(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="font-semibold text-muted-foreground">Legenda:</span>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          <span>Pago</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
          <span>Pendente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span>Atrasado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
          <span>Parcial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span>Vence hoje</span>
        </div>
      </div>

      {loading ? (
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">
                  {d}
                </div>
              ))}
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'calendar' ? (
        /* Calendar View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardContent className="p-3">
                {/* Week day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {weekDays.map((d) => (
                    <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">
                      {d}
                    </div>
                  ))}
                </div>
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    if (!day) {
                      return <div key={`blank-${idx}`} className="min-h-[80px] rounded bg-muted/30" />
                    }

                    const dateKey = format(day, 'yyyy-MM-dd')
                    const counts = getStatusCounts(dateKey)
                    const isSelected = selectedDate && isSameDay(day, selectedDate)
                    const isCurrentDay = isToday(day)

                    return (
                      <button
                        key={dateKey}
                        onClick={() => setSelectedDate(day)}
                        className={`min-h-[80px] rounded p-1.5 text-left transition-all border ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : isCurrentDay
                              ? 'border-primary/40 bg-primary/5'
                              : 'border-transparent hover:bg-muted/50'
                        }`}
                      >
                        <div className={`text-xs font-medium mb-1 ${
                          isCurrentDay ? 'text-primary' : 'text-foreground'
                        }`}>
                          {format(day, 'd')}
                        </div>
                        {counts.total > 0 && (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex flex-wrap gap-0.5">
                              {counts.pago > 0 && (
                                <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-green-100 dark:bg-green-900 text-[9px] font-bold text-green-700 dark:text-green-300">
                                  {counts.pago}
                                </span>
                              )}
                              {counts.pendente > 0 && (
                                <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-yellow-100 dark:bg-yellow-900 text-[9px] font-bold text-yellow-700 dark:text-yellow-300">
                                  {counts.pendente}
                                </span>
                              )}
                              {counts.atrasado > 0 && (
                                <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-red-100 dark:bg-red-900 text-[9px] font-bold text-red-700 dark:text-red-300">
                                  {counts.atrasado}
                                </span>
                              )}
                            </div>
                            {counts.total > 1 && (
                              <span className="text-[8px] text-muted-foreground font-medium text-center">
                                {counts.total} total
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel - Selected Date Details */}
          <div className="lg:col-span-1">
            <Card className="shadow-sm">
              <CardContent className="p-4">
                {selectedDate ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">
                        {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setSelectedDate(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {selectedCobrancas.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Nenhuma cobrança nesta data
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {selectedCobrancas.map((c) => {
                          const isOverdue = c.status === 'Atrasado'
                          const isPaid = c.status === 'Pago'
                          const isParcial = c.status === 'Parcial'
                          const isPending = c.status === 'Pendente'
                          const colorClasses = isPaid
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 border-l-4 border-l-emerald-500'
                            : isOverdue
                              ? 'bg-red-100 dark:bg-red-900/30 border-l-4 border-l-red-500'
                              : isPending
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-l-yellow-500'
                                : isParcial
                                  ? 'bg-orange-100 dark:bg-orange-900/30 border-l-4 border-l-orange-500'
                                  : 'bg-card border-l-4 border-l-gray-400'
                          return (
                            <div
                              key={c.id}
                              className={`rounded-lg border p-3 hover:opacity-90 cursor-pointer transition-opacity ${colorClasses}`}
                              onClick={() => navigate('cobranca-detalhe', c.id)}
                            >
                              <div className="flex items-start justify-between mb-1">
                                <p className="text-sm font-medium leading-tight">
                                  {c.clienteNome || c.cliente?.nomeExibicao}
                                </p>
                                <StatusBadge status={c.status} />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {c.produtoIdentificador} • {c.locacao?.produtoTipo || c.formaPagamento}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-sm font-semibold">
                                  {formatarMoeda(c.totalClientePaga)}
                                </span>
                                {c.valorRecebido > 0 && (
                                  <span className="text-xs text-green-600">
                                    Pago: {formatarMoeda(c.valorRecebido)}
                                  </span>
                                )}
                              </div>
                              {c.dataVencimento && (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  Venc: {formatDate(c.dataVencimento)}
                                  {c.dataPagamento && ` • Pgto: ${formatDate(c.dataPagamento)}`}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Clique em um dia para ver as cobranças
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : viewMode === 'week' ? (
        /* Weekly View */
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {(() => {
              const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
              const weekDaysList = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

              const handleQuickPay = async (c: CobrancaAgenda) => {
                try {
                  const res = await fetch(`/api/cobrancas/${c.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      valorRecebido: c.totalClientePaga,
                      status: 'Pago',
                    }),
                  })
                  if (res.ok) {
                    toast.success(`Pagamento de ${formatarMoeda(c.totalClientePaga)} registrado!`)
                    fetchCobrancas()
                  } else {
                    toast.error('Erro ao registrar pagamento')
                  }
                } catch {
                  toast.error('Erro ao registrar pagamento')
                }
              }

              return (
                <div className="divide-y">
                  {weekDaysList.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd')
                    const dayCobrancas = cobrancasByDate[dateKey] || []
                    const isCurrentDay = isToday(day)
                    return (
                      <div key={dateKey} className={`p-4 ${isCurrentDay ? 'bg-primary/5' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`text-sm font-semibold capitalize ${isCurrentDay ? 'text-primary' : ''}`}>
                            {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                            {isCurrentDay && (
                              <span className="ml-2 text-xs text-primary font-medium">(Hoje)</span>
                            )}
                          </h3>
                          {dayCobrancas.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              {dayCobrancas.filter(c => c.status === 'Pago').length > 0 && (
                                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                  {dayCobrancas.filter(c => c.status === 'Pago').length} P
                                </span>
                              )}
                              {dayCobrancas.filter(c => c.status === 'Pendente' || c.status === 'Parcial').length > 0 && (
                                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-amber-100 dark:bg-amber-900 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                  {dayCobrancas.filter(c => c.status === 'Pendente' || c.status === 'Parcial').length} Pe
                                </span>
                              )}
                              {dayCobrancas.filter(c => c.status === 'Atrasado').length > 0 && (
                                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-red-100 dark:bg-red-900 text-[10px] font-bold text-red-700 dark:text-red-300">
                                  {dayCobrancas.filter(c => c.status === 'Atrasado').length} A
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {dayCobrancas.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">Nenhuma cobrança</p>
                        ) : (
                          <div className="space-y-2">
                            {dayCobrancas.map((c) => {
                              const isDueToday = c.dataVencimento && isSameDay(parseISO(c.dataVencimento), new Date())
                              const isOverdue = c.status === 'Atrasado'
                              const isPaid = c.status === 'Pago'
                              const isParcial = c.status === 'Parcial'
                              const isPendingDueToday = !isPaid && !isOverdue && isDueToday
                              // Color coding per spec
                              const colorClasses = isOverdue
                                ? 'bg-red-100 dark:bg-red-900/30 border-l-4 border-l-red-500'
                                : isPendingDueToday
                                  ? 'bg-amber-100 dark:bg-amber-900/30 border-l-4 border-l-amber-500'
                                  : isPaid
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 border-l-4 border-l-emerald-500'
                                    : isParcial
                                      ? 'bg-blue-100 dark:bg-blue-900/30 border-l-4 border-l-blue-500'
                                      : 'bg-card border-l-4 border-l-yellow-500'
                              return (
                                <div
                                  key={c.id}
                                  className={`rounded-lg border p-3 hover:opacity-90 cursor-pointer transition-opacity ${colorClasses}`}
                                  onClick={() => navigate('cobranca-detalhe', c.id)}
                                >
                                  <div className="flex items-start justify-between mb-1">
                                    <p className="text-sm font-medium leading-tight">
                                      {c.clienteNome || c.cliente?.nomeExibicao}
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                      <StatusBadge status={c.status} />
                                      {!isPaid && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-200/50 dark:text-emerald-400 dark:hover:bg-emerald-800/50 shrink-0"
                                          title="Pagamento rápido"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleQuickPay(c)
                                          }}
                                        >
                                          <CheckCircle className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {c.produtoIdentificador} • {c.locacao?.produtoTipo || c.formaPagamento}
                                  </p>
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-sm font-semibold">
                                      {formatarMoeda(c.totalClientePaga)}
                                    </span>
                                    {c.valorRecebido > 0 && (
                                      <span className="text-xs text-emerald-700 dark:text-emerald-300">
                                        Pago: {formatarMoeda(c.valorRecebido)}
                                      </span>
                                    )}
                                  </div>
                                  {isPendingDueToday && (
                                    <p className="text-[10px] text-amber-600 font-medium mt-1">Vence hoje</p>
                                  )}
                                  {isOverdue && (
                                    <p className="text-[10px] text-red-600 font-medium mt-1">Atrasado</p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      ) : (
        /* List View (mobile-friendly) */
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {listDays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <CalendarIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium">Nenhuma cobrança neste mês</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Selecione outro mês ou crie novas cobranças
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {listDays.map(({ dateKey, date, cobrancas: dayCobrancas }) => {
                  const counts = getStatusCounts(dateKey)
                  return (
                    <div key={dateKey} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold capitalize">
                          {format(date, "dd 'de' MMMM", { locale: ptBR })}
                          {isToday(date) && (
                            <span className="ml-2 text-xs text-primary font-medium">(Hoje)</span>
                          )}
                        </h3>
                        <div className="flex items-center gap-1.5">
                          {counts.pago > 0 && (
                            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-green-100 dark:bg-green-900 text-[10px] font-bold text-green-700 dark:text-green-300">
                              {counts.pago} P
                            </span>
                          )}
                          {counts.pendente > 0 && (
                            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900 text-[10px] font-bold text-yellow-700 dark:text-yellow-300">
                              {counts.pendente} Pe
                            </span>
                          )}
                          {counts.atrasado > 0 && (
                            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-red-100 dark:bg-red-900 text-[10px] font-bold text-red-700 dark:text-red-300">
                              {counts.atrasado} A
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {dayCobrancas.map((c) => {
                          const isOverdue = c.status === 'Atrasado'
                          const isPaid = c.status === 'Pago'
                          const isParcial = c.status === 'Parcial'
                          const isPending = c.status === 'Pendente'
                          // Color coding per spec: green=paid, red=overdue, yellow=pending, orange=partial
                          const colorClasses = isPaid
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 border-l-4 border-l-emerald-500'
                            : isOverdue
                              ? 'bg-red-100 dark:bg-red-900/30 border-l-4 border-l-red-500'
                              : isPending
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-l-yellow-500'
                                : isParcial
                                  ? 'bg-orange-100 dark:bg-orange-900/30 border-l-4 border-l-orange-500'
                                  : 'bg-card border-l-4 border-l-gray-400'
                          return (
                            <div
                              key={c.id}
                              className={`rounded-lg border p-3 hover:opacity-90 cursor-pointer transition-opacity ${colorClasses}`}
                              onClick={() => navigate('cobranca-detalhe', c.id)}
                            >
                              <div className="flex items-start justify-between mb-1">
                                <p className="text-sm font-medium leading-tight">
                                  {c.clienteNome || c.cliente?.nomeExibicao}
                                </p>
                                <StatusBadge status={c.status} />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {c.produtoIdentificador} • {c.locacao?.produtoTipo || c.formaPagamento}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-sm font-semibold">
                                  {formatarMoeda(c.totalClientePaga)}
                                </span>
                                {c.valorRecebido > 0 && (
                                  <span className="text-xs text-green-600">
                                    Pago: {formatarMoeda(c.valorRecebido)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
