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
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import { Plus, Search, MoreHorizontal, Eye, Pencil, Repeat, Warehouse, ChevronLeft, ChevronRight, Download, DollarSign, CheckCircle, XCircle, PauseCircle, Table2, Music, Gamepad2, Wind, CircleDot, ChevronDown, ChevronRight as ChevronRightIcon, LayoutList, FolderTree, MapPin, User, Package } from 'lucide-react'
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

interface GroupedLocacao extends Locacao {
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
    locacoes: GroupedLocacao[]
  }[]
}

export function LocacoesView() {
  const { navigate } = useNavigation()

  // Data state
  const [locacoes, setLocacoes] = useState<Locacao[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // View mode
  const [viewMode, setViewMode] = useState<'flat' | 'agrupado'>('flat')
  const [groupedData, setGroupedData] = useState<GroupedData[]>([])
  const [groupedLoading, setGroupedLoading] = useState(false)

  // Filter state
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>('all')
  const [clienteSearch, setClienteSearch] = useState('')
  const [produtoSearch, setProdutoSearch] = useState('')
  const limit = 20

  // Fetch locacoes (flat)
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

  // Fetch locacoes (grouped)
  const fetchGrouped = useCallback(async () => {
    setGroupedLoading(true)
    try {
      const params = new URLSearchParams({ groupBy: 'route' })
      if (status && status !== 'all') params.set('status', status)
      if (clienteSearch) params.set('clienteId', clienteSearch)
      if (produtoSearch) params.set('produtoId', produtoSearch)

      const res = await fetch(`/api/locacoes?${params}`)
      if (res.ok) {
        const data = await res.json()
        setGroupedData(data.data || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Erro ao buscar locações agrupadas:', error)
    } finally {
      setGroupedLoading(false)
    }
  }, [status, clienteSearch, produtoSearch])

  useEffect(() => {
    if (viewMode === 'flat') {
      fetchLocacoes()
    } else {
      fetchGrouped()
    }
  }, [viewMode, fetchLocacoes, fetchGrouped])

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

  const getProductTypeIcon = (tipoNome: string) => {
    const lower = tipoNome?.toLowerCase() || ''
    if (lower.includes('bilhar')) return <Table2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
    if (lower.includes('jukebox') || lower.includes('música') || lower.includes('musica')) return <Music className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
    if (lower.includes('air hockey') || lower.includes('hockey')) return <Wind className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
    if (lower.includes('pebolim')) return <Gamepad2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
    return <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Locações</h1>
          <p className="text-muted-foreground text-sm">
            {total} locaç{total !== 1 ? 'ões' : 'ão'} encontrada{total !== 1 ? 's' : ''}
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
          className={`gap-1.5 text-xs ${status === 'Ativa' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
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

      {/* View mode toggle */}
      <div className="flex items-center gap-3">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value) setViewMode(value as 'flat' | 'agrupado')
          }}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="flat" className="gap-1.5 px-3">
            <LayoutList className="h-3.5 w-3.5" />
            <span className="text-xs">Lista</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="agrupado" className="gap-1.5 px-3">
            <FolderTree className="h-3.5 w-3.5" />
            <span className="text-xs">Agrupado</span>
          </ToggleGroupItem>
        </ToggleGroup>
        {viewMode === 'agrupado' && (
          <span className="text-xs text-muted-foreground">
            Agrupado por Rota {'>'} Cliente
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
                          <div className="flex items-center gap-1.5">
                            {getProductTypeIcon(locacao.produtoTipo || locacao.produto?.tipoNome)}
                            <span>{locacao.produtoTipo || locacao.produto?.tipoNome}</span>
                          </div>
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
        </>
      ) : (
        /* ============ GROUPED VIEW ============ */
        <GroupedLocacoesView
          data={groupedData}
          loading={groupedLoading}
          navigate={navigate}
          getProductTypeIcon={getProductTypeIcon}
          formatFormaPagamento={formatFormaPagamento}
          formatarMoeda={formatarMoeda}
        />
      )}
    </div>
  )
}

/* ============ GROUPED VIEW COMPONENT ============ */

function GroupedLocacoesView({
  data,
  loading,
  navigate,
  getProductTypeIcon,
  formatFormaPagamento,
  formatarMoeda: formatarMoedaProp,
}: {
  data: GroupedData[]
  loading: boolean
  navigate: (view: string, id?: string) => void
  getProductTypeIcon: (tipoNome: string) => React.ReactNode
  formatFormaPagamento: (fp: string) => string
  formatarMoeda: (valor: number) => string
}) {
  const [openRotas, setOpenRotas] = useState<Record<string, boolean>>({})
  const [openClientes, setOpenClientes] = useState<Record<string, boolean>>({})

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
            <p className="text-lg font-semibold">Nenhuma locação agrupada</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Nenhuma locação encontrada com os filtros atuais para agrupamento por rota
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const toggleRota = (rotaId: string) => {
    setOpenRotas(prev => ({ ...prev, [rotaId]: !prev[rotaId] }))
  }

  const toggleCliente = (clienteId: string) => {
    setOpenClientes(prev => ({ ...prev, [clienteId]: !prev[clienteId] }))
  }

  return (
    <div className="space-y-3">
      {data.map((rotaGroup) => {
        const rotaId = rotaGroup.rota.id
        const isRotaOpen = openRotas[rotaId] ?? false
        const totalLocacoes = rotaGroup.clientes.reduce(
          (acc, c) => acc + c.locacoes.length, 0
        )
        const clientCount = rotaGroup.clientes.length

        return (
          <Collapsible
            key={rotaId}
            open={isRotaOpen}
            onOpenChange={() => toggleRota(rotaId)}
          >
            <Card className="shadow-sm overflow-hidden">
              {/* Route header */}
              <CollapsibleTrigger asChild>
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  style={{ borderLeftWidth: '4px', borderLeftColor: rotaGroup.rota.cor }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: rotaGroup.rota.cor }}
                    />
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <h3 className="font-semibold text-sm">{rotaGroup.rota.descricao}</h3>
                      <p className="text-xs text-muted-foreground">
                        {clientCount} cliente{clientCount !== 1 ? 's' : ''} • {totalLocacoes} locação{totalLocacoes !== 1 ? 'ões' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                                  ({clienteGroup.locacoes.length} locação{clienteGroup.locacoes.length !== 1 ? 'ões' : ''})
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {isClienteOpen ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                ) : (
                                  <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="px-3 pb-3 space-y-1.5">
                              {clienteGroup.locacoes.map((loc) => {
                                const statusColor = loc.status === 'Ativa' ? '#22c55e' : loc.status === 'Finalizada' ? '#9ca3af' : loc.status === 'Cancelada' ? '#ef4444' : '#9ca3af'

                                return (
                                  <div
                                    key={loc.id}
                                    className="flex items-center justify-between gap-3 p-3 rounded-md border bg-background hover:bg-muted/20 cursor-pointer transition-colors"
                                    style={{ borderLeftWidth: '3px', borderLeftColor: statusColor }}
                                    onClick={() => navigate('locacao-detalhe', loc.id)}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span className="text-sm font-medium">{loc.produtoIdentificador || loc.produto?.identificador}</span>
                                      </div>
                                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                          {getProductTypeIcon(loc.produtoTipo || loc.produto?.tipoNome)}
                                          <span>{loc.produtoTipo || loc.produto?.tipoNome}</span>
                                        </div>
                                        <span>•</span>
                                        <span>{formatFormaPagamento(loc.formaPagamento)}</span>
                                        {loc.formaPagamento === 'Periodo' && loc.valorFixo ? (
                                          <>
                                            <span>•</span>
                                            <span className="font-medium">{formatarMoedaProp(loc.valorFixo)}</span>
                                          </>
                                        ) : null}
                                      </div>
                                    </div>
                                    <div className="shrink-0">
                                      <StatusBadge status={loc.status} size="pill" />
                                    </div>
                                  </div>
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
