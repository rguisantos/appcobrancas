'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
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
import { Plus, Search, MoreHorizontal, Eye, Pencil, Repeat, Warehouse, ChevronLeft, ChevronRight, Download, DollarSign, CheckCircle, XCircle, PauseCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { format } from 'date-fns'

interface Locacao {
  id: string
  clienteId: string
  clienteNome: string
  produtoId: string
  produtoIdentificador: string
  produtoTipo: string
  dataLocacao: string
  dataFim?: string
  formaPagamento: string
  numeroRelogio: string
  valorFixo?: number
  precoFicha: number
  percentualEmpresa: number
  status: string
  cliente: {
    id: string
    nomeExibicao: string
  }
  produto: {
    id: string
    identificador: string
    tipoNome: string
  }
}

export function LocacoesView() {
  const { navigate } = useNavigation()

  // Data state
  const [locacoes, setLocacoes] = useState<Locacao[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filter state
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>('all')
  const [clienteSearch, setClienteSearch] = useState('')
  const [produtoSearch, setProdutoSearch] = useState('')
  const limit = 20

  // Fetch locacoes
  const fetchLocacoes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (status && status !== 'all') params.set('status', status)
      if (clienteSearch) params.set('clienteId', clienteSearch)
      if (produtoSearch) params.set('produtoId', produtoSearch)

      const res = await fetch(`/api/locacoes?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLocacoes(data.data || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Erro ao buscar locações:', error)
    } finally {
      setLoading(false)
    }
  }, [page, status, clienteSearch, produtoSearch])

  useEffect(() => {
    fetchLocacoes()
  }, [fetchLocacoes])

  // Debounced search for cliente
  const [clienteInput, setClienteInput] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setClienteSearch(clienteInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [clienteInput])

  // Debounced search for produto
  const [produtoInput, setProdutoInput] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setProdutoSearch(produtoInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [produtoInput])

  const handleStatusChange = (value: string) => {
    setStatus(value)
    setPage(1)
  }

  const totalPages = Math.ceil(total / limit)

  // Status counts for summary cards
  const statusCounts = {
    total: locacoes.length > 0 ? total : 0,
    ativas: locacoes.filter(l => l.status === 'Ativa').length,
    finalizadas: locacoes.filter(l => l.status === 'Finalizada').length,
    canceladas: locacoes.filter(l => l.status === 'Cancelada').length,
  }

  const statusBorderColor = (status: string) => {
    switch (status) {
      case 'Ativa': return 'border-l-4 border-l-green-500'
      case 'Finalizada': return 'border-l-4 border-l-gray-400'
      case 'Cancelada': return 'border-l-4 border-l-red-400'
      default: return 'border-l-4 border-l-gray-400'
    }
  }

  const summaryCards = [
    {
      title: 'Total Locações',
      value: statusCounts.total,
      icon: <DollarSign className="h-5 w-5" />,
      accent: 'border-l-4 border-l-gray-500',
      iconBg: 'bg-gray-100 dark:bg-gray-800',
      iconColor: 'text-gray-600 dark:text-gray-400',
      gradient: 'from-gray-50 to-gray-100/50 dark:from-gray-950 dark:to-gray-900/30',
    },
    {
      title: 'Ativas',
      value: statusCounts.ativas,
      icon: <CheckCircle className="h-5 w-5" />,
      accent: 'border-l-4 border-l-green-500',
      iconBg: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-600 dark:text-green-400',
      gradient: 'from-green-50 to-green-100/50 dark:from-green-950 dark:to-green-900/30',
    },
    {
      title: 'Finalizadas',
      value: statusCounts.finalizadas,
      icon: <PauseCircle className="h-5 w-5" />,
      accent: 'border-l-4 border-l-gray-400',
      iconBg: 'bg-gray-100 dark:bg-gray-800',
      iconColor: 'text-gray-600 dark:text-gray-400',
      gradient: 'from-gray-50 to-gray-100/50 dark:from-gray-950 dark:to-gray-900/30',
    },
    {
      title: 'Canceladas',
      value: statusCounts.canceladas,
      icon: <XCircle className="h-5 w-5" />,
      accent: 'border-l-4 border-l-red-500',
      iconBg: 'bg-red-100 dark:bg-red-900',
      iconColor: 'text-red-600 dark:text-red-400',
      gradient: 'from-red-50 to-red-100/50 dark:from-red-950 dark:to-red-900/30',
    },
  ]

  const formatFormaPagamento = (fp: string) => {
    const map: Record<string, string> = {
      'Periodo': 'Período',
      'PercentualPagar': '% Pagar',
      'PercentualReceber': '% Receber',
    }
    return map[fp] || fp
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Locações</h1>
          <p className="text-muted-foreground text-sm">
            {total} locação{total !== 1 ? 'ões' : ''} encontrada{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => {
            toast.info('Exportação iniciada...')
            window.open('/api/locacoes?export=csv', '_blank')
          }}>
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={() => navigate('locacao-nova')} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Locação
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className={`shadow-sm ${card.accent} bg-gradient-to-br ${card.gradient}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium">{card.title}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${card.iconBg} shadow-sm`}>
                  <span className={card.iconColor}>{card.icon}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick filter for active locações */}
      <div className="flex items-center gap-2">
        <Button
          variant={status === 'Ativa' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => handleStatusChange(status === 'Ativa' ? 'all' : 'Ativa')}
        >
          <CheckCircle className="h-3.5 w-3.5" />
          {status === 'Ativa' ? 'Ver Todas as Locações' : 'Ver Todas as Locações Ativas'}
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-sm bg-muted/30">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Ativa">Ativa</SelectItem>
                <SelectItem value="Finalizada">Finalizada</SelectItem>
                <SelectItem value="Cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome do cliente..."
                className="pl-9"
                value={clienteInput}
                onChange={(e) => setClienteInput(e.target.value)}
              />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por produto..."
                className="pl-9"
                value={produtoInput}
                onChange={(e) => setProdutoInput(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton />
          ) : locacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mb-6 shadow-sm">
                <DollarSign className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-semibold">Nenhuma locação encontrada</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Tente ajustar os filtros ou crie uma nova locação para começar
              </p>
              <Button
                className="mt-4 gap-2"
                onClick={() => navigate('locacao-nova')}
              >
                <Plus className="h-4 w-4" />
                Criar Primeira Locação
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="hidden md:table-cell">Tipo</TableHead>
                  <TableHead>Data Locação</TableHead>
                  <TableHead className="hidden md:table-cell">Pagamento</TableHead>
                  <TableHead className="hidden lg:table-cell">Relógio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locacoes.map((locacao, idx) => (
                  <TableRow
                    key={locacao.id}
                    className={`stagger-row cursor-pointer hover:bg-muted/50 transition-colors ${statusBorderColor(locacao.status)} ${idx % 2 === 1 ? 'bg-muted/10' : ''}`}
                    onClick={() => navigate('locacao-detalhe', locacao.id)}
                  >
                    <TableCell className="font-medium">{locacao.clienteNome || locacao.cliente?.nomeExibicao}</TableCell>
                    <TableCell>{locacao.produtoIdentificador || locacao.produto?.identificador}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {locacao.produtoTipo || locacao.produto?.tipoNome}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {locacao.dataLocacao}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs">{formatFormaPagamento(locacao.formaPagamento)}</span>
                      {locacao.formaPagamento === 'Periodo' && locacao.valorFixo ? (
                        <span className="block text-xs text-muted-foreground">
                          {formatarMoeda(locacao.valorFixo)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {locacao.numeroRelogio}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={locacao.status} />
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
                              navigate('locacao-detalhe', locacao.id)
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate('locacao-editar', locacao.id)
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate('locacao-editar', locacao.id, { relocar: 'true' })
                            }}
                          >
                            <Repeat className="mr-2 h-4 w-4" />
                            Relocar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              toast.info('Funcionalidade de enviar para estoque será implementada')
                            }}
                          >
                            <Warehouse className="mr-2 h-4 w-4" />
                            Enviar Estoque
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: 8 }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
