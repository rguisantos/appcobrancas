'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { sanitizeColor } from '@/lib/sanitize'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Route,
  Pencil,
  Trash2,
  Loader2,
  MapPin,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

interface Rota {
  id: string
  descricao: string
  cor: string
  regiao: string | null
  ordem: number
  observacao: string | null
  status: string
  _count?: { clientes: number }
  clientes?: Array<{ id: string; nomeExibicao: string; identificador: string }>
  createdAt: string
  updatedAt: string
}

export function AdminRotasView() {
  const { currentView, selectedId, navigate } = useNavigation()

  // Data state
  const [rotas, setRotas] = useState<Rota[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // View rota detail dialog
  const [viewRota, setViewRota] = useState<Rota | null>(null)

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteNome, setDeleteNome] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [formDescricao, setFormDescricao] = useState('')
  const [formCor, setFormCor] = useState('#2563EB')
  const [formRegiao, setFormRegiao] = useState('')
  const [formOrdem, setFormOrdem] = useState('0')
  const [formObservacao, setFormObservacao] = useState('')
  const [formStatus, setFormStatus] = useState('Ativo')

  const isEditing = !!editingId
  const isNova = currentView === 'admin-rota-nova'

  // Fetch rotas
  const fetchRotas = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/rotas')
      if (res.ok) {
        const data = await res.json()
        setRotas(Array.isArray(data) ? data : data.data || [])
      }
    } catch {
      console.error('Erro ao buscar rotas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRotas()
  }, [fetchRotas])

  // Handle nova rota navigation
  useEffect(() => {
    if (isNova) {
      resetForm()
      setEditingId(null)
      setDialogOpen(true)
      navigate('admin-rotas')
    }
  }, [isNova, navigate])

  // Handle edit navigation
  useEffect(() => {
    if (currentView === 'admin-rota-editar' && selectedId) {
      const rota = rotas.find((r) => r.id === selectedId)
      if (rota) {
        openEditDialog(rota)
      }
      navigate('admin-rotas')
    }
  }, [currentView, selectedId, navigate, rotas])

  const resetForm = () => {
    setFormDescricao('')
    setFormCor('#2563EB')
    setFormRegiao('')
    setFormOrdem('0')
    setFormObservacao('')
    setFormStatus('Ativo')
    setEditingId(null)
  }

  const openEditDialog = (rota: Rota) => {
    setEditingId(rota.id)
    setFormDescricao(rota.descricao)
    setFormCor(rota.cor || '#2563EB')
    setFormRegiao(rota.regiao || '')
    setFormOrdem(rota.ordem?.toString() || '0')
    setFormObservacao(rota.observacao || '')
    setFormStatus(rota.status)
    setDialogOpen(true)
  }

  const openViewDialog = async (rota: Rota) => {
    try {
      const res = await fetch(`/api/rotas/${rota.id}`)
      if (res.ok) {
        const data = await res.json()
        setViewRota(data)
      }
    } catch {
      setViewRota(rota)
    }
  }

  const handleSubmit = async () => {
    if (!formDescricao.trim()) {
      toast.error('Descrição é obrigatória')
      return
    }

    setSubmitting(true)
    try {
      const body = {
        descricao: formDescricao.trim(),
        cor: formCor,
        regiao: formRegiao.trim() || undefined,
        ordem: parseInt(formOrdem) || 0,
        observacao: formObservacao.trim() || undefined,
        status: formStatus,
      }

      let res: Response
      if (isEditing) {
        res = await fetch(`/api/rotas/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/rotas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      if (res.ok) {
        toast.success(isEditing ? 'Rota atualizada com sucesso' : 'Rota criada com sucesso')
        setDialogOpen(false)
        resetForm()
        fetchRotas()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao salvar rota')
      }
    } catch {
      toast.error('Erro ao salvar rota')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/rotas/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Rota excluída com sucesso')
        setDeleteId(null)
        fetchRotas()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao excluir rota')
      }
    } catch {
      toast.error('Erro ao excluir rota')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold">Rotas</h1>
          <p className="text-muted-foreground text-sm">
            {rotas.length} rota{rotas.length !== 1 ? 's' : ''} cadastrada{rotas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setDialogOpen(true)
          }}
          size="sm"
          className="gap-1.5 h-8 sm:h-auto text-xs sm:text-sm sm:gap-2"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Nova Rota</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </div>

      {/* Route Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rotas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Route className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium">Nenhuma rota encontrada</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie uma nova rota para começar
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {rotas.map((rota) => (
            <Card key={rota.id} className="shadow-sm hover:shadow-md transition-shadow shine-effect">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-full shrink-0 border-2 border-white shadow-sm"
                      style={{ backgroundColor: sanitizeColor(rota.cor) }}
                    />
                    <div>
                      <h3
                        className="font-semibold text-sm cursor-pointer hover:underline"
                        onClick={() => openViewDialog(rota)}
                      >
                        {rota.descricao}
                      </h3>
                      {rota.regiao && (
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <MapPin className="h-3 w-3" />
                          {rota.regiao}
                        </div>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={rota.status} />
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <span>{rota._count?.clientes || 0} clientes</span>
                  </div>
                  <span>Ordem: {rota.ordem}</span>
                </div>

                {rota.observacao && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{rota.observacao}</p>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => openEditDialog(rota)}
                  >
                    <Pencil className="h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                    onClick={() => {
                      setDeleteId(rota.id)
                      setDeleteNome(rota.descricao)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Nova/Editar Rota Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) resetForm()
          setDialogOpen(open)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Rota' : 'Nova Rota'}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Edite os dados da rota.'
                : 'Preencha os dados para criar uma nova rota.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Descrição */}
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                placeholder="Nome da rota"
              />
            </div>

            {/* Cor + Ordem */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={formCor}
                    onChange={(e) => setFormCor(e.target.value)}
                    placeholder="#2563EB"
                    className="flex-1"
                  />
                  <div
                    className="h-9 w-9 rounded-md border shrink-0"
                    style={{ backgroundColor: formCor }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={formOrdem}
                  onChange={(e) => setFormOrdem(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Região + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Região</Label>
                <Input
                  value={formRegiao}
                  onChange={(e) => setFormRegiao(e.target.value)}
                  placeholder="Região"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                value={formObservacao}
                onChange={(e) => setFormObservacao(e.target.value)}
                placeholder="Observações sobre a rota..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false)
                resetForm()
              }}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                isEditing ? 'Salvar Alterações' : 'Criar Rota'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Rota Detail Dialog */}
      <Dialog open={!!viewRota} onOpenChange={(open) => !open && setViewRota(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-3">
                <div
                  className="h-6 w-6 rounded-full shrink-0"
                  style={{ backgroundColor: viewRota?.cor }}
                />
                {viewRota?.descricao}
              </div>
            </DialogTitle>
          </DialogHeader>
          {viewRota && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Região:</span>
                  <p className="font-medium">{viewRota.regiao || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ordem:</span>
                  <p className="font-medium">{viewRota.ordem}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="mt-1">
                    <StatusBadge status={viewRota.status} />
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Clientes:</span>
                  <p className="font-medium">
                    {viewRota._count?.clientes || viewRota.clientes?.length || 0}
                  </p>
                </div>
              </div>

              {viewRota.observacao && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Observação:</span>
                  <p className="mt-1">{viewRota.observacao}</p>
                </div>
              )}

              {viewRota.clientes && viewRota.clientes.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Clientes vinculados:</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {viewRota.clientes.map((c) => (
                      <div
                        key={c.id}
                        className="text-sm px-3 py-1.5 bg-muted rounded-md flex justify-between"
                      >
                        <span>{c.nomeExibicao}</span>
                        <span className="text-muted-foreground">{c.identificador}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Rota</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a rota &quot;{deleteNome}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
