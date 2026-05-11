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
import { Plus, Search, MoreHorizontal, Eye, Pencil, Repeat, Warehouse, ChevronLeft, ChevronRight } from 'lucide-react'
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
        <Button onClick={() => navigate('locacao-nova')} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Locação
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
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
                placeholder="ID do cliente..."
                className="pl-9"
                value={clienteInput}
                onChange={(e) => setClienteInput(e.target.value)}
              />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ID do produto..."
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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">Nenhuma locação encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tente ajustar os filtros ou crie uma nova locação
              </p>
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
                {locacoes.map((locacao) => (
                  <TableRow
                    key={locacao.id}
                    className="cursor-pointer"
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
