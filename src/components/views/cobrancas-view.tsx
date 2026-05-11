'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { format, parseISO } from 'date-fns'
import { Checkbox } from '@/components/ui/checkbox'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Wallet,
  Loader2,
  Download,
  X,
  Bell,
  Clock,
  XCircle,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  LayoutList,
  FolderTree,
  MapPin,
  Package,
  User,
  Expand,
  Shrink,
  BarChart3,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

interface Cobranca {
  id: string
  locacaoId: string
  clienteId: string
  clienteNome: string
  produtoId: string | null
  produtoIdentificador: string
  dataInicio: string
  dataFim: string
  dataPagamento: string | null
  dataVencimento: string | null
  relogioAnterior: number
  relogioAtual: number
  fichasRodadas: number
  valorFicha: number
  totalBruto: number
  descontoPartidasQtd: number | null
  descontoPartidasValor: number | null
  descontoDinheiro: number | null
  percentualEmpresa: number
  subtotalAposDescontos: number
  valorPercentual: number
  totalClientePaga: number
  valorRecebido: number
  saldoDevedorGerado: number
  status: string
  formaPagamento: string
  observacao: string | null
  locacao: {
    id: string
    formaPagamento: string
  } | null
  cliente: {
    id: string
    nomeExibicao: string
  } | null
  produto: {
    id: string
    identificador: string
  } | null
}

interface GroupedCobranca extends Cobranca {
  cliente: {
    id: string
    nomeExibicao: string
    rota: {
      id: string
      descricao: string
      cor: string
    } | null
  }
}

interface GroupedData {
  rota: {
    id: string
    descricao: string
    cor: string
  }
  clientes: {
    cliente: {
      id: string
      nomeExibicao: string
    }
    locacoes: {
      locacaoId: string
      produtoIdentificador: string
      cobrancas: GroupedCobranca[]
    }[]
  }[]
}

interface Summary {
  totalRecebido: number
  totalPendente: number
  totalAtrasado: number
  totalGeral: number
}

