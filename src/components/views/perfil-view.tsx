'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/store/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { format, parseISO } from 'date-fns'
import {
  User,
  Mail,
  Shield,
  Clock,
  Lock,
  Loader2,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'

const tipoPermissaoColors: Record<string, string> = {
  Administrador: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  Secretario: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  AcessoControlado: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

export function PerfilView() {
  const { user } = useAuth()

  // Password form state
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy HH:mm')
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
    <div className="p-6 space-y-6">
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

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Último acesso: {formatDate(user.id ? null : null)}</span>
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
    </div>
  )
}
