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
} from 'lucide-react'
import { toast } from 'sonner'

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

  // Fetch cobrancas
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

  useEffect(() => {
    fetchCobrancas()
  }, [fetchCobrancas])

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
        fetchCobrancas()
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
    },
    {
      title: 'Total Pendente',
      value: formatarMoeda(summary.totalPendente),
      icon: <Wallet className="h-5 w-5" />,
      accent: 'border-l-4 border-l-yellow-500',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      gradient: 'from-yellow-50 to-yellow-100/50 dark:from-yellow-950 dark:to-yellow-900/30',
    },
    {
      title: 'Total Atrasado',
      value: formatarMoeda(summary.totalAtrasado),
      icon: <AlertTriangle className="h-5 w-5" />,
      accent: 'border-l-4 border-l-red-500',
      iconBg: 'bg-red-100 dark:bg-red-900',
      iconColor: 'text-red-600 dark:text-red-400',
      gradient: 'from-red-50 to-red-100/50 dark:from-red-950 dark:to-red-900/30',
    },
    {
      title: 'Total Geral',
      value: formatarMoeda(summary.totalGeral),
      icon: <DollarSign className="h-5 w-5" />,
      accent: 'border-l-4 border-l-gray-500',
      iconBg: 'bg-gray-100 dark:bg-gray-800',
      iconColor: 'text-gray-600 dark:text-gray-400',
      gradient: 'from-gray-50 to-gray-100/50 dark:from-gray-950 dark:to-gray-900/30',
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
          <Card key={card.title} className={`shadow-sm hover:shadow-md transition-shadow ${card.accent} bg-gradient-to-br ${card.gradient}`}>
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

      {/* Data Table */}
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
                      <StatusBadge status={cobranca.status} size="pill" />
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

      {/* Floating Batch Action Bar */}
      {selectedIds.size > 0 && (
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
    </div>
  )
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