export function CobrancasView() {
  const { navigate } = useNavigation()

  // Data state
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary>({
    totalRecebido: 0,
    totalPendente: 0,
    totalAtrasado: 0,
    totalGeral: 0,
  })

  // View mode
  const [viewMode, setViewMode] = useState<'flat' | 'agrupado'>('agrupado')
  const [groupedData, setGroupedData] = useState<GroupedData[]>([])
  const [groupedLoading, setGroupedLoading] = useState(false)

  // Filter state
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>('all')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [clienteSearch, setClienteSearch] = useState('')
  const limit = 20

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentCobranca, setPaymentCobranca] = useState<Cobranca | null>(null)
  const [paymentValue, setPaymentValue] = useState('')
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchLoading, setBatchLoading] = useState(false)

  // Batch payment state
  const [batchPaymentOpen, setBatchPaymentOpen] = useState(false)
  const [batchPaymentMethod, setBatchPaymentMethod] = useState('Pix')
  const [batchPaymentDate, setBatchPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [batchPaymentProgress, setBatchPaymentProgress] = useState(0)
  const [batchPaymentTotal, setBatchPaymentTotal] = useState(0)
  const [batchPaymentDone, setBatchPaymentDone] = useState(0)
  const [batchPaymentSubmitting, setBatchPaymentSubmitting] = useState(false)

  // Fetch cobrancas (flat)
  const fetchCobrancas = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (status && status !== 'all') params.set('status', status)
      if (dataInicio) params.set('periodoInicio', dataInicio)
      if (dataFim) params.set('periodoFim', dataFim)
      if (clienteSearch) params.set('clienteId', clienteSearch)

      const res = await fetch(`/api/cobrancas?${params}`)
      if (res.ok) {
        const data = await res.json()
        const items = data.data || []
        setCobrancas(items)
        setTotal(data.total || 0)

        // Calculate summary from all items
        const totalRecebido = items.reduce((acc: number, c: Cobranca) => {
          if (c.status === 'Pago' || c.status === 'Parcial') return acc + c.valorRecebido
          return acc
        }, 0)
        const totalPendente = items.reduce((acc: number, c: Cobranca) => {
          if (c.status === 'Pendente' || c.status === 'Parcial') return acc + (c.totalClientePaga - c.valorRecebido)
          return acc
        }, 0)
        const totalAtrasado = items.reduce((acc: number, c: Cobranca) => {
          if (c.status === 'Atrasado') return acc + (c.totalClientePaga - c.valorRecebido)
          return acc
        }, 0)
        const totalGeral = items.reduce((acc: number, c: Cobranca) => acc + c.totalClientePaga, 0)

        setSummary({ totalRecebido, totalPendente, totalAtrasado, totalGeral })
      }
    } catch (error) {
      console.error('Erro ao buscar cobranças:', error)
    } finally {
      setLoading(false)
    }
  }, [page, status, dataInicio, dataFim, clienteSearch])

  // Fetch cobrancas (grouped)
  const fetchGrouped = useCallback(async () => {
    setGroupedLoading(true)
    try {
      const params = new URLSearchParams({ groupBy: 'route' })
      if (status && status !== 'all') params.set('status', status)
      if (dataInicio) params.set('periodoInicio', dataInicio)
      if (dataFim) params.set('periodoFim', dataFim)
      if (clienteSearch) params.set('clienteId', clienteSearch)

      const res = await fetch(`/api/cobrancas?${params}`)
      if (res.ok) {
        const data = await res.json()
        setGroupedData(data.data || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Erro ao buscar cobranças agrupadas:', error)
    } finally {
      setGroupedLoading(false)
    }
  }, [status, dataInicio, dataFim, clienteSearch])

  useEffect(() => {
    if (viewMode === 'flat') {
      fetchCobrancas()
    } else {
      fetchGrouped()
    }
  }, [viewMode, fetchCobrancas, fetchGrouped])

  // Debounced search for cliente
  const [clienteInput, setClienteInput] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setClienteSearch(clienteInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [clienteInput])

  const handleStatusChange = (value: string) => {
    setStatus(value)
    setPage(1)
  }

  const handleDateFilter = () => {
    setPage(1)
    fetchCobrancas()
  }

  const totalPages = Math.ceil(total / limit)

  // Open payment dialog
  const openPaymentDialog = (cobranca: Cobranca) => {
    setPaymentCobranca(cobranca)
    setPaymentValue(cobranca.totalClientePaga.toString())
    setPaymentDialogOpen(true)
  }

  // Submit payment
  const handlePayment = async () => {
    if (!paymentCobranca) return

    setPaymentSubmitting(true)
    try {
      const valorRecebido = parseFloat(paymentValue) || 0
      const newStatus = valorRecebido >= paymentCobranca.totalClientePaga ? 'Pago' : 'Parcial'

      const res = await fetch(`/api/cobrancas/${paymentCobranca.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locacaoId: paymentCobranca.locacaoId,
          dataInicio: paymentCobranca.dataInicio,
          dataFim: paymentCobranca.dataFim,
          relogioAnterior: paymentCobranca.relogioAnterior,
          relogioAtual: paymentCobranca.relogioAtual,
          descontoPartidasQtd: paymentCobranca.descontoPartidasQtd,
          descontoPartidasValor: paymentCobranca.descontoPartidasValor,
          descontoDinheiro: paymentCobranca.descontoDinheiro,
          valorRecebido,
          status: newStatus,
          observacao: paymentCobranca.observacao,
        }),
      })

      if (res.ok) {
        toast.success('Pagamento registrado com sucesso')
        setPaymentDialogOpen(false)
        if (viewMode === 'flat') fetchCobrancas()
        else fetchGrouped()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao registrar pagamento')
      }
    } catch {
      toast.error('Erro ao registrar pagamento')
    } finally {
      setPaymentSubmitting(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy')
    } catch {
      return dateStr
    }
  }

  // Batch operations
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === cobrancas.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(cobrancas.map((c) => c.id)))
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleBatchPayment = async () => {
    const selectedCobrancas = cobrancas.filter(c => selectedIds.has(c.id))
    const unpaidCobrancas = selectedCobrancas.filter(c => c.status !== 'Pago' && c.status !== 'Cancelada')
    if (unpaidCobrancas.length === 0) {
      toast.error('Nenhuma cobrança pendente selecionada')
      return
    }

    setBatchPaymentSubmitting(true)
    setBatchPaymentDone(0)
    setBatchPaymentProgress(0)
    setBatchPaymentTotal(unpaidCobrancas.length)

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < unpaidCobrancas.length; i++) {
      const cobranca = unpaidCobrancas[i]
      const valorRecebido = cobranca.totalClientePaga
      const newStatus = 'Pago'

      try {
        const res = await fetch(`/api/cobrancas/${cobranca.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locacaoId: cobranca.locacaoId,
            dataInicio: cobranca.dataInicio,
            dataFim: cobranca.dataFim,
            relogioAnterior: cobranca.relogioAnterior,
            relogioAtual: cobranca.relogioAtual,
            descontoPartidasQtd: cobranca.descontoPartidasQtd,
            descontoPartidasValor: cobranca.descontoPartidasValor,
            descontoDinheiro: cobranca.descontoDinheiro,
            valorRecebido,
            status: newStatus,
            observacao: cobranca.observacao,
          }),
        })
        if (res.ok) {
          successCount++
        } else {
          errorCount++
        }
      } catch {
        errorCount++
      }

      setBatchPaymentDone(i + 1)
      setBatchPaymentProgress(Math.round(((i + 1) / unpaidCobrancas.length) * 100))
    }

    setBatchPaymentSubmitting(false)
    if (successCount > 0) {
      toast.success(`${successCount} cobrança(s) paga(s) com sucesso${errorCount > 0 ? ` (${errorCount} com erro)` : ''}`)
      setSelectedIds(new Set())
      fetchCobrancas()
    }
    if (errorCount > 0 && successCount === 0) {
      toast.error('Erro ao registrar pagamentos em lote')
    }
  }

  const batchTotal = cobrancas
    .filter(c => selectedIds.has(c.id) && c.status !== 'Pago' && c.status !== 'Cancelada')
    .reduce((acc, c) => acc + c.totalClientePaga, 0)

  const handleBatchAction = async (action: 'marcar-atrasado' | 'enviar-lembrete') => {
    if (selectedIds.size === 0) return

    setBatchLoading(true)
    try {
      const res = await fetch('/api/cobrancas/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          cobrancaIds: Array.from(selectedIds),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (action === 'marcar-atrasado') {
          toast.success(`${data.updated} cobrança(s) marcada(s) como atrasada(s)`)
        } else {
          toast.success(`Lembretes simulados para ${data.updated} cobrança(s)`)
        }
        setSelectedIds(new Set())
        fetchCobrancas()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro na operação batch')
      }
    } catch {
      toast.error('Erro na operação batch')
    } finally {
      setBatchLoading(false)
    }
  }

  const summaryCards = [
    {
      title: 'Total Recebido',
      value: formatarMoeda(summary.totalRecebido),
      icon: <TrendingUp className="h-5 w-5" />,
      accent: 'border-l-4 border-l-green-500',
      iconBg: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-600 dark:text-green-400',
      gradient: 'from-green-50 to-green-100/50 dark:from-green-950 dark:to-green-900/30',
      cardClass: 'stat-card-emerald',
    },
    {
      title: 'Total Pendente',
      value: formatarMoeda(summary.totalPendente),
      icon: <Wallet className="h-5 w-5" />,
      accent: 'border-l-4 border-l-yellow-500',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      gradient: 'from-yellow-50 to-yellow-100/50 dark:from-yellow-950 dark:to-yellow-900/30',
      cardClass: 'stat-card-amber',
    },
    {
      title: 'Total Atrasado',
      value: formatarMoeda(summary.totalAtrasado),
      icon: <AlertTriangle className="h-5 w-5" />,
      accent: 'border-l-4 border-l-red-500',
      iconBg: 'bg-red-100 dark:bg-red-900',
      iconColor: 'text-red-600 dark:text-red-400',
      gradient: 'from-red-50 to-red-100/50 dark:from-red-950 dark:to-red-900/30',
      cardClass: 'stat-card-red',
    },
    {
      title: 'Total Geral',
      value: formatarMoeda(summary.totalGeral),
      icon: <DollarSign className="h-5 w-5" />,
      accent: 'border-l-4 border-l-gray-500',
      iconBg: 'bg-gray-100 dark:bg-gray-800',
      iconColor: 'text-gray-600 dark:text-gray-400',
      gradient: 'from-gray-50 to-gray-100/50 dark:from-gray-950 dark:to-gray-900/30',
      cardClass: 'stat-card-blue',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cobranças</h1>
          <p className="text-muted-foreground text-sm">
            {total} cobrança{total !== 1 ? 's' : ''} encontrada{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => {
            toast.info('Exportação iniciada...')
            window.open('/api/cobrancas?export=csv', '_blank')
          }}>
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={() => navigate('cobranca-nova')} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Cobrança
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className={`shadow-sm hover:shadow-md transition-shadow shine-effect ${card.accent} bg-gradient-to-br ${card.gradient} ${card.cardClass}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium">{card.title}</p>
                  <p className="text-3xl font-extrabold tracking-tight">{card.value}</p>
                </div>
                <div className={`rounded-full p-2.5 shadow-md ${card.iconBg}`}>
                  <span className={card.iconColor}>{card.icon}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total em cobranças summary */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-muted-foreground">
          Total em cobranças: <span className="font-bold text-foreground count-up">{formatarMoeda(summary.totalGeral)}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {total} cobrança{total !== 1 ? 's' : ''} nesta página
        </p>
      </div>

      {/* Filters */}
      <Card className="shadow-sm bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full sm:w-[180px] rounded-lg">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Pago">Pago</SelectItem>
                <SelectItem value="Parcial">Parcial</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Atrasado">Atrasado</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 flex-1">
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                placeholder="Data início"
                className="w-full sm:w-auto rounded-lg"
              />
              <span className="text-muted-foreground text-sm">a</span>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                placeholder="Data fim"
                className="w-full sm:w-auto rounded-lg"
              />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ID do cliente..."
                className="pl-9 rounded-lg"
                value={clienteInput}
                onChange={(e) => setClienteInput(e.target.value)}
              />
            </div>
            {(status !== 'all' || dataInicio || dataFim || clienteSearch) && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setStatus('all')
                  setDataInicio('')
                  setDataFim('')
                  setClienteInput('')
                  setClienteSearch('')
                  setPage(1)
                }}
              >
                <X className="h-3.5 w-3.5" />
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View mode toggle */}
      <div className="flex items-center gap-3">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value) setViewMode(value as 'flat' | 'agrupado')
          }}
          variant="outline"
        >
          <ToggleGroupItem value="flat" className="gap-2 px-4 py-2">
            <LayoutList className="h-4 w-4" />
            <span className="text-sm font-medium">Lista</span>
            <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{total}</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="agrupado" className="gap-2 px-4 py-2">
            <FolderTree className="h-4 w-4" />
            <span className="text-sm font-medium">Agrupado</span>
            <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{groupedData.length} {groupedData.length === 1 ? 'rota' : 'rotas'}</span>
          </ToggleGroupItem>
        </ToggleGroup>
        {viewMode === 'agrupado' && (
          <span className="text-xs text-muted-foreground">
            Agrupado por Rota {'>'} Cliente {'>'} Locação
          </span>
        )}
      </div>

      {/* Conditional view rendering */}
      {viewMode === 'flat' ? (
        /* ============ FLAT TABLE VIEW ============ */
        <>
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <TableSkeleton />
              ) : cobrancas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mb-6 shadow-sm">
                    <CreditCard className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-lg font-semibold">Nenhuma cobrança encontrada</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                    Tente ajustar os filtros ou crie uma nova cobrança para começar
                  </p>
                  <Button
                    className="mt-4 gap-2"
                    onClick={() => navigate('cobranca-nova')}
                  >
                    <Plus className="h-4 w-4" />
                    Criar Primeira Cobrança
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={selectedIds.size === cobrancas.length && cobrancas.length > 0}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="hidden md:table-cell">Período</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="hidden md:table-cell">Recebido</TableHead>
                      <TableHead className="hidden lg:table-cell">Saldo Devedor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Data Pagamento</TableHead>
                      <TableHead className="w-[50px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cobrancas.map((cobranca, idx) => {
                      const statusBorder = cobranca.status === 'Pago' ? 'border-l-4 border-l-green-500' : cobranca.status === 'Pendente' ? 'border-l-4 border-l-yellow-500' : cobranca.status === 'Atrasado' ? 'border-l-4 border-l-red-500' : cobranca.status === 'Parcial' ? 'border-l-4 border-l-orange-500' : 'border-l-4 border-l-gray-400'
                      const isSelected = selectedIds.has(cobranca.id)
                      return (
                      <TableRow
                        key={cobranca.id}
                        className={`stagger-row cursor-pointer hover:bg-muted/50 transition-colors ${statusBorder} ${isSelected ? 'bg-primary/5' : ''} ${idx % 2 === 1 ? 'bg-muted/10' : ''}`}
                        onClick={() => navigate('cobranca-detalhe', cobranca.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(cobranca.id)}
                            aria-label={`Selecionar cobrança de ${cobranca.clienteNome}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {cobranca.clienteNome || cobranca.cliente?.nomeExibicao}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cobranca.produtoIdentificador || cobranca.produto?.identificador}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                          {formatDate(cobranca.dataInicio)} - {formatDate(cobranca.dataFim)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatarMoeda(cobranca.totalClientePaga)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-green-600 dark:text-green-400">
                          {formatarMoeda(cobranca.valorRecebido)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {cobranca.saldoDevedorGerado > 0 ? (
                            <span className="text-red-600 dark:text-red-400">
                              {formatarMoeda(cobranca.saldoDevedorGerado)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={cobranca.status} size="pill" />
                            {cobranca.status === 'Parcial' && cobranca.totalClientePaga > 0 && (
                              <div className="mini-progress w-16">
                                <div
                                  className="h-full rounded-full bg-blue-500 progress-animated"
                                  style={{ width: `${Math.min(100, (cobranca.valorRecebido / cobranca.totalClientePaga) * 100)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                          {cobranca.dataPagamento ? formatDate(cobranca.dataPagamento) : '—'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate('cobranca-detalhe', cobranca.id)
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate('cobranca-editar', cobranca.id)
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openPaymentDialog(cobranca)
                                }}
                              >
                                <CreditCard className="mr-2 h-4 w-4" />
                                Registrar Pagamento
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      )
                    })}
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
        /* ============ GROUPED VIEW ============ */
        <GroupedCobrancasView
          data={groupedData}
          loading={groupedLoading}
          navigate={navigate}
          formatDate={formatDate}
          openPaymentDialog={openPaymentDialog}
        />
      )}

      {/* Floating Batch Action Bar */}
      {viewMode === 'flat' && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300 backdrop-blur-bar">
          <div className="flex items-center gap-3 bg-foreground/95 text-background px-5 py-3 rounded-xl shadow-xl ring-1 ring-white/10">
            <span className="text-sm font-medium whitespace-nowrap">
              {selectedIds.size} cobrança{selectedIds.size !== 1 ? 's' : ''} selecionada{selectedIds.size !== 1 ? 's' : ''}
            </span>
            <div className="h-6 w-px bg-background/20" />
            <Button
              size="sm"
              className="gap-1.5 h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white"
              disabled={batchLoading}
              onClick={() => handleBatchAction('marcar-atrasado')}
            >
              <Clock className="h-3.5 w-3.5" />
              Marcar como Atrasado
            </Button>
            <Button
              size="sm"
              className="gap-1.5 h-8 text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
              disabled={batchLoading}
              onClick={() => handleBatchAction('enviar-lembrete')}
            >
              <Bell className="h-3.5 w-3.5" />
              Enviar Lembrete
            </Button>
            <Button
              size="sm"
              className="gap-1.5 h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
              disabled={batchLoading}
              onClick={() => setBatchPaymentOpen(true)}
            >
              <CreditCard className="h-3.5 w-3.5" />
              Registrar Pagamento em Lote
            </Button>
            <div className="h-6 w-px bg-background/20" />
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 h-8 text-xs text-background hover:bg-background/10 hover:text-background"
              onClick={clearSelection}
              disabled={batchLoading}
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancelar Seleção
            </Button>
            {batchLoading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </div>
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>
              Registre o pagamento para a cobrança de {paymentCobranca?.clienteNome}
            </DialogDescription>
          </DialogHeader>
          {paymentCobranca && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Valor Total</p>
                  <p className="font-semibold">{formatarMoeda(paymentCobranca.totalClientePaga)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor Já Recebido</p>
                  <p className="font-semibold text-green-600">{formatarMoeda(paymentCobranca.valorRecebido)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Saldo Devedor</p>
                  <p className="font-semibold text-red-600">{formatarMoeda(paymentCobranca.saldoDevedorGerado)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status Atual</p>
                  <StatusBadge status={paymentCobranca.status} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentValue">Valor do Pagamento (R$)</Label>
                <Input
                  id="paymentValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentValue}
                  onChange={(e) => setPaymentValue(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={paymentSubmitting}
            >
              Cancelar
            </Button>
            <Button onClick={handlePayment} disabled={paymentSubmitting} className="gap-2">
              {paymentSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Registrar Pagamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Payment Dialog */}
      <Dialog open={batchPaymentOpen} onOpenChange={setBatchPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento em Lote</DialogTitle>
            <DialogDescription>
              Registre o pagamento para todas as cobranças selecionadas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cobranças selecionadas</span>
                <span className="font-semibold">{cobrancas.filter(c => selectedIds.has(c.id) && c.status !== 'Pago' && c.status !== 'Cancelada').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valor total a pagar</span>
                <span className="font-bold text-lg text-green-600">{formatarMoeda(batchTotal)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={batchPaymentMethod} onValueChange={setBatchPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pix">Pix</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Cartão">Cartão</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data do Pagamento</Label>
                <Input
                  type="date"
                  value={batchPaymentDate}
                  onChange={(e) => setBatchPaymentDate(e.target.value)}
                />
              </div>
            </div>
            {batchPaymentSubmitting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">{batchPaymentDone}/{batchPaymentTotal}</span>
                </div>
                <Progress value={batchPaymentProgress} className="h-2" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => !batchPaymentSubmitting && setBatchPaymentOpen(false)}
              disabled={batchPaymentSubmitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleBatchPayment} disabled={batchPaymentSubmitting || batchTotal === 0} className="gap-2">
              {batchPaymentSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando {batchPaymentDone}/{batchPaymentTotal}...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Registrar Pagamentos ({formatarMoeda(batchTotal)})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ============ GROUPED VIEW COMPONENT ============ */

function GroupedCobrancasView({
  data,
  loading,
  navigate,
  formatDate,
  openPaymentDialog,
}: {
  data: GroupedData[]
  loading: boolean
  navigate: (view: string, id?: string) => void
  formatDate: (dateStr: string | null) => string
  openPaymentDialog: (cobranca: Cobranca) => void
}) {
  const [openRotas, setOpenRotas] = useState<Record<string, boolean>>({})
  const [openClientes, setOpenClientes] = useState<Record<string, boolean>>({})
  const [openLocacoes, setOpenLocacoes] = useState<Record<string, boolean>>({})
  const [allExpanded, setAllExpanded] = useState(false)

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mb-6 shadow-sm">
              <FolderTree className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <p className="text-lg font-semibold">Nenhuma cobrança agrupada</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Nenhuma cobrança encontrada com os filtros atuais para agrupamento por rota
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Compute overall summary stats
  const totalRoutes = data.length
  const totalClients = data.reduce((acc, rg) => acc + rg.clientes.length, 0)
  const totalCobrancasAll = data.reduce(
    (acc, rg) => acc + rg.clientes.reduce(
      (a, c) => a + c.locacoes.reduce((b, l) => b + l.cobrancas.length, 0), 0
    ), 0
  )
  const totalAmountAll = data.reduce(
    (acc, rg) => acc + rg.clientes.reduce(
      (a, c) => a + c.locacoes.reduce(
        (b, l) => b + l.cobrancas.reduce((s, cob) => s + cob.totalClientePaga, 0), 0
      ), 0
    ), 0
  )

  const toggleRota = (rotaId: string) => {
    setOpenRotas(prev => ({ ...prev, [rotaId]: !prev[rotaId] }))
  }

  const toggleCliente = (clienteId: string) => {
    setOpenClientes(prev => ({ ...prev, [clienteId]: !prev[clienteId] }))
  }

  const toggleLocacao = (locacaoId: string) => {
    setOpenLocacoes(prev => ({ ...prev, [locacaoId]: !prev[locacaoId] }))
  }

  const toggleAllExpanded = () => {
    if (allExpanded) {
      setOpenRotas({})
      setOpenClientes({})
      setOpenLocacoes({})
      setAllExpanded(false)
    } else {
      const newRotas: Record<string, boolean> = {}
      const newClientes: Record<string, boolean> = {}
      const newLocacoes: Record<string, boolean> = {}
      data.forEach(rg => {
        newRotas[rg.rota.id] = true
        rg.clientes.forEach(c => {
          newClientes[c.cliente.id] = true
          c.locacoes.forEach(l => {
            newLocacoes[l.locacaoId] = true
          })
        })
      })
      setOpenRotas(newRotas)
      setOpenClientes(newClientes)
      setOpenLocacoes(newLocacoes)
      setAllExpanded(true)
    }
  }

  return (
    <div className="space-y-3">
      {/* Expand/Collapse All + Summary Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Resumo</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="gap-1 text-xs">
              <MapPin className="h-3 w-3" />
              {totalRoutes} {totalRoutes === 1 ? 'rota' : 'rotas'}
            </Badge>
            <Badge variant="secondary" className="gap-1 text-xs">
              <User className="h-3 w-3" />
              {totalClients} {totalClients === 1 ? 'cliente' : 'clientes'}
            </Badge>
            <Badge variant="secondary" className="gap-1 text-xs">
              <CreditCard className="h-3 w-3" />
              {totalCobrancasAll} cobrança{totalCobrancasAll !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs font-semibold">
              <DollarSign className="h-3 w-3" />
              {formatarMoedaStatic(totalAmountAll)}
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={toggleAllExpanded}
        >
          {allExpanded ? (
            <>
              <Shrink className="h-3.5 w-3.5" />
              Recolher Tudo
            </>
          ) : (
            <>
              <Expand className="h-3.5 w-3.5" />
              Expandir Tudo
            </>
          )}
        </Button>
      </div>

      {data.map((rotaGroup) => {
        const rotaId = rotaGroup.rota.id
        const isRotaOpen = openRotas[rotaId] ?? false
        const totalCobrancas = rotaGroup.clientes.reduce(
          (acc, c) => acc + c.locacoes.reduce((a, l) => a + l.cobrancas.length, 0), 0
        )
        const totalAmount = rotaGroup.clientes.reduce(
          (acc, c) => acc + c.locacoes.reduce(
            (a, l) => a + l.cobrancas.reduce((s, cob) => s + cob.totalClientePaga, 0), 0
          ), 0
        )
        const clientCount = rotaGroup.clientes.length

        // Status breakdown for this route
        const allCobrancas = rotaGroup.clientes.flatMap(c => c.locacoes.flatMap(l => l.cobrancas))
        const pagoCount = allCobrancas.filter(c => c.status === 'Pago').length
        const parcialCount = allCobrancas.filter(c => c.status === 'Parcial').length
        const pendenteCount = allCobrancas.filter(c => c.status === 'Pendente').length
        const atrasadoCount = allCobrancas.filter(c => c.status === 'Atrasado').length

        // Total pendente/atrasado amounts
        const totalPendente = allCobrancas
          .filter(c => c.status === 'Pendente' || c.status === 'Parcial')
          .reduce((acc, c) => acc + (c.totalClientePaga - c.valorRecebido), 0)
        const totalAtrasado = allCobrancas
          .filter(c => c.status === 'Atrasado')
          .reduce((acc, c) => acc + (c.totalClientePaga - c.valorRecebido), 0)

        return (
          <Collapsible
            key={rotaId}
            open={isRotaOpen}
            onOpenChange={() => toggleRota(rotaId)}
          >
            <Card className="shadow-sm overflow-hidden" style={{ borderLeftWidth: '4px', borderLeftColor: rotaGroup.rota.cor }}>
              {/* Route header with gradient background */}
              <CollapsibleTrigger asChild>
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  style={{ background: `linear-gradient(to right, ${rotaGroup.rota.cor}10, transparent)` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: rotaGroup.rota.cor }}
                    />
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <h3 className="font-semibold text-sm">{rotaGroup.rota.descricao}</h3>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className="text-xs text-muted-foreground">
                          {clientCount} cliente{clientCount !== 1 ? 's' : ''} • {totalCobrancas} cobrança{totalCobrancas !== 1 ? 's' : ''}
                        </p>
                        {/* Status count badges */}
                        {pagoCount > 0 && (
                          <Badge className="gap-1 text-[10px] px-1.5 py-0 h-5 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 border-green-200 dark:border-green-800">
                            <CheckCircle className="h-2.5 w-2.5" />
                            {pagoCount}
                          </Badge>
                        )}
                        {parcialCount > 0 && (
                          <Badge className="gap-1 text-[10px] px-1.5 py-0 h-5 bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                            <Clock className="h-2.5 w-2.5" />
                            {parcialCount}
                          </Badge>
                        )}
                        {pendenteCount > 0 && (
                          <Badge className="gap-1 text-[10px] px-1.5 py-0 h-5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">
                            <Wallet className="h-2.5 w-2.5" />
                            {pendenteCount}
                          </Badge>
                        )}
                        {atrasadoCount > 0 && (
                          <Badge className="gap-1 text-[10px] px-1.5 py-0 h-5 bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400 border-red-200 dark:border-red-800">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {atrasadoCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-sm font-bold">{formatarMoedaStatic(totalAmount)}</span>
                      {/* Highlighted pendente/atrasado amounts */}
                      {totalPendente > 0 && (
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          Pendente: {formatarMoedaStatic(totalPendente)}
                        </span>
                      )}
                      {totalAtrasado > 0 && (
                        <span className="text-[10px] font-medium text-red-600 dark:text-red-400">
                          Atrasado: {formatarMoedaStatic(totalAtrasado)}
                        </span>
                      )}
                    </div>
                    {isRotaOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t px-4 pb-3 pt-2 space-y-2">
                  {rotaGroup.clientes.map((clienteGroup) => {
                    const clId = clienteGroup.cliente.id
                    const isClienteOpen = openClientes[clId] ?? false
                    const clienteTotal = clienteGroup.locacoes.reduce(
                      (acc, l) => acc + l.cobrancas.reduce((s, cob) => s + cob.totalClientePaga, 0), 0
                    )
                    const clienteCobCount = clienteGroup.locacoes.reduce(
                      (acc, l) => acc + l.cobrancas.length, 0
                    )

                    return (
                      <Collapsible
                        key={clId}
                        open={isClienteOpen}
                        onOpenChange={() => toggleCliente(clId)}
                      >
                        <div className="rounded-lg border bg-muted/20">
                          {/* Client header */}
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/40 transition-colors rounded-t-lg">
                              <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="font-medium text-sm">{clienteGroup.cliente.nomeExibicao}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({clienteCobCount} cobrança{clienteCobCount !== 1 ? 's' : ''})
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{formatarMoedaStatic(clienteTotal)}</span>
                                {/* Nova Cobrança button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigate('cobranca-nova')
                                  }}
                                >
                                  <Plus className="h-3 w-3" />
                                  Nova
                                </Button>
                                {isClienteOpen ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                ) : (
                                  <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="px-3 pb-3 space-y-2">
                              {clienteGroup.locacoes.map((locacaoGroup) => {
                                const locId = locacaoGroup.locacaoId
                                const isLocOpen = openLocacoes[locId] ?? false
                                const locTotal = locacaoGroup.cobrancas.reduce(
                                  (acc, cob) => acc + cob.totalClientePaga, 0
                                )

                                return (
                                  <Collapsible
                                    key={locId}
                                    open={isLocOpen}
                                    onOpenChange={() => toggleLocacao(locId)}
                                  >
                                    <div className="rounded-md border bg-background">
                                      {/* Locação header */}
                                      <CollapsibleTrigger asChild>
                                        <div className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-md">
                                          <div className="flex items-center gap-2">
                                            <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            <span className="text-sm font-medium">{locacaoGroup.produtoIdentificador}</span>
                                            <span className="text-xs text-muted-foreground">
                                              ({locacaoGroup.cobrancas.length})
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold">{formatarMoedaStatic(locTotal)}</span>
                                            {isLocOpen ? (
                                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                            ) : (
                                              <ChevronRightIcon className="h-3 w-3 text-muted-foreground" />
                                            )}
                                          </div>
                                        </div>
                                      </CollapsibleTrigger>

                                      <CollapsibleContent>
                                        <div className="px-2.5 pb-2.5 space-y-1.5">
                                          {locacaoGroup.cobrancas.map((cob) => (
                                            <div
                                              key={cob.id}
                                              className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/10 hover:bg-muted/20 cursor-pointer transition-colors"
                                              style={{ borderLeftWidth: '3px', borderLeftColor: cob.status === 'Pago' ? '#22c55e' : cob.status === 'Pendente' ? '#eab308' : cob.status === 'Atrasado' ? '#ef4444' : cob.status === 'Parcial' ? '#f97316' : '#9ca3af' }}
                                              onClick={() => navigate('cobranca-detalhe', cob.id)}
                                            >
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs text-muted-foreground">
                                                    {formatDate(cob.dataInicio)} - {formatDate(cob.dataFim)}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                  <span className="text-sm font-medium">{formatarMoedaStatic(cob.totalClientePaga)}</span>
                                                  <span className="text-xs text-green-600 dark:text-green-400">
                                                    Recebido: {formatarMoedaStatic(cob.valorRecebido)}
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2 shrink-0">
                                                <StatusBadge status={cob.status} size="pill" />
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-7 w-7"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    openPaymentDialog(cob)
                                                  }}
                                                >
                                                  <CreditCard className="h-3.5 w-3.5" />
                                                </Button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </CollapsibleContent>
                                    </div>
                                  </Collapsible>
                                )
                              })}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    )
                  })}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )
      })}
    </div>
  )
}

// Static helper to avoid import issues in sub-component
function formatarMoedaStatic(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: 9 }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
