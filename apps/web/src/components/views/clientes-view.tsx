'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Download, Users, Upload, Loader2, FileDown, FileText, UserPlus, Phone } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'

interface Cliente {
  id: string
  identificador: string
  nomeExibicao: string
  telefonePrincipal: string
  cidade: string
  estado: string
  status: string
  rota: {
    id: string
    descricao: string
    cor: string
  } | null
}

interface Rota {
  id: string
  descricao: string
  cor: string
}

export function ClientesView() {
  const { navigate } = useNavigation()

  // Data state
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [rotas, setRotas] = useState<Rota[]>([])

  // Filter state
  const [page, setPage] = useState(1)
  const [busca, setBusca] = useState('')
  const [rotaId, setRotaId] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const limit = 20

  // Delete dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  // Quick create dialog state
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  const [quickNome, setQuickNome] = useState('')
  const [quickTelefone, setQuickTelefone] = useState('')
  const [quickCreating, setQuickCreating] = useState(false)

  // Fetch rotas once
  useEffect(() => {
    async function fetchRotas() {
      try {
        const res = await fetch('/api/rotas')
        if (res.ok) {
          const data = await res.json()
          setRotas(data)
        }
      } catch (error) {
        console.error('Erro ao buscar rotas:', error)
      }
    }
    fetchRotas()
  }, [])

  // Fetch clientes
  const fetchClientes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (busca) params.set('search', busca)
      if (rotaId && rotaId !== 'all') params.set('rotaId', rotaId)
      if (status && status !== 'all') params.set('status', status)

      const res = await fetch(`/api/clientes?${params}`)
      if (res.ok) {
        const data = await res.json()
        setClientes(data.data || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
    } finally {
      setLoading(false)
    }
  }, [page, busca, rotaId, status])

  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

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
      const res = await fetch(`/api/clientes/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Cliente excluído com sucesso')
        setDeleteId(null)
        fetchClientes()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao excluir cliente')
      }
    } catch {
      toast.error('Erro ao excluir cliente')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Status toggle handler
  const handleToggleStatus = async (clienteId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo'
    setTogglingStatusId(clienteId)
    // Optimistic update
    setClientes((prev) =>
      prev.map((c) => c.id === clienteId ? { ...c, status: newStatus } : c)
    )
    try {
      const res = await fetch(`/api/clientes/${clienteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        toast.success(`Cliente ${newStatus === 'Ativo' ? 'ativado' : 'desativado'} com sucesso`)
      } else {
        // Revert on failure
        setClientes((prev) =>
          prev.map((c) => c.id === clienteId ? { ...c, status: currentStatus } : c)
        )
        toast.error('Erro ao alterar status do cliente')
      }
    } catch {
      // Revert on failure
      setClientes((prev) =>
        prev.map((c) => c.id === clienteId ? { ...c, status: currentStatus } : c)
      )
      toast.error('Erro ao alterar status do cliente')
    } finally {
      setTogglingStatusId(null)
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

      const res = await fetch('/api/import/clientes', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const result = await res.json()
        toast.success(`${result.success} cliente(s) importado(s) com sucesso${result.errors.length > 0 ? ` (${result.errors.length} erro(s))` : ''}`)
        fetchClientes()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao importar clientes')
      }
    } catch {
      toast.error('Erro ao importar clientes')
    } finally {
      setImportLoading(false)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Quick create handler
  const handleQuickCreate = async () => {
    if (!quickNome.trim() || !quickTelefone.trim()) {
      toast.error('Preencha nome e telefone')
      return
    }
    setQuickCreating(true)
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeExibicao: quickNome.trim(),
          telefonePrincipal: quickTelefone.trim(),
          status: 'Ativo',
        }),
      })
      if (res.ok) {
        toast.success('Cliente criado com sucesso')
        setQuickCreateOpen(false)
        setQuickNome('')
        setQuickTelefone('')
        fetchClientes()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao criar cliente')
      }
    } catch {
      toast.error('Erro ao criar cliente')
    } finally {
      setQuickCreating(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold">Clientes</h1>
          <div className="gradient-line mt-1.5 w-20 sm:w-32" />
          <p className="text-muted-foreground text-sm mt-1">
            {total} cliente{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
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
            window.open('/api/clientes?export=csv', '_blank')
          }}>
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs sm:h-auto sm:text-sm sm:gap-2">
                <FileDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exportar Relatório</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                toast.info('Exportando CSV...')
                window.open('/api/clientes?export=csv', '_blank')
              }}>
                <FileText className="mr-2 h-4 w-4" />
                Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                toast.info('Gerando relatório PDF...')
                window.open('/api/relatorios/clientes?format=pdf', '_blank')
              }}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => navigate('cliente-novo')} size="sm" className="gap-1.5 h-8 text-xs sm:h-auto sm:text-sm sm:gap-2">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Novo Cliente</span>
            <span className="sm:hidden">Novo</span>
          </Button>
          <Button variant="outline" onClick={() => setQuickCreateOpen(true)} size="sm" className="gap-1.5 h-8 text-xs sm:h-auto sm:text-sm sm:gap-2 border-dashed">
            <UserPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Rápido</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-sm bg-muted/30">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou identificador..."
                className="pl-8 h-8 sm:h-9 text-sm"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Select value={rotaId} onValueChange={(v) => { setRotaId(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-[200px] h-8 sm:h-9 text-sm">
                <SelectValue placeholder="Todas as rotas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as rotas</SelectItem>
                {rotas.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-[160px] h-8 sm:h-9 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Clientes por Rota Summary Bar */}
      {rotas.length > 0 && (
        <TooltipProvider>
          <Card className="shadow-sm">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <span className="text-xs sm:text-sm font-semibold">Clientes por Rota</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">({total} total)</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Sem rota */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors cursor-default">
                      <span className="h-3 w-3 rounded-full bg-gray-400" />
                      <span className="text-xs font-medium text-muted-foreground">Sem rota</span>
                      <span className="badge-count-amber text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                        {clientes.filter((c) => !c.rota).length}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clientes sem rota atribuída</p>
                  </TooltipContent>
                </Tooltip>
                {rotas.map((rota) => {
                  const count = clientes.filter((c) => c.rota?.id === rota.id).length
                  return (
                    <Tooltip key={rota.id}>
                      <TooltipTrigger asChild>
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:opacity-80 transition-opacity cursor-default"
                          style={{ backgroundColor: `${rota.cor}15` }}
                        >
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: rota.cor }}
                          />
                          <span className="text-xs font-medium truncate max-w-[100px]" style={{ color: rota.cor }}>
                            {rota.descricao}
                          </span>
                          <span className="text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1"
                            style={{ backgroundColor: `${rota.cor}20`, color: rota.cor }}
                          >
                            {count}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{rota.descricao}: {count} cliente{count !== 1 ? 's' : ''}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TooltipProvider>
      )}

      {/* Data Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton />
          ) : clientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="relative mb-6">
                <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <Users className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  <Plus className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <p className="text-lg font-semibold">Nenhum cliente encontrado</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Tente ajustar os filtros ou crie um novo cliente para começar
              </p>
              <Button
                className="mt-4 gap-2"
                onClick={() => navigate('cliente-novo')}
              >
                <Plus className="h-4 w-4" />
                Criar Primeiro Cliente
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Telefone</TableHead>
                  <TableHead className="hidden lg:table-cell">Rota</TableHead>
                  <TableHead className="hidden md:table-cell">Cidade/UF</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((cliente, idx) => (
                  <TableRow
                    key={cliente.id}
                    className={`cursor-pointer hover:bg-muted/50 hover:shadow-sm transition-all ${cliente.status === 'Ativo' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-400'} ${idx % 2 === 1 ? 'bg-muted/10' : ''}`}
                    onClick={() => navigate('cliente-detalhe', cliente.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className={`avatar-circle ${cliente.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {cliente.nomeExibicao?.charAt(0) || '?'}
                        </div>
                        <span>{cliente.identificador}</span>
                      </div>
                    </TableCell>
                    <TableCell>{cliente.nomeExibicao}</TableCell>
                    <TableCell className="hidden md:table-cell">{cliente.telefonePrincipal}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {cliente.rota ? (
                        <span
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border-0"
                          style={{
                            backgroundColor: `${cliente.rota.cor}20`,
                            color: cliente.rota.cor,
                          }}
                        >
                          {cliente.rota.descricao}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {cliente.cidade && cliente.estado
                        ? `${cliente.cidade}/${cliente.estado}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={cliente.status === 'Ativo'}
                          disabled={togglingStatusId === cliente.id}
                          onCheckedChange={() => handleToggleStatus(cliente.id, cliente.status)}
                          onClick={(e) => e.stopPropagation()}
                          className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-400"
                        />
                        <span className={`status-badge ${cliente.status === 'Ativo' ? 'status-badge-ativo badge-glow-emerald' : 'status-badge-inativo'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cliente.status === 'Ativo' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          {cliente.status}
                        </span>
                      </div>
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
                              navigate('cliente-detalhe', cliente.id)
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate('cliente-editar', cliente.id)
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteId(cliente.id)
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

      {/* Quick Create Dialog */}
      <Dialog open={quickCreateOpen} onOpenChange={setQuickCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cliente Rápido</DialogTitle>
            <DialogDescription>
              Crie um cliente com apenas nome e telefone. Edite depois para completar o cadastro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quick-nome">Nome</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  id="quick-nome"
                  placeholder="Nome do cliente"
                  value={quickNome}
                  onChange={(e) => setQuickNome(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-telefone">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  id="quick-telefone"
                  placeholder="(67) 99999-9999"
                  value={quickTelefone}
                  onChange={(e) => setQuickTelefone(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickCreateOpen(false)} disabled={quickCreating}>
              Cancelar
            </Button>
            <Button onClick={handleQuickCreate} disabled={quickCreating} className="gap-2">
              {quickCreating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Criando...</>
              ) : (
                <><UserPlus className="h-4 w-4" /> Criar Cliente</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cliente será marcado como excluído no sistema.
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
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: 7 }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
