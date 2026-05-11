'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Download, Package, CheckCircle, Wrench, XCircle, Upload, Loader2, Table2, Music, Gamepad2, Wind, Coffee, Cigarette, CircleDot, Disc3, Trophy, Dices, Box } from 'lucide-react'
import { toast } from 'sonner'

interface Produto {
  id: string
  identificador: string
  tipoId: string
  tipoNome: string
  tipo: { id: string; nome: string }
  descricaoId: string
  descricaoNome: string
  descricao: { id: string; nome: string }
  tamanhoId: string
  tamanhoNome: string
  tamanho: { id: string; nome: string }
  conservacao: string
  statusProduto: string
  numeroRelogio: string
  locacoes: { id: string; status: string }[]
}

interface TipoProduto {
  id: string
  nome: string
}

export function ProdutosView() {
  const { navigate } = useNavigation()

  // Data state
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tipos, setTipos] = useState<TipoProduto[]>([])

  // Filter state
  const [page, setPage] = useState(1)
  const [busca, setBusca] = useState('')
  const [tipoId, setTipoId] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [disponiveis, setDisponiveis] = useState(false)
  const limit = 20

  // Delete dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  // Fetch tipos once
  useEffect(() => {
    async function fetchTipos() {
      try {
        const res = await fetch('/api/tipos-produto')
        if (res.ok) {
          const data = await res.json()
          setTipos(data)
        }
      } catch (error) {
        console.error('Erro ao buscar tipos:', error)
      }
    }
    fetchTipos()
  }, [])

  // Fetch produtos
  const fetchProdutos = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (busca) params.set('busca', busca)
      if (tipoId && tipoId !== 'all') params.set('tipoId', tipoId)
      if (status && status !== 'all') params.set('status', status)
      if (disponiveis) params.set('disponiveis', 'true')

      const res = await fetch(`/api/produtos?${params}`)
      if (res.ok) {
        const data = await res.json()
        setProdutos(data.data || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
    } finally {
      setLoading(false)
    }
  }, [page, busca, tipoId, status, disponiveis])

  useEffect(() => {
    fetchProdutos()
  }, [fetchProdutos])

  // Debounced search
  const [searchInput, setSearchInput] = useState(busca)
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusca(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Delete handler
  const handleDelete = async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/produtos/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Produto excluído com sucesso')
        setDeleteId(null)
        fetchProdutos()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao excluir produto')
      }
    } catch {
      toast.error('Erro ao excluir produto')
    } finally {
      setDeleteLoading(false)
    }
  }

  // CSV Import handler
  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/import/produtos', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const result = await res.json()
        toast.success(`${result.success} produto(s) importado(s) com sucesso${result.errors.length > 0 ? ` (${result.errors.length} erro(s))` : ''}`)
        fetchProdutos()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao importar produtos')
      }
    } catch {
      toast.error('Erro ao importar produtos')
    } finally {
      setImportLoading(false)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const totalPages = Math.ceil(total / limit)

  const conservacaoColors: Record<string, string> = {
    'Ótima': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Boa': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'Regular': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'Ruim': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'Péssima': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  const getProductTypeIcon = (tipoNome: string) => {
    const lower = tipoNome?.toLowerCase() || ''
    if (lower.includes('bilhar')) return <Table2 className="h-4 w-4" />
    if (lower.includes('jukebox') || lower.includes('música') || lower.includes('musica')) return <Music className="h-4 w-4" />
    if (lower.includes('air hockey') || lower.includes('hockey')) return <Wind className="h-4 w-4" />
    if (lower.includes('pebolim')) return <Gamepad2 className="h-4 w-4" />
    if (lower.includes('fumaça') || lower.includes('fumaca') || lower.includes('cigarro')) return <Cigarette className="h-4 w-4" />
    if (lower.includes('café') || lower.includes('cafe')) return <Coffee className="h-4 w-4" />
    if (lower.includes('dart') || lower.includes('dardo')) return <Trophy className="h-4 w-4" />
    if (lower.includes('pinball') || lower.includes('fliperama')) return <Dices className="h-4 w-4" />
    if (lower.includes('disco') || lower.includes('totem')) return <Disc3 className="h-4 w-4" />
    if (lower.includes('box') || lower.includes('caixa')) return <Box className="h-4 w-4" />
    return <CircleDot className="h-4 w-4" />
  }

  const getProductTypeIconColor = (tipoNome: string) => {
    const lower = tipoNome?.toLowerCase() || ''
    if (lower.includes('bilhar')) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900'
    if (lower.includes('jukebox') || lower.includes('música') || lower.includes('musica')) return 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900'
    if (lower.includes('air hockey') || lower.includes('hockey')) return 'text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900'
    if (lower.includes('pebolim')) return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900'
    if (lower.includes('fumaça') || lower.includes('fumaca') || lower.includes('cigarro')) return 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900'
    if (lower.includes('café') || lower.includes('cafe')) return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900'
    return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
  }

  // Status counts for summary cards
  const statusCounts = {
    total: produtos.length > 0 ? total : 0,
    ativos: produtos.filter(p => p.statusProduto === 'Ativo').length,
    manutencao: produtos.filter(p => p.statusProduto === 'Manutenção').length,
    inativos: produtos.filter(p => p.statusProduto === 'Inativo').length,
  }

  const statusBorderColor = (status: string) => {
    switch (status) {
      case 'Ativo': return 'border-l-4 border-l-green-500'
      case 'Inativo': return 'border-l-4 border-l-red-400'
      case 'Manutenção': return 'border-l-4 border-l-purple-500'
      default: return 'border-l-4 border-l-gray-400'
    }
  }

  const summaryCards = [
    {
      title: 'Total Produtos',
      value: statusCounts.total,
      icon: <Package className="h-5 w-5" />,
      accent: 'border-l-4 border-l-gray-500',
      iconBg: 'bg-gray-100 dark:bg-gray-800',
      iconColor: 'text-gray-600 dark:text-gray-400',
      gradient: 'from-gray-50 to-gray-100/50 dark:from-gray-950 dark:to-gray-900/30',
      cardClass: 'stat-card-blue',
    },
    {
      title: 'Ativos',
      value: statusCounts.ativos,
      icon: <CheckCircle className="h-5 w-5" />,
      accent: 'border-l-4 border-l-green-500',
      iconBg: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-600 dark:text-green-400',
      gradient: 'from-green-50 to-green-100/50 dark:from-green-950 dark:to-green-900/30',
      cardClass: 'stat-card-emerald',
    },
    {
      title: 'Em Manutenção',
      value: statusCounts.manutencao,
      icon: <Wrench className="h-5 w-5" />,
      accent: 'border-l-4 border-l-purple-500',
      iconBg: 'bg-purple-100 dark:bg-purple-900',
      iconColor: 'text-purple-600 dark:text-purple-400',
      gradient: 'from-purple-50 to-purple-100/50 dark:from-purple-950 dark:to-purple-900/30',
      cardClass: 'stat-card-purple',
    },
    {
      title: 'Inativos',
      value: statusCounts.inativos,
      icon: <XCircle className="h-5 w-5" />,
      accent: 'border-l-4 border-l-red-500',
      iconBg: 'bg-red-100 dark:bg-red-900',
      iconColor: 'text-red-600 dark:text-red-400',
      gradient: 'from-red-50 to-red-100/50 dark:from-red-950 dark:to-red-900/30',
      cardClass: 'stat-card-red',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Produtos</h1>
          <p className="text-muted-foreground text-sm">
            {total} produto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportCSV}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs sm:h-auto sm:text-sm sm:gap-2"
            disabled={importLoading}
            onClick={() => fileInputRef.current?.click()}
          >
            {importLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{importLoading ? 'Importando...' : 'Importar CSV'}</span>
            <span className="sm:hidden">Importar</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs sm:h-auto sm:text-sm sm:gap-2" onClick={() => {
            toast.info('Exportação iniciada...')
            window.open('/api/produtos?export=csv', '_blank')
          }}>
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          <Button onClick={() => navigate('produto-novo')} size="sm" className="gap-1.5 h-8 text-xs sm:h-auto sm:text-sm sm:gap-2">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Novo Produto</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className={`shadow-sm ${card.accent} bg-gradient-to-br ${card.gradient} ${card.cardClass}`}>
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium">{card.title}</p>
                  <p className="text-xl sm:text-2xl font-bold">{card.value}</p>
                </div>
                <div className={`rounded-xl p-2 sm:p-2.5 ${card.iconBg} shadow-sm`}>
                  <span className={card.iconColor}>{card.icon}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="shadow-sm bg-muted/30">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por identificador..."
                className="pl-8 h-9 text-sm"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Select value={tipoId} onValueChange={(v) => { setTipoId(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {tipos.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
                <SelectItem value="Manutenção">Manutenção</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 shrink-0">
              <Checkbox
                id="disponiveis"
                checked={disponiveis}
                onCheckedChange={(checked) => { setDisponiveis(checked === true); setPage(1) }}
              />
              <Label htmlFor="disponiveis" className="text-sm cursor-pointer whitespace-nowrap">
                Disponíveis
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton />
          ) : produtos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
                <Package className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-semibold">Nenhum produto encontrado</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Tente ajustar os filtros ou crie um novo produto para começar
              </p>
              <Button
                className="mt-4 gap-2"
                onClick={() => navigate('produto-novo')}
              >
                <Plus className="h-4 w-4" />
                Criar Primeiro Produto
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden md:table-cell">Descrição</TableHead>
                  <TableHead className="hidden lg:table-cell">Tamanho</TableHead>
                  <TableHead className="hidden md:table-cell">Conservação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Relógio</TableHead>
                  <TableHead className="w-[50px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((produto) => (
                  <TableRow
                    key={produto.id}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${statusBorderColor(produto.statusProduto)}`}
                    onClick={() => navigate('produto-detalhe', produto.id)}
                  >
                    <TableCell className="font-medium">{produto.identificador}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`rounded-md p-1 ${getProductTypeIconColor(produto.tipoNome || produto.tipo?.nome || '')}`}>
                          {getProductTypeIcon(produto.tipoNome || produto.tipo?.nome || '')}
                        </div>
                        <span>{produto.tipoNome || produto.tipo?.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {produto.descricaoNome || produto.descricao?.nome}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {produto.tamanhoNome || produto.tamanho?.nome}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border-0 ${conservacaoColors[produto.conservacao] || 'bg-gray-100 text-gray-800'}`}>
                        {produto.conservacao}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={produto.statusProduto} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {produto.numeroRelogio}
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
                              navigate('produto-detalhe', produto.id)
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate('produto-editar', produto.id)
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteId(produto.id)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O produto será marcado como excluído no sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
