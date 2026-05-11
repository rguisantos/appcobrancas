'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Settings,
  Package,
  FileText,
  Ruler,
  Building2,
} from 'lucide-react'
import { toast } from 'sonner'

interface CadastroItem {
  id: string
  nome: string
  endereco?: string
  createdAt: string
  updatedAt: string
}

interface TabConfig {
  key: string
  label: string
  icon: React.ReactNode
  apiPath: string
}

const tabs: TabConfig[] = [
  { key: 'tipos', label: 'Tipos de Produto', icon: <Package className="h-4 w-4" />, apiPath: '/api/tipos-produto' },
  { key: 'descricoes', label: 'Descrições', icon: <FileText className="h-4 w-4" />, apiPath: '/api/descricoes-produto' },
  { key: 'tamanhos', label: 'Tamanhos', icon: <Ruler className="h-4 w-4" />, apiPath: '/api/tamanhos-produto' },
  { key: 'estabelecimentos', label: 'Estabelecimentos', icon: <Building2 className="h-4 w-4" />, apiPath: '/api/estabelecimentos' },
]

export function AdminCadastrosView() {
  const [activeTab, setActiveTab] = useState('tipos')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Cadastros</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie tipos, descrições, tamanhos e estabelecimentos
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className="gap-2">
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            <CadastroTabContent tab={tab} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function CadastroTabContent({ tab }: { tab: TabConfig }) {
  const [items, setItems] = useState<CadastroItem[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formNome, setFormNome] = useState('')
  const [formEndereco, setFormEndereco] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteNome, setDeleteNome] = useState('')
  const [deleting, setDeleting] = useState(false)

  const isEditing = !!editingId
  const isEstabelecimento = tab.key === 'estabelecimentos'

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(tab.apiPath)
      if (res.ok) {
        const data = await res.json()
        setItems(Array.isArray(data) ? data : data.data || [])
      }
    } catch {
      console.error('Erro ao buscar dados')
    } finally {
      setLoading(false)
    }
  }, [tab.apiPath])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const resetForm = () => {
    setFormNome('')
    setFormEndereco('')
    setEditingId(null)
  }

  const openEditDialog = (item: CadastroItem) => {
    setEditingId(item.id)
    setFormNome(item.nome)
    setFormEndereco(item.endereco || '')
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formNome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    setSubmitting(true)
    try {
      const body: Record<string, string> = { nome: formNome.trim() }
      if (isEstabelecimento && formEndereco.trim()) {
        body.endereco = formEndereco.trim()
      }

      let res: Response
      if (isEditing) {
        res = await fetch(`${tab.apiPath}/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch(tab.apiPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      if (res.ok) {
        toast.success(isEditing ? 'Atualizado com sucesso' : 'Criado com sucesso')
        setDialogOpen(false)
        resetForm()
        fetchItems()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao salvar')
      }
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`${tab.apiPath}/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Excluído com sucesso')
        setDeleteId(null)
        fetchItems()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao excluir')
      }
    } catch {
      toast.error('Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        {/* Add button */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {items.length} item{items.length !== 1 ? 's' : ''} cadastrado{items.length !== 1 ? 's' : ''}
          </p>
          <Button
            size="sm"
            onClick={() => {
              resetForm()
              setDialogOpen(true)
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Nenhum item cadastrado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Clique em &quot;Adicionar&quot; para criar o primeiro
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                {isEstabelecimento && <TableHead>Endereço</TableHead>}
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={item.id} className={`hover:bg-muted/50 transition-colors ${idx % 2 === 1 ? 'bg-muted/10' : ''}`}>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  {isEstabelecimento && (
                    <TableCell className="text-muted-foreground text-sm">
                      {item.endereco || '—'}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditDialog(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeleteId(item.id)
                          setDeleteNome(item.nome)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) resetForm()
          setDialogOpen(open)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? `Editar ${tab.label.slice(0, -1)}` : `Novo ${tab.label.slice(0, -1)}`}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? 'Edite o nome do item.' : 'Preencha o nome para criar um novo item.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Nome"
              />
            </div>
            {isEstabelecimento && (
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input
                  value={formEndereco}
                  onChange={(e) => setFormEndereco(e.target.value)}
                  placeholder="Endereço"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                isEditing ? 'Salvar' : 'Criar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {tab.label.slice(0, -1)}</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{deleteNome}&quot;? Esta ação não pode ser desfeita.
              {tab.key !== 'estabelecimentos' && (
                <span className="block mt-2 text-orange-600 dark:text-orange-400">
                  Itens vinculados a produtos não poderão ser excluídos.
                </span>
              )}
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
    </Card>
  )
}
