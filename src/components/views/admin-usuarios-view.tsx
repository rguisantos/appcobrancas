'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { format, parseISO } from 'date-fns'
import { getPermissoesByTipo } from '@/lib/permissoes-padrao'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Users,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'

interface Usuario {
  id: string
  nome: string
  email: string
  cpf: string | null
  telefone: string | null
  tipoPermissao: string
  permissoesWeb: string | Record<string, boolean>
  permissoesMobile: string | Record<string, boolean>
  rotasPermitidas: string | string[]
  status: string
  bloqueado: boolean
  dataUltimoAcesso: string | null
  createdAt: string
  updatedAt: string
}

interface Rota {
  id: string
  descricao: string
  cor: string
}

const PERMISSOES_LABELS: Record<string, string> = {
  clientes: 'Clientes',
  produtos: 'Produtos',
  rotas: 'Rotas',
  locacaoRelocacaoEstoque: 'Locação/Relocação/Estoque',
  cobrancas: 'Cobranças',
  manutencoes: 'Manutenções',
  relogios: 'Relógios',
  relatorios: 'Relatórios',
  dashboard: 'Dashboard',
  agenda: 'Agenda',
  mapa: 'Mapa',
  adminCadastros: 'Admin Cadastros',
  adminUsuarios: 'Admin Usuários',
  adminDispositivos: 'Admin Dispositivos',
  adminSincronizacao: 'Admin Sincronização',
  adminAuditoria: 'Admin Auditoria',
}

const PERMISSOES_KEYS = Object.keys(PERMISSOES_LABELS)

