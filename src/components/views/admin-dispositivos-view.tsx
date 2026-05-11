'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
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
  Plus,
  Smartphone,
  Loader2,
  Trash2,
  Key,
  Copy,
} from 'lucide-react'
import { toast } from 'sonner'

interface Dispositivo {
  id: string
  nome: string
  deviceKey: string
  senha: string
  ativo: boolean
  ultimoSync: string | null
  usuarioId: string | null
  createdAt: string
  updatedAt: string
}

function generateRandomKey(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function generateRandomPassword(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function AdminDispositivosView() {
  // Data state
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteNome, setDeleteNome] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [formNome, setFormNome] = useState('')
  const [generatedDeviceKey, setGeneratedDeviceKey] = useState('')
  const [generatedSenha, setGeneratedSenha] = useState('')

  // Fetch dispositivos
  const fetchDispositivos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dispositivos')
      if (res.ok) {
        const data = await res.json()
        setDispositivos(Array.isArray(data) ? data : data.data || [])
      }
    } catch {
      console.error('Erro ao buscar dispositivos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDispositivos()
  }, [fetchDispositivos])

  const resetForm = () => {
    setFormNome('')
    setGeneratedDeviceKey('')
    setGeneratedSenha('')
  }

  const openNewDialog = () => {
    setFormNome('')
    setGeneratedDeviceKey(generateRandomKey(32))
    setGeneratedSenha(generateRandomPassword(12))
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formNome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/dispositivos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formNome.trim(),
          deviceKey: generatedDeviceKey,
          senha: generatedSenha,
          ativo: false,
        }),
      })

      if (res.ok) {
        toast.success('Dispositivo criado com sucesso')
        setDialogOpen(false)
        resetForm()
        fetchDispositivos()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao criar dispositivo')
      }
    } catch {
      toast.error('Erro ao criar dispositivo')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/dispositivos/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Dispositivo excluído com sucesso')
        setDeleteId(null)
        fetchDispositivos()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao excluir dispositivo')
      }
    } catch {
      toast.error('Erro ao excluir dispositivo')
    } finally {
      setDeleting(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copiado!`)
    }).catch(() => {
      toast.error('Erro ao copiar')
    })
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy HH:mm')
    } catch {
      return dateStr
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dispositivos</h1>
          <p className="text-muted-foreground text-sm">
            {dispositivos.length} dispositivo{dispositivos.length !== 1 ? 's' : ''} cadastrado{dispositivos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={openNewDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Dispositivo
        </Button>
      </div>

      {/* Data Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton />
          ) : dispositivos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Smartphone className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">Nenhum dispositivo encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie um novo dispositivo para começar
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Device Key</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="hidden md:table-cell">Último Sync</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispositivos.map((d, idx) => (
                  <TableRow key={d.id} className={`hover:bg-muted/50 transition-colors ${idx % 2 === 1 ? 'bg-muted/10' : ''} ${d.ativo ? 'border-l-4 border-l-green-400' : 'border-l-4 border-l-gray-300'}`}>
                    <TableCell className="font-medium">{d.nome}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-0.5 rounded max-w-[200px] truncate block">
                          {d.deviceKey}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => copyToClipboard(d.deviceKey, 'Device Key')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {d.ativo ? (
                        <Badge variant="outline" className="text-xs border-0 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs border-0 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {formatDate(d.ultimoSync)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeleteId(d.id)
                          setDeleteNome(d.nome)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Novo Dispositivo Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) resetForm()
          setDialogOpen(open)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Dispositivo</DialogTitle>
            <DialogDescription>
              Crie um novo dispositivo para sincronização mobile. A chave e senha serão geradas automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Nome do dispositivo"
              />
            </div>

            {/* Device Key (auto-generated) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="h-3.5 w-3.5" />
                Device Key (gerada automaticamente)
              </Label>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-3 py-2 rounded flex-1 break-all">
                  {generatedDeviceKey}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => copyToClipboard(generatedDeviceKey, 'Device Key')}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Senha (auto-generated) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="h-3.5 w-3.5" />
                Senha (gerada automaticamente)
              </Label>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-3 py-2 rounded flex-1">
                  {generatedSenha}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => copyToClipboard(generatedSenha, 'Senha')}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Copie a chave e a senha após criar o dispositivo. A senha não será exibida novamente.
            </p>
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
                  Criando...
                </>
              ) : (
                'Criar Dispositivo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Dispositivo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o dispositivo &quot;{deleteNome}&quot;? Esta ação não pode ser desfeita.
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

function TableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: 5 }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
