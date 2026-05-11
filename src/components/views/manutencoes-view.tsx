'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { format, parseISO } from 'date-fns'
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

export function ManutencoesView() {
  const { navigate } = useNavigation()

  // Data state
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

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

  // Fetch manutencoes
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

  useEffect(() => {
    fetchManutencoes()
  }, [fetchManutencoes])

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manutenções</h1>
          <p className="text-muted-foreground text-sm">
            {total} manutenção{total !== 1 ? 'ões' : ''} encontrada{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true) }} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Manutenção
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-[180px]">
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
              <SelectTrigger className="w-full sm:w-[180px]">
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
                {manutencoes.map((m) => (
                  <TableRow key={m.id}>
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

      {/* Nova Manutenção Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Manutenção</DialogTitle>
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
                  Criar Manutenção
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