const tipoPermissaoColors: Record<string, string> = {
  Administrador: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  Secretario: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  AcessoControlado: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

export function AdminUsuariosView() {
  const { currentView, selectedId, navigate } = useNavigation()

  // Data state
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Pagination
  const [page, setPage] = useState(1)
  const limit = 20

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteNome, setDeleteNome] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Rotas for multi-select
  const [rotas, setRotas] = useState<Rota[]>([])

  // Form state
  const [formNome, setFormNome] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formSenha, setFormSenha] = useState('')
  const [formCpf, setFormCpf] = useState('')
  const [formTelefone, setFormTelefone] = useState('')
  const [formTipoPermissao, setFormTipoPermissao] = useState<string>('AcessoControlado')
  const [formPermissoesWeb, setFormPermissoesWeb] = useState<Record<string, boolean>>({})
  const [formRotasPermitidas, setFormRotasPermitidas] = useState<string[]>([])
  const [formStatus, setFormStatus] = useState<string>('Ativo')

  const isEditing = !!editingId
  const isNovo = currentView === 'admin-usuario-novo'

  // Fetch usuarios
  const fetchUsuarios = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      const res = await fetch(`/api/usuarios?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsuarios(data.data || [])
        setTotal(data.total || 0)
      }
    } catch {
      console.error('Erro ao buscar usuários')
    } finally {
      setLoading(false)
    }
  }, [page])

  // Fetch rotas for multi-select
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
    fetchUsuarios()
  }, [fetchUsuarios])

  useEffect(() => {
    fetchRotas()
  }, [fetchRotas])

  // Handle novo usuario navigation
  useEffect(() => {
    if (isNovo) {
      resetForm()
      setEditingId(null)
      setDialogOpen(true)
      navigate('admin-usuarios')
    }
  }, [isNovo, navigate])

  // Handle edit navigation
  useEffect(() => {
    if (currentView === 'admin-usuario-editar' && selectedId) {
      const usuario = usuarios.find((u) => u.id === selectedId)
      if (usuario) {
        openEditDialog(usuario)
      }
      navigate('admin-usuarios')
    }
  }, [currentView, selectedId, navigate, usuarios])

  const parsePermissoesWeb = (pw: string | Record<string, boolean>): Record<string, boolean> => {
    if (typeof pw === 'object') return pw
    try {
      return JSON.parse(pw || '{}')
    } catch {
      return {}
    }
  }

  const parseRotasPermitidas = (rp: string | string[]): string[] => {
    if (Array.isArray(rp)) return rp
    try {
      return JSON.parse(rp || '[]')
    } catch {
      return []
    }
  }

  const resetForm = () => {
    setFormNome('')
    setFormEmail('')
    setFormSenha('')
    setFormCpf('')
    setFormTelefone('')
    setFormTipoPermissao('AcessoControlado')
    const permissoes = getPermissoesByTipo('AcessoControlado')
    setFormPermissoesWeb(permissoes.web)
    setFormRotasPermitidas([])
    setFormStatus('Ativo')
    setEditingId(null)
  }

  const openEditDialog = (usuario: Usuario) => {
    setEditingId(usuario.id)
    setFormNome(usuario.nome)
    setFormEmail(usuario.email)
    setFormSenha('')
    setFormCpf(usuario.cpf || '')
    setFormTelefone(usuario.telefone || '')
    setFormTipoPermissao(usuario.tipoPermissao)
    setFormPermissoesWeb(parsePermissoesWeb(usuario.permissoesWeb))
    setFormRotasPermitidas(parseRotasPermitidas(usuario.rotasPermitidas))
    setFormStatus(usuario.status)
    setDialogOpen(true)
  }

  const handleTipoPermissaoChange = (tipo: string) => {
    setFormTipoPermissao(tipo)
    const permissoes = getPermissoesByTipo(tipo)
    setFormPermissoesWeb(permissoes.web)
  }

  const handlePermissaoToggle = (key: string, checked: boolean) => {
    setFormPermissoesWeb((prev) => ({ ...prev, [key]: checked }))
  }

  const handleRotaToggle = (rotaId: string, checked: boolean) => {
    setFormRotasPermitidas((prev) =>
      checked ? [...prev, rotaId] : prev.filter((id) => id !== rotaId)
    )
  }

  const handleSubmit = async () => {
    if (!formNome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    if (!formEmail.trim()) {
      toast.error('Email é obrigatório')
      return
    }
    if (!isEditing && (!formSenha || formSenha.length < 6)) {
      toast.error('Senha deve ter no mínimo 6 caracteres')
      return
    }
    if (formSenha && formSenha.length > 0 && formSenha.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres')
      return
    }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        nome: formNome.trim(),
        email: formEmail.trim(),
        cpf: formCpf.trim() || undefined,
        telefone: formTelefone.trim() || undefined,
        tipoPermissao: formTipoPermissao,
        permissoesWeb: formPermissoesWeb,
        permissoesMobile: getPermissoesByTipo(formTipoPermissao).mobile,
        rotasPermitidas: formRotasPermitidas,
        status: formStatus,
      }

      if (formSenha) {
        body.senha = formSenha
      }

      let res: Response
      if (isEditing) {
        res = await fetch(`/api/usuarios/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      if (res.ok) {
        toast.success(isEditing ? 'Usuário atualizado com sucesso' : 'Usuário criado com sucesso')
        setDialogOpen(false)
        resetForm()
        fetchUsuarios()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao salvar usuário')
      }
    } catch {
      toast.error('Erro ao salvar usuário')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (usuario: Usuario) => {
    const newStatus = usuario.status === 'Ativo' ? 'Inativo' : 'Ativo'
    try {
      const permissoesWeb = parsePermissoesWeb(usuario.permissoesWeb)
      const rotasPermitidas = parseRotasPermitidas(usuario.rotasPermitidas)

      const res = await fetch(`/api/usuarios/${usuario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: usuario.nome,
          email: usuario.email,
          cpf: usuario.cpf,
          telefone: usuario.telefone,
          tipoPermissao: usuario.tipoPermissao,
          permissoesWeb,
          permissoesMobile: getPermissoesByTipo(usuario.tipoPermissao).mobile,
          rotasPermitidas,
          status: newStatus,
        }),
      })

      if (res.ok) {
        toast.success(`Usuário ${newStatus === 'Ativo' ? 'ativado' : 'desativado'} com sucesso`)
        fetchUsuarios()
      } else {
        toast.error('Erro ao alterar status do usuário')
      }
    } catch {
      toast.error('Erro ao alterar status do usuário')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/usuarios/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Usuário excluído com sucesso')
        setDeleteId(null)
        fetchUsuarios()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao excluir usuário')
      }
    } catch {
      toast.error('Erro ao excluir usuário')
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

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
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground text-sm">
            {total} usuário{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
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
          Novo Usuário
        </Button>
      </div>

      {/* Data Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton />
          ) : usuarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">Nenhum usuário encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie um novo usuário para começar
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tipo Permissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Último Acesso</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u, idx) => (
                  <TableRow key={u.id} className={`hover:bg-muted/50 transition-colors ${idx % 2 === 1 ? 'bg-muted/10' : ''}`}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs border-0 ${tipoPermissaoColors[u.tipoPermissao] || 'bg-gray-100 text-gray-800'}`}
                      >
                        {u.tipoPermissao}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {formatDate(u.dataUltimoAcesso)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(u)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(u)}>
                            <Power className="h-4 w-4 mr-2" />
                            {u.status === 'Ativo' ? 'Desativar' : 'Ativar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setDeleteId(u.id)
                              setDeleteNome(u.nome)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
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

      {/* Novo/Editar Usuário Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) {
          resetForm()
        }
        setDialogOpen(open)
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Edite os dados do usuário. Deixe a senha em branco para manter a atual.'
                : 'Preencha os dados para criar um novo usuário.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Nome completo"
              />
            </div>

            {/* Email + Telefone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formTelefone}
                  onChange={(e) => setFormTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            {/* Senha + CPF */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isEditing ? 'Senha (deixe em branco para manter)' : 'Senha *'}</Label>
                <Input
                  type="password"
                  value={formSenha}
                  onChange={(e) => setFormSenha(e.target.value)}
                  placeholder={isEditing ? '••••••' : 'Mínimo 6 caracteres'}
                />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  value={formCpf}
                  onChange={(e) => setFormCpf(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            {/* Tipo Permissão + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Permissão</Label>
                <Select
                  value={formTipoPermissao}
                  onValueChange={handleTipoPermissaoChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administrador">Administrador</SelectItem>
                    <SelectItem value="Secretario">Secretário</SelectItem>
                    <SelectItem value="AcessoControlado">Acesso Controlado</SelectItem>
                  </SelectContent>
                </Select>
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

            {/* Permissões Web */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Permissões Web</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-md p-4">
                {PERMISSOES_KEYS.map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={`perm-${key}`}
                      checked={!!formPermissoesWeb[key]}
                      onCheckedChange={(checked) => handlePermissaoToggle(key, !!checked)}
                    />
                    <Label htmlFor={`perm-${key}`} className="text-sm font-normal cursor-pointer">
                      {PERMISSOES_LABELS[key]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Rotas Permitidas (only for AcessoControlado) */}
            {formTipoPermissao === 'AcessoControlado' && (
              <div className="space-y-2">
                <Label className="text-base font-semibold">Rotas Permitidas</Label>
                {rotas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma rota cadastrada</p>
                ) : (
                  <div className="border rounded-md p-4 space-y-2">
                    {rotas.map((rota) => (
                      <div key={rota.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`rota-${rota.id}`}
                          checked={formRotasPermitidas.includes(rota.id)}
                          onCheckedChange={(checked) => handleRotaToggle(rota.id, !!checked)}
                        />
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: rota.cor }}
                        />
                        <Label htmlFor={`rota-${rota.id}`} className="text-sm font-normal cursor-pointer">
                          {rota.descricao}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
                isEditing ? 'Salvar Alterações' : 'Criar Usuário'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário &quot;{deleteNome}&quot;? Esta ação não pode ser desfeita.
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
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: 6 }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
