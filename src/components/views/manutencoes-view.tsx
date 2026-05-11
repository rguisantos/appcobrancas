'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Badge,
} from '@/components/ui/badge'
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Loader2,
  Calendar,
  List,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarPlus,
} from 'lucide-react'
import { toast } from 'sonner'

interface Manutencao {
  id: string
  produtoId: string
  produtoIdentificador: string | null
  tipo: string
  descricao: string
  dataInicio: string
  dataFim: string | null
  custo: number
  status: string
  observacao: string | null
  produto: {
    id: string
    identificador: string
  } | null
  createdAt: string
}

interface Produto {
  id: string
  identificador: string
  tipoNome: string
  descricaoNome: string
}

interface ManutencaoStats {
  total: number
  emAndamento: number
  concluidas: number
  canceladas: number
}

const tipoLabels: Record<string, string> = {
  preventiva: 'Preventiva',
  corretiva: 'Corretiva',
  troca_pano: 'Troca Pano',
  outra: 'Outra',
}

const tipoColors: Record<string, string> = {
  preventiva: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  corretiva: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  troca_pano: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  outra: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

const statusDotColor: Record<string, string> = {
  EmAndamento: 'bg-orange-500',
  Concluida: 'bg-green-500',
  Cancelada: 'bg-gray-400',
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function ManutencoesView() {
  const { navigate } = useNavigation()

  // Data state
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [allManutencoes, setAllManutencoes] = useState<Manutencao[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ManutencaoStats>({ total: 0, emAndamento: 0, concluidas: 0, canceladas: 0 })

  // View mode
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDateManutencoes, setSelectedDateManutencoes] = useState<Manutencao[]>([])

  // Filter state
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tipoFilter, setTipoFilter] = useState<string>('all')
  const limit = 20

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [produtoId, setProdutoId] = useState('')
  const [produtoSearch, setProdutoSearch] = useState('')
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [produtosLoading, setProdutosLoading] = useState(false)
  const [showProdutoDropdown, setShowProdutoDropdown] = useState(false)
  const [tipo, setTipo] = useState<'preventiva' | 'corretiva' | 'troca_pano' | 'outra'>('preventiva')
  const [descricao, setDescricao] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [custo, setCusto] = useState('')
  const [observacao, setObservacao] = useState('')
  const [formStatus, setFormStatus] = useState<'EmAndamento' | 'Concluida' | 'Cancelada'>('EmAndamento')

  const produtoDropdownRef = useRef<HTMLDivElement>(null)

  // Fetch manutencoes (paginated for list view)
  const fetchManutencoes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (tipoFilter && tipoFilter !== 'all') params.set('tipo', tipoFilter)

      const res = await fetch(`/api/manutencoes?${params}`)
      if (res.ok) {
        const data = await res.json()
        setManutencoes(data.data || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Erro ao buscar manutenções:', error)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, tipoFilter])

  // Fetch all manutencoes for calendar & stats
  const fetchAllManutencoes = useCallback(async () => {
    try {
      const res = await fetch('/api/manutencoes?limit=1000')
      if (res.ok) {
        const data = await res.json()
        const items: Manutencao[] = data.data || []
        setAllManutencoes(items)

        // Calculate stats
        setStats({
          total: items.length,
          emAndamento: items.filter((m) => m.status === 'EmAndamento').length,
          concluidas: items.filter((m) => m.status === 'Concluida').length,
          canceladas: items.filter((m) => m.status === 'Cancelada').length,
        })
      }
    } catch (error) {
      console.error('Erro ao buscar todas manutenções:', error)
    }
  }, [])

  useEffect(() => {
    fetchManutencoes()
  }, [fetchManutencoes])

  useEffect(() => {
    fetchAllManutencoes()
  }, [fetchAllManutencoes])

  // Search produtos
  useEffect(() => {
    if (!produtoSearch) {
      setProdutos([])
      return
    }

    const timer = setTimeout(async () => {
      setProdutosLoading(true)
      try {
        const res = await fetch(`/api/produtos?busca=${encodeURIComponent(produtoSearch)}&limit=10`)
        if (res.ok) {
          const data = await res.json()
          setProdutos(data.data || [])
          setShowProdutoDropdown(true)
        }
      } catch {
        // ignore
      } finally {
        setProdutosLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [produtoSearch])

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (produtoDropdownRef.current && !produtoDropdownRef.current.contains(e.target as Node)) {
        setShowProdutoDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const totalPages = Math.ceil(total / limit)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy')
    } catch {
      return dateStr
    }
  }

  const resetForm = () => {
    setProdutoId('')
    setProdutoSearch('')
    setTipo('preventiva')
    setDescricao('')
    setDataInicio('')
    setCusto('')
    setObservacao('')
    setFormStatus('EmAndamento')
  }

  const handleSubmit = async () => {
    if (!produtoId) {
      toast.error('Selecione um produto')
      return
    }
    if (!descricao.trim()) {
      toast.error('Descrição é obrigatória')
      return
    }
    if (!dataInicio) {
      toast.error('Data de início é obrigatória')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/manutencoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produtoId,
          tipo,
          descricao: descricao.trim(),
          dataInicio,
          custo: parseFloat(custo) || 0,
          status: formStatus,
          observacao: observacao.trim() || undefined,
        }),
      })

      if (res.ok) {
        toast.success('Manutenção criada com sucesso')
        setDialogOpen(false)
        resetForm()
        fetchManutencoes()
        fetchAllManutencoes()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao criar manutenção')
      }
    } catch {
      toast.error('Erro ao criar manutenção')
    } finally {
      setSubmitting(false)
    }
  }

  // Calendar helpers
  const calendarDays = (() => {
    const monthStart = startOfMonth(calendarMonth)
    const monthEnd = endOfMonth(calendarMonth)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

    // Pad start with empty cells
    const startDay = getDay(monthStart)
    const padded: (Date | null)[] = Array(startDay).fill(null)
    return [...padded, ...days]
  })()

  const getManutencoesForDate = (date: Date) => {
    return allManutencoes.filter((m) => {
      try {
        const startDate = parseISO(m.dataInicio)
        return isSameDay(startDate, date)
      } catch {
        return false
      }
    })
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setSelectedDateManutencoes(getManutencoesForDate(date))
  }

  const statsCards = [
    {
      title: 'Total Manutenções',
      value: stats.total,
      icon: <Wrench className="h-5 w-5" />,
      iconBg: 'bg-slate-100 dark:bg-slate-800',
      iconColor: 'text-slate-600 dark:text-slate-400',
      accent: 'border-l-4 border-l-slate-500',
      cardClass: 'stat-card-blue',
    },
    {
      title: 'Em Andamento',
      value: stats.emAndamento,
      icon: <Clock className="h-5 w-5" />,
      iconBg: 'bg-orange-100 dark:bg-orange-900',
      iconColor: 'text-orange-600 dark:text-orange-400',
      accent: 'border-l-4 border-l-orange-500',
      cardClass: 'stat-card-amber',
      pulse: true,
    },
    {
      title: 'Concluídas',
      value: stats.concluidas,
      icon: <CheckCircle2 className="h-5 w-5" />,
      iconBg: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-600 dark:text-green-400',
      accent: 'border-l-4 border-l-green-500',
      cardClass: 'stat-card-emerald',
    },
    {
      title: 'Canceladas',
      value: stats.canceladas,
      icon: <XCircle className="h-5 w-5" />,
      iconBg: 'bg-gray-100 dark:bg-gray-800',
      iconColor: 'text-gray-600 dark:text-gray-400',
      accent: 'border-l-4 border-l-gray-400',
      cardClass: 'stat-card-red',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Manutenções</h1>
          <p className="text-muted-foreground text-sm">
            {total} manutenç{total !== 1 ? 'ões' : 'ão'} encontrada{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true) }} size="sm" className="gap-1.5 h-8 text-xs sm:h-auto sm:text-sm sm:gap-2">
          <CalendarPlus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Agendar Manutenção</span>
          <span className="sm:hidden">Agendar</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card) => (
          <Card key={card.title} className={`shadow-sm ${card.accent || ''} ${card.cardClass || ''}`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{card.title}</p>
                  <p className="text-xl sm:text-2xl font-bold">{card.value}</p>
                </div>
                <div className={`rounded-lg p-2 sm:p-2.5 ${card.iconBg} ${card.pulse ? 'status-pulse' : ''}`}>
                  <span className={card.iconColor}>{card.icon}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5"
          onClick={() => setViewMode('list')}
        >
          <List className="h-4 w-4" />
          Lista
        </Button>
        <Button
          variant={viewMode === 'calendar' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5"
          onClick={() => setViewMode('calendar')}
        >
          <Calendar className="h-4 w-4" />
          Calendário
        </Button>
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Filters */}
          <Card className="shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                  <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="EmAndamento">Em Andamento</SelectItem>
                    <SelectItem value="Concluida">Concluída</SelectItem>
                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v); setPage(1) }}>
                  <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="preventiva">Preventiva</SelectItem>
                    <SelectItem value="corretiva">Corretiva</SelectItem>
                    <SelectItem value="troca_pano">Troca Pano</SelectItem>
                    <SelectItem value="outra">Outra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <TableSkeleton />
              ) : manutencoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Wrench className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium">Nenhuma manutenção encontrada</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tente ajustar os filtros ou crie uma nova manutenção
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="hidden md:table-cell">Descrição</TableHead>
                      <TableHead>Data Início</TableHead>
                      <TableHead className="hidden md:table-cell">Data Fim</TableHead>
                      <TableHead>Custo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manutencoes.map((m, idx) => (
                      <TableRow key={m.id} className={`hover:bg-muted/50 transition-colors ${idx % 2 === 1 ? 'bg-muted/10' : ''} ${m.status === 'EmAndamento' ? 'border-l-4 border-l-orange-400' : m.status === 'Concluida' ? 'border-l-4 border-l-green-400' : m.status === 'Cancelada' ? 'border-l-4 border-l-gray-400' : ''}`}>
                        <TableCell className="font-medium">
                          {m.produtoIdentificador || m.produto?.identificador || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs border-0 ${tipoColors[m.tipo] || 'bg-gray-100 text-gray-800'}`}
                          >
                            {tipoLabels[m.tipo] || m.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[200px] truncate text-muted-foreground text-sm">
                          {m.descricao}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(m.dataInicio)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                          {formatDate(m.dataFim)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatarMoeda(m.custo)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={m.status} />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => navigate('produto-detalhe', m.produtoId)}
                          >
                            Ver Produto
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Calendar View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="shadow-sm lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {format(calendarMonth, 'MMMM yyyy', { locale: ptBR })}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setCalendarMonth(new Date())}
                  >
                    Hoje
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, idx) => {
                  if (!date) {
                    return <div key={`empty-${idx}`} className="h-20" />
                  }

                  const dayManutencoes = getManutencoesForDate(date)
                  const isToday = isSameDay(date, new Date())
                  const isSelected = selectedDate && isSameDay(date, selectedDate)

                  return (
                    <button
                      key={date.toISOString()}
                      className={`h-20 p-1.5 rounded-lg border text-left transition-colors hover:bg-muted/50 ${
                        isToday
                          ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                          : isSelected
                          ? 'border-primary bg-primary/5'
                          : dayManutencoes.length > 0
                          ? 'border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/20'
                          : 'border-border/50'
                      }`}
                      onClick={() => handleDateClick(date)}
                    >
                      <span className={`text-xs font-medium ${isToday ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                        {format(date, 'd')}
                      </span>
                      {dayManutencoes.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {dayManutencoes.slice(0, 3).map((m) => (
                            <span
                              key={m.id}
                              className={`h-2 w-2 rounded-full ${statusDotColor[m.status] || 'bg-gray-400'}`}
                              title={`${tipoLabels[m.tipo] || m.tipo} - ${m.status}`}
                            />
                          ))}
                          {dayManutencoes.length > 3 && (
                            <span className="text-[9px] text-muted-foreground">+{dayManutencoes.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected date details */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {selectedDate
                  ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
                  : 'Selecione uma data'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Clique em uma data para ver as manutenções agendadas
                  </p>
                </div>
              ) : selectedDateManutencoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Wrench className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma manutenção nesta data
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1.5"
                    onClick={() => {
                      setDataInicio(format(selectedDate, 'yyyy-MM-dd'))
                      setDialogOpen(true)
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agendar
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedDateManutencoes.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate('produto-detalhe', m.produtoId)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {m.produtoIdentificador || m.produto?.identificador || '—'}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-xs border-0 mt-1 ${tipoColors[m.tipo] || 'bg-gray-100 text-gray-800'}`}
                          >
                            {tipoLabels[m.tipo] || m.tipo}
                          </Badge>
                        </div>
                        <StatusBadge status={m.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {m.descricao}
                      </p>
                      {m.custo > 0 && (
                        <p className="text-xs font-medium mt-1">
                          {formatarMoeda(m.custo)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Agendar Manutenção Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agendar Manutenção</DialogTitle>
            <DialogDescription>
              Registre uma nova manutenção para um produto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Produto Select */}
            <div className="space-y-2" ref={produtoDropdownRef}>
              <Label>Produto *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar produto por identificador..."
                  value={produtoId ? `✓ ${produtoSearch}` : produtoSearch}
                  onChange={(e) => {
                    setProdutoId('')
                    setProdutoSearch(e.target.value)
                  }}
                  onFocus={() => {
                    if (produtos.length > 0) setShowProdutoDropdown(true)
                  }}
                />
                {showProdutoDropdown && produtos.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {produtos.map((p) => (
                      <button
                        key={p.id}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                        onClick={() => {
                          setProdutoId(p.id)
                          setProdutoSearch(p.identificador)
                          setShowProdutoDropdown(false)
                        }}
                      >
                        <span className="font-medium">{p.identificador}</span>
                        <span className="text-muted-foreground"> - {p.tipoNome} {p.descricaoNome}</span>
                      </button>
                    ))}
                  </div>
                )}
                {produtosLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={(v: 'preventiva' | 'corretiva' | 'troca_pano' | 'outra') => setTipo(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventiva">Preventiva</SelectItem>
                  <SelectItem value="corretiva">Corretiva</SelectItem>
                  <SelectItem value="troca_pano">Troca Pano</SelectItem>
                  <SelectItem value="outra">Outra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva a manutenção..."
                rows={3}
              />
            </div>

            {/* Data Início + Custo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data Início *</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Custo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={custo}
                  onChange={(e) => setCusto(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={(v: 'EmAndamento' | 'Concluida' | 'Cancelada') => setFormStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EmAndamento">Em Andamento</SelectItem>
                  <SelectItem value="Concluida">Concluída</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Observações adicionais..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4" />
                  Agendar Manutenção
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: 8 }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
