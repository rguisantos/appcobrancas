'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/store/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { format, parseISO } from 'date-fns'
import {
  User,
  Mail,
  Shield,
  Clock,
  Lock,
  Loader2,
  Save,
  Activity,
  Bell,
  FileText,
  Users,
  Wrench,
  Target,
  CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'

const tipoPermissaoColors: Record<string, string> = {
  Administrador: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  Secretario: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  AcessoControlado: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

const tipoPermissaoDescription: Record<string, string> = {
  Administrador: 'Acesso total ao sistema',
  Secretario: 'Acesso administrativo limitado',
  AcessoControlado: 'Acesso personalizado por rotas',
}

interface AuditLog {
  id: string
  acao: string
  entidade: string
  entidadeNome: string | null
  createdAt: string
  detalhes: string | null
}

const NOTIF_PREFS_KEY = 'app-cobrancas-notif-prefs'

interface NotifPrefs {
  cobrancasAtrasadas: boolean
  novosClientes: boolean
  manutencoes: boolean
  metas: boolean
}

function getNotifPrefs(): NotifPrefs {
  if (typeof window === 'undefined') {
    return { cobrancasAtrasadas: true, novosClientes: true, manutencoes: true, metas: true }
  }
  try {
    const stored = localStorage.getItem(NOTIF_PREFS_KEY)
    if (stored) return JSON.parse(stored)
  } catch {
    // ignore
  }
  return { cobrancasAtrasadas: true, novosClientes: true, manutencoes: true, metas: true }
}

function saveNotifPrefs(prefs: NotifPrefs) {
  try {
    localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // ignore
  }
}

function getActionLabel(acao: string): string {
  const map: Record<string, string> = {
    criar: 'Criação',
    atualizar: 'Atualização',
    excluir: 'Exclusão',
    login: 'Login',
    logout: 'Logout',
    registrar_pagamento: 'Pagamento',
    excluir_notificacao: 'Excluir notificação',
  }
  return map[acao] || acao.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function getEntityLabel(entidade: string): string {
  const map: Record<string, string> = {
    usuario: 'Usuário',
    cliente: 'Cliente',
    produto: 'Produto',
    locacao: 'Locação',
    cobranca: 'Cobrança',
    notificacao: 'Notificação',
    rota: 'Rota',
    manutencao: 'Manutenção',
    meta: 'Meta',
    dispositivo: 'Dispositivo',
  }
  return map[entidade] || entidade
}

export function PerfilView() {
  const { user } = useAuth()

  // Password form state
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Activity logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    cobrancasAtrasadas: true,
    novosClientes: true,
    manutencoes: true,
    metas: true,
  })

  // Load notification preferences from localStorage
  useEffect(() => {
    setNotifPrefs(getNotifPrefs())
  }, [])

  // Fetch audit logs
  useEffect(() => {
    async function fetchLogs() {
      if (!user?.id) return
      try {
        const res = await fetch(`/api/auditoria?usuarioId=${user.id}&limit=5`)
        if (res.ok) {
          const data = await res.json()
          setAuditLogs(data.data || [])
        }
      } catch {
        // silently fail
      } finally {
        setLogsLoading(false)
      }
    }
    fetchLogs()
  }, [user?.id])

  const handleNotifPrefChange = (key: keyof NotifPrefs, value: boolean) => {
    const newPrefs = { ...notifPrefs, [key]: value }
    setNotifPrefs(newPrefs)
    saveNotifPrefs(newPrefs)
    toast.success('Preferência atualizada')
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy HH:mm')
    } catch {
      return dateStr
    }
  }

  const formatDateShort = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy')
    } catch {
      return dateStr
    }
  }

  const formatRelativeTime = (dateStr: string) => {
    try {
      const now = new Date()
      const date = parseISO(dateStr)
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'agora mesmo'
      if (diffMins < 60) return `há ${diffMins} min`
      if (diffHours < 24) return `há ${diffHours}h`
      if (diffDays < 7) return `há ${diffDays}d`
      return formatDateShort(dateStr)
    } catch {
      return dateStr
    }
  }

  const handleChangePassword = async () => {
    if (!senhaAtual) {
      toast.error('Senha atual é obrigatória')
      return
    }
    if (!novaSenha || novaSenha.length < 6) {
      toast.error('Nova senha deve ter no mínimo 6 caracteres')
      return
    }
    if (novaSenha !== confirmarNovaSenha) {
      toast.error('As senhas não coincidem')
      return
    }
    if (!user?.id) {
      toast.error('Usuário não encontrado')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/usuarios/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: user.nome,
          email: user.email,
          tipoPermissao: user.tipoPermissao,
          permissoesWeb: user.permissoesWeb,
          permissoesMobile: {},
          rotasPermitidas: user.rotasPermitidas || [],
          status: 'Ativo',
          senha: novaSenha,
        }),
      })

      if (res.ok) {
        toast.success('Senha alterada com sucesso')
        setSenhaAtual('')
        setNovaSenha('')
        setConfirmarNovaSenha('')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao alterar senha')
      }
    } catch {
      toast.error('Erro ao alterar senha')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="p-6 space-y-6">
        <Card className="shadow-sm">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-56" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie suas informações e senha
        </p>
      </div>

      {/* Profile Card */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-primary-foreground">
                {user.nome.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-xl font-semibold">{user.nome}</h2>
                <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  <Badge
                    variant="outline"
                    className={`text-xs border-0 ${tipoPermissaoColors[user.tipoPermissao] || 'bg-gray-100 text-gray-800'}`}
                  >
                    {user.tipoPermissao}
                  </Badge>
                </div>
              </div>

              {/* Role Description */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>{tipoPermissaoDescription[user.tipoPermissao] || 'Permissão personalizada'}</span>
              </div>

              {/* Account creation date */}
              {user.createdAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>Conta criada em: {formatDateShort(user.createdAt)}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Último acesso: {formatDate(user.dataUltimoAcesso || null)}</span>
              </div>
            </div>
          </div>

          {/* Permissions Summary */}
          {user.permissoesWeb && typeof user.permissoesWeb === 'object' && (
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permissões Web
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {Object.entries(user.permissoesWeb).map(([key, value]) => (
                  <div
                    key={key}
                    className={`text-xs px-2 py-1.5 rounded-md flex items-center gap-2 ${
                      value
                        ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                        : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                    }`}
                  >
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        value ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Alterar Senha</h2>
          </div>

          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label>Senha Atual</Label>
              <Input
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="Digite sua senha atual"
              />
            </div>

            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="space-y-2">
              <Label>Confirmar Nova Senha</Label>
              <Input
                type="password"
                value={confirmarNovaSenha}
                onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                placeholder="Repita a nova senha"
              />
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={submitting}
              className="gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Alterando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Alterar Senha
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Section */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-6">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                <Activity className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
            </div>
          ) : (
            <div className="space-y-1">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {getActionLabel(log.acao)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getEntityLabel(log.entidade)}
                      </span>
                      {log.entidadeNome && (
                        <span className="text-xs text-muted-foreground truncate">
                          · {log.entidadeNome}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatRelativeTime(log.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences Card */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-600" />
            Preferências de Notificação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-red-50 dark:bg-red-950 flex items-center justify-center">
                <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Cobranças atrasadas</p>
                <p className="text-xs text-muted-foreground">Receber alertas de cobranças vencidas</p>
              </div>
            </div>
            <Switch
              checked={notifPrefs.cobrancasAtrasadas}
              onCheckedChange={(v) => handleNotifPrefChange('cobrancasAtrasadas', v)}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Novos clientes</p>
                <p className="text-xs text-muted-foreground">Notificar sobre novos cadastros</p>
              </div>
            </div>
            <Switch
              checked={notifPrefs.novosClientes}
              onCheckedChange={(v) => handleNotifPrefChange('novosClientes', v)}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                <Wrench className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Manutenções</p>
                <p className="text-xs text-muted-foreground">Alertas de manutenções programadas</p>
              </div>
            </div>
            <Switch
              checked={notifPrefs.manutencoes}
              onCheckedChange={(v) => handleNotifPrefChange('manutencoes', v)}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-950 flex items-center justify-center">
                <Target className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Metas</p>
                <p className="text-xs text-muted-foreground">Notificações sobre metas atingidas</p>
              </div>
            </div>
            <Switch
              checked={notifPrefs.metas}
              onCheckedChange={(v) => handleNotifPrefChange('metas', v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
