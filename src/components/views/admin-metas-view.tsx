'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { format, parseISO } from 'date-fns'
import { Progress } from '@/components/ui/progress'
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
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Target,
  Loader2,
  Pencil,
  Trash2,
  TrendingUp,
  DollarSign,
  FileText,
  BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'

interface Meta {
  id: string
  nome: string
  tipo: string
  valorMeta: number
  valorAtual: number
  dataInicio: string
  dataFim: string
  rotaId: string | null
  status: string
  criadoPor: string | null
  rota: {
    id: string
    descricao: string
    cor: string
  } | null
  createdAt: string
  updatedAt: string
}

interface Rota {
  id: string
  descricao: string
  cor: string
}

const tipoLabels: Record<string, string> = {
  receita: 'Receita',
  cobrancas: 'Cobranças',
  adimplencia: 'Adimplência',
}

const tipoColors: Record<string, string> = {
  receita: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cobrancas: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  adimplencia: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

const tipoIcons: Record<string, React.ReactNode> = {
  receita: <DollarSign className="h-4 w-4" />,
  cobrancas: <FileText className="h-4 w-4" />,
  adimplencia: <TrendingUp className="h-4 w-4" />,
}

export function AdminMetasView() {
  const { currentView, selectedId, navigate } = useNavigation()

  // Data state
  const [metas, setMetas] = useState<Meta[]>([])
  const [loading, setLoading] = useState(true)

  // Rotas for select
  const [rotas, setRotas] = useState<Rota[]>([])

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteNome, setDeleteNome] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [formNome, setFormNome] = useState('')
  const [formTipo, setFormTipo] = useState<string>('receita')
  const [formValorMeta, setFormValorMeta] = useState('')
  const [formDataInicio, setFormDataInicio] = useState('')
  const [formDataFim, setFormDataFim] = useState('')
  const [formRotaId, setFormRotaId] = useState<string>('')
  const [formStatus, setFormStatus] = useState<string>('ativa')

  const isEditing = !!editingId
  const isNova = currentView === 'admin-meta-nova'

  // Fetch metas
  const fetchMetas = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/metas')
      if (res.ok) {
        const data = await res.json()
        setMetas(Array.isArray(data) ? data : data.data || [])
      }
    } catch {
      console.error('Erro ao buscar metas')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch rotas
  const fetchRotas = useCallback(async () => {
    try {
      const res = await fetch('/api/rotas')
      if (res.ok) {
        const data = await res.json()
        setRotas(Array.isArray(data) ? data : data.data || [])
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchMetas()
  }, [fetchMetas])

  useEffect(() => {
    fetchRotas()
  }, [fetchRotas])

  // Handle nova meta navigation
  useEffect(() => {
    if (isNova) {
      resetForm()
      setEditingId(null)
      setDialogOpen(true)
      navigate('admin-metas')
    }
  }, [isNova, navigate])

  // Handle edit navigation
  useEffect(() => {
    if (currentView === 'admin-meta-editar' && selectedId) {
      const meta = metas.find((m) => m.id === selectedId)
      if (meta) {
        openEditDialog(meta)
      }
      navigate('admin-metas')
    }
  }, [currentView, selectedId, navigate, metas])

  const resetForm = () => {
    setFormNome('')
    setFormTipo('receita')
    setFormValorMeta('')
    setFormDataInicio('')
    setFormDataFim('')
    setFormRotaId('')
    setFormStatus('ativa')
    setEditingId(null)
  }

  const openEditDialog = (meta: Meta) => {
    setEditingId(meta.id)
    setFormNome(meta.nome)
    setFormTipo(meta.tipo)
    setFormValorMeta(meta.valorMeta.toString())
    try {
      setFormDataInicio(format(parseISO(meta.dataInicio), 'yyyy-MM-dd'))
      setFormDataFim(format(parseISO(meta.dataFim), 'yyyy-MM-dd'))
    } catch {
      setFormDataInicio(meta.dataInicio.substring(0, 10))
      setFormDataFim(meta.dataFim.substring(0, 10))
    }
    setFormRotaId(meta.rotaId || '')
    setFormStatus(meta.status)
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formNome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    if (!formValorMeta || parseFloat(formValorMeta) <= 0) {
      toast.error('Valor meta deve ser maior que zero')
      return
    }
    if (!formDataInicio || !formDataFim) {
      toast.error('Datas de início e fim são obrigatórias')
      return
    }

    setSubmitting(true)
    try {
      const body = {
        nome: formNome.trim(),
        tipo: formTipo,
        valorMeta: parseFloat(formValorMeta),
        dataInicio: formDataInicio,
        dataFim: formDataFim,
        rotaId: formRotaId || undefined,
      }

      let res: Response
      if (isEditing) {
        res = await fetch(`/api/metas/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/metas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      if (res.ok) {
        toast.success(isEditing ? 'Meta atualizada com sucesso' : 'Meta criada com sucesso')
        setDialogOpen(false)
        resetForm()
        fetchMetas()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao salvar meta')
      }
    } catch {
      toast.error('Erro ao salvar meta')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/metas/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Meta excluída com sucesso')
        setDeleteId(null)
        fetchMetas()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao excluir meta')
      }
    } catch {
      toast.error('Erro ao excluir meta')
    } finally {
      setDeleting(false)
    }
  }

  const getProgressValue = (meta: Meta) => {
    if (meta.valorMeta <= 0) return 0
    return Math.min(100, Math.round((meta.valorAtual / meta.valorMeta) * 100))
  }

  const getProgressColor = (value: number) => {
    if (value >= 100) return 'bg-green-500'
    if (value >= 75) return 'bg-blue-500'
    if (value >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy')
    } catch {
      return dateStr
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Metas</h1>
          <p className="text-muted-foreground text-sm">
            {metas.length} meta{metas.length !== 1 ? 's' : ''} cadastrada{metas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setDialogOpen(true)
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      {/* Meta Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : metas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Target className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium">Nenhuma meta encontrada</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie uma nova meta para acompanhar o progresso
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metas.map((meta) => {
            const progress = getProgressValue(meta)
            return (
              <Card key={meta.id} className="shadow-sm hover:shadow-md transition-shadow shine-effect">
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        {tipoIcons[meta.tipo] || <BarChart3 className="h-4 w-4" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{meta.nome}</h3>
                        <Badge
                          variant="outline"
                          className={`text-[10px] border-0 mt-0.5 ${tipoColors[meta.tipo] || 'bg-gray-100 text-gray-800'}`}
                        >
                          {tipoLabels[meta.tipo] || meta.tipo}
                        </Badge>
                      </div>
                    </div>
                    <StatusBadge status={meta.status} />
                  </div>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getProgressColor(progress)}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{formatarMoeda(meta.valorAtual)}</span>
                      <span>{formatarMoeda(meta.valorMeta)}</span>
                    </div>
                  </div>

                  {/* Period */}
                  <div className="text-xs text-muted-foreground mb-3">
                    <span>{formatDate(meta.dataInicio)}</span>
                    <span className="mx-1">→</span>
                    <span>{formatDate(meta.dataFim)}</span>
                  </div>

                  {/* Rota */}
                  {meta.rota && (
                    <div className="flex items-center gap-2 text-xs mb-3">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: meta.rota.cor }}
                      />
                      <span className="text-muted-foreground">{meta.rota.descricao}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => openEditDialog(meta)}
                    >
                      <Pencil className="h-3 w-3" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeleteId(meta.id)
                        setDeleteNome(meta.nome)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Nova/Editar Meta Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) resetForm()
          setDialogOpen(open)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Edite os dados da meta.'
                : 'Preencha os dados para criar uma nova meta.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Nome da meta"
              />
            </div>

            {/* Tipo + Valor Meta */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formTipo} onValueChange={setFormTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="cobrancas">Cobranças</SelectItem>
                    <SelectItem value="adimplencia">Adimplência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor Meta *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formValorMeta}
                  onChange={(e) => setFormValorMeta(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Data Início + Data Fim */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início *</Label>
                <Input
                  type="date"
                  value={formDataInicio}
                  onChange={(e) => setFormDataInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim *</Label>
                <Input
                  type="date"
                  value={formDataFim}
                  onChange={(e) => setFormDataFim(e.target.value)}
                />
              </div>
            </div>

            {/* Rota */}
            <div className="space-y-2">
              <Label>Rota (opcional)</Label>
              <Select value={formRotaId} onValueChange={setFormRotaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma rota" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {rotas.map((rota) => (
                    <SelectItem key={rota.id} value={rota.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: rota.cor }}
                        />
                        {rota.descricao}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status (only when editing) */}
            {isEditing && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setDialogOpen(false); resetForm() }}
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
                isEditing ? 'Salvar Alterações' : 'Criar Meta'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Meta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a meta &quot;{deleteNome}&quot;? Esta ação não pode ser desfeita.
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
