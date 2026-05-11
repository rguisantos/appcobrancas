'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'

interface HistoricoRelogio {
  id: string
  produtoId: string
  relogioAnterior: string
  relogioNovo: string
  motivo: string | null
  observacao: string | null
  usuarioId: string | null
  usuarioNome: string | null
  produto: {
    id: string
    identificador: string
    numeroRelogio: string
  } | null
  createdAt: string
}

interface Produto {
  id: string
  identificador: string
  numeroRelogio: string
  tipoNome: string
  descricaoNome: string
}

export function RelogiosView() {
  const { navigate } = useNavigation()

  // Data state
  const [historicos, setHistoricos] = useState<HistoricoRelogio[]>([])
  const [loading, setLoading] = useState(true)

  // Filter state
  const [produtoSearch, setProdutoSearch] = useState('')
  const [produtoIdFilter, setProdutoIdFilter] = useState('')
  const [produtoInputFilter, setProdutoInputFilter] = useState('')
  const [filterProdutos, setFilterProdutos] = useState<Produto[]>([])
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const filterDropdownRef = useRef<HTMLDivElement>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [produtoId, setProdutoId] = useState('')
  const [produtoSearchForm, setProdutoSearchForm] = useState('')
  const [formProdutos, setFormProdutos] = useState<Produto[]>([])
  const [formProdutosLoading, setFormProdutosLoading] = useState(false)
  const [showFormDropdown, setShowFormDropdown] = useState(false)
  const [relogioAnterior, setRelogioAnterior] = useState('')
  const [relogioNovo, setRelogioNovo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [observacao, setObservacao] = useState('')

  const formDropdownRef = useRef<HTMLDivElement>(null)

  // Fetch historicos
  const fetchHistoricos = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (produtoIdFilter) params.set('produtoId', produtoIdFilter)

      const res = await fetch(`/api/historico-relogio?${params}`)
      if (res.ok) {
        const data = await res.json()
        setHistoricos(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Erro ao buscar histórico de relógio:', error)
    } finally {
      setLoading(false)
    }
  }, [produtoIdFilter])

  useEffect(() => {
    fetchHistoricos()
  }, [fetchHistoricos])

  // Filter produtos search
  useEffect(() => {
    if (!produtoInputFilter) {
      setFilterProdutos([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/produtos?busca=${encodeURIComponent(produtoInputFilter)}&limit=10`)
        if (res.ok) {
          const data = await res.json()
          setFilterProdutos(data.data || [])
          setFilterDropdownOpen(true)
        }
      } catch {
        // ignore
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [produtoInputFilter])

  // Form produtos search
  useEffect(() => {
    if (!produtoSearchForm) {
      setFormProdutos([])
      return
    }

    const timer = setTimeout(async () => {
      setFormProdutosLoading(true)
      try {
        const res = await fetch(`/api/produtos?busca=${encodeURIComponent(produtoSearchForm)}&limit=10`)
        if (res.ok) {
          const data = await res.json()
          setFormProdutos(data.data || [])
          setShowFormDropdown(true)
        }
      } catch {
        // ignore
      } finally {
        setFormProdutosLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [produtoSearchForm])

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setFilterDropdownOpen(false)
      }
      if (formDropdownRef.current && !formDropdownRef.current.contains(e.target as Node)) {
        setShowFormDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy')
    } catch {
      return dateStr
    }
  }

  const resetForm = () => {
    setProdutoId('')
    setProdutoSearchForm('')
    setRelogioAnterior('')
    setRelogioNovo('')
    setMotivo('')
    setObservacao('')
  }

  const handleSubmit = async () => {
    if (!produtoId) {
      toast.error('Selecione um produto')
      return
    }
    if (!relogioNovo.trim()) {
      toast.error('Novo relógio é obrigatório')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/historico-relogio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produtoId,
          relogioAnterior: relogioAnterior || '0',
          relogioNovo: relogioNovo.trim(),
          motivo: motivo.trim() || undefined,
          observacao: observacao.trim() || undefined,
        }),
      })

      if (res.ok) {
        toast.success('Alteração de relógio registrada com sucesso')
        setDialogOpen(false)
        resetForm()
        fetchHistoricos()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao registrar alteração')
      }
    } catch {
      toast.error('Erro ao registrar alteração')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold">Histórico de Relógio</h1>
          <p className="text-muted-foreground text-sm">
            {historicos.length} registro{historicos.length !== 1 ? 's' : ''} encontrado{historicos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true) }} size="sm" className="gap-1.5 h-8 text-xs sm:h-auto sm:text-sm sm:gap-2">
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Registrar Alteração</span>
          <span className="sm:hidden">Registrar</span>
        </Button>
      </div>

      {/* Filter */}
      <Card className="shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-3">
            <div className="relative flex-1" ref={filterDropdownRef}>
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-8 h-8 sm:h-9 text-sm"
                placeholder="Filtrar por produto..."
                value={produtoIdFilter ? `✓ ${produtoInputFilter}` : produtoInputFilter}
                onChange={(e) => {
                  setProdutoIdFilter('')
                  setProdutoInputFilter(e.target.value)
                }}
              />
              {filterDropdownOpen && filterProdutos.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filterProdutos.map((p) => (
                    <button
                      key={p.id}
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                      onClick={() => {
                        setProdutoIdFilter(p.id)
                        setProdutoInputFilter(p.identificador)
                        setFilterDropdownOpen(false)
                      }}
                    >
                      <span className="font-medium">{p.identificador}</span>
                      <span className="text-muted-foreground"> - {p.tipoNome} (Relógio: {p.numeroRelogio})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {produtoIdFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setProdutoIdFilter('')
                  setProdutoInputFilter('')
                }}
              >
                Limpar
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
          ) : historicos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Gauge className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">Nenhum registro encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tente ajustar o filtro ou registre uma nova alteração
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Relógio Anterior</TableHead>
                  <TableHead className="w-[40px]" />
                  <TableHead>Relógio Novo</TableHead>
                  <TableHead className="hidden md:table-cell">Motivo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="hidden lg:table-cell">Usuário</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historicos.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">
                      {h.produto?.identificador || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {h.relogioAnterior}
                    </TableCell>
                    <TableCell className="text-center">
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground inline" />
                    </TableCell>
                    <TableCell className="font-semibold">
                      {h.relogioNovo}
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[200px] truncate text-muted-foreground text-sm">
                      {h.motivo || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(h.createdAt)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                      {h.usuarioNome || '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => navigate('produto-detalhe', h.produtoId)}
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

      {/* Registrar Alteração Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Alteração de Relógio</DialogTitle>
            <DialogDescription>
              Registre uma alteração no número do relógio de um produto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Produto Select */}
            <div className="space-y-2" ref={formDropdownRef}>
              <Label>Produto *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar produto por identificador..."
                  value={produtoId ? `✓ ${produtoSearchForm}` : produtoSearchForm}
                  onChange={(e) => {
                    setProdutoId('')
                    setRelogioAnterior('')
                    setProdutoSearchForm(e.target.value)
                  }}
                  onFocus={() => {
                    if (formProdutos.length > 0) setShowFormDropdown(true)
                  }}
                />
                {showFormDropdown && formProdutos.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {formProdutos.map((p) => (
                      <button
                        key={p.id}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                        onClick={() => {
                          setProdutoId(p.id)
                          setProdutoSearchForm(p.identificador)
                          setRelogioAnterior(p.numeroRelogio)
                          setShowFormDropdown(false)
                        }}
                      >
                        <span className="font-medium">{p.identificador}</span>
                        <span className="text-muted-foreground"> - {p.tipoNome} (Relógio: {p.numeroRelogio})</span>
                      </button>
                    ))}
                  </div>
                )}
                {formProdutosLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Relógio Anterior (auto-filled, readonly) */}
            <div className="space-y-2">
              <Label>Relógio Anterior</Label>
              <Input
                value={relogioAnterior}
                readOnly
                className="bg-muted"
                placeholder="Selecione um produto primeiro"
              />
            </div>

            {/* Relógio Novo */}
            <div className="space-y-2">
              <Label>Relógio Novo *</Label>
              <Input
                value={relogioNovo}
                onChange={(e) => setRelogioNovo(e.target.value)}
                placeholder="Novo número do relógio"
              />
            </div>

            {/* Preview */}
            {relogioAnterior && relogioNovo && (
              <div className="flex items-center justify-center gap-3 py-2 px-4 bg-muted rounded-lg">
                <span className="text-lg font-mono font-bold">{relogioAnterior}</span>
                <ArrowRight className="h-5 w-5 text-primary" />
                <span className="text-lg font-mono font-bold text-primary">{relogioNovo}</span>
              </div>
            )}

            {/* Motivo */}
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo da alteração (opcional)"
              />
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
                  Registrando...
                </>
              ) : (
                <>
                  <Gauge className="h-4 w-4" />
                  Registrar Alteração
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
