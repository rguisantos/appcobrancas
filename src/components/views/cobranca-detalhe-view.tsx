'use client'

import { useState, useEffect } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { Progress } from '@/components/ui/progress'
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { format, parseISO } from 'date-fns'
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
  ArrowLeft,
  Pencil,
  Trash2,
  CreditCard,
  User,
  Package,
  MapPin,
  Gauge,
  Calendar,
  DollarSign,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

interface Cobranca {
  id: string
  locacaoId: string
  clienteId: string
  clienteNome: string
  produtoId: string | null
  produtoIdentificador: string
  dataInicio: string
  dataFim: string
  dataPagamento: string | null
  dataVencimento: string | null
  relogioAnterior: number
  relogioAtual: number
  fichasRodadas: number
  valorFicha: number
  totalBruto: number
  descontoPartidasQtd: number | null
  descontoPartidasValor: number | null
  descontoDinheiro: number | null
  percentualEmpresa: number
  subtotalAposDescontos: number
  valorPercentual: number
  totalClientePaga: number
  valorRecebido: number
  saldoDevedorGerado: number
  status: string
  formaPagamento: string
  observacao: string | null
  version: number
  locacao: {
    id: string
    formaPagamento: string
    numeroRelogio: string
    precoFicha: number
    percentualEmpresa: number
  } | null
  cliente: {
    id: string
    nomeExibicao: string
    telefonePrincipal: string
    email: string | null
    cidade: string
    estado: string
  } | null
  produto: {
    id: string
    identificador: string
    tipoNome: string
    descricaoNome: string
    numeroRelogio: string
  } | null
}

export function CobrancaDetalheView() {
  const { selectedId, navigate, goBack } = useNavigation()

  const [cobranca, setCobranca] = useState<Cobranca | null>(null)
  const [loading, setLoading] = useState(true)

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentValue, setPaymentValue] = useState('')
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Fetch cobranca
  useEffect(() => {
    if (selectedId) {
      async function fetchCobranca() {
        try {
          const res = await fetch(`/api/cobrancas/${selectedId}`)
          if (res.ok) {
            const data = await res.json()
            setCobranca(data)
          } else {
            toast.error('Cobrança não encontrada')
            navigate('cobrancas')
          }
        } catch {
          toast.error('Erro ao carregar cobrança')
          navigate('cobrancas')
        } finally {
          setLoading(false)
        }
      }
      fetchCobranca()
    }
  }, [selectedId, navigate])

  // Open payment dialog
  const openPaymentDialog = () => {
    if (!cobranca) return
    setPaymentValue(cobranca.totalClientePaga.toString())
    setPaymentDialogOpen(true)
  }

  // Submit payment
  const handlePayment = async () => {
    if (!cobranca) return

    setPaymentSubmitting(true)
    try {
      const valorRecebido = parseFloat(paymentValue) || 0
      const newStatus = valorRecebido >= cobranca.totalClientePaga ? 'Pago' : 'Parcial'

      const res = await fetch(`/api/cobrancas/${cobranca.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locacaoId: cobranca.locacaoId,
          dataInicio: cobranca.dataInicio,
          dataFim: cobranca.dataFim,
          relogioAnterior: cobranca.relogioAnterior,
          relogioAtual: cobranca.relogioAtual,
          descontoPartidasQtd: cobranca.descontoPartidasQtd,
          descontoPartidasValor: cobranca.descontoPartidasValor,
          descontoDinheiro: cobranca.descontoDinheiro,
          valorRecebido,
          status: newStatus,
          observacao: cobranca.observacao,
        }),
      })

      if (res.ok) {
        toast.success('Pagamento registrado com sucesso')
        setPaymentDialogOpen(false)
        // Refresh data
        const updated = await fetch(`/api/cobrancas/${cobranca.id}`)
        if (updated.ok) {
          setCobranca(await updated.json())
        }
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao registrar pagamento')
      }
    } catch {
      toast.error('Erro ao registrar pagamento')
    } finally {
      setPaymentSubmitting(false)
    }
  }

  // Delete cobranca
  const handleDelete = async () => {
    if (!cobranca) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/cobrancas/${cobranca.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Cobrança excluída com sucesso')
        navigate('cobrancas')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao excluir cobrança')
      }
    } catch {
      toast.error('Erro ao excluir cobrança')
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy')
    } catch {
      return dateStr
    }
  }

  // Payment progress percentage
  const paymentProgress = cobranca
    ? cobranca.totalClientePaga > 0
      ? Math.min(100, (cobranca.valorRecebido / cobranca.totalClientePaga) * 100)
      : 0
    : 0

  if (loading) {
    return <DetailSkeleton />
  }

  if (!cobranca) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <p className="text-muted-foreground">Cobrança não encontrada.</p>
      </div>
    )
  }

  const formatFormaPagamento = (fp: string) => {
    const map: Record<string, string> = {
      'Periodo': 'Período (Valor Fixo)',
      'PercentualPagar': '% Pagar',
      'PercentualReceber': '% Receber',
    }
    return map[fp] || fp
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack} className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Cobrança</h1>
              <StatusBadge status={cobranca.status} />
            </div>
            <p className="text-muted-foreground text-sm">
              {cobranca.clienteNome} · {cobranca.produtoIdentificador} ·{' '}
              {formatDate(cobranca.dataInicio)} a {formatDate(cobranca.dataFim)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate('cobranca-editar', cobranca.id)}
          >
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Resumo Financeiro */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Total Bruto</p>
              <p className="text-lg font-bold">{formatarMoeda(cobranca.totalBruto)}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Descontos</p>
              <p className="text-lg font-bold text-red-600">
                -{formatarMoeda(
                  (cobranca.descontoPartidasValor || 0) + (cobranca.descontoDinheiro || 0)
                )}
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Subtotal</p>
              <p className="text-lg font-bold">{formatarMoeda(cobranca.subtotalAposDescontos)}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Valor Percentual</p>
              <p className="text-lg font-bold">{formatarMoeda(cobranca.valorPercentual)}</p>
            </div>
          </div>

          {/* Total Cliente Paga - Highlighted */}
          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400">Total Cliente Paga</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {formatarMoeda(cobranca.totalClientePaga)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Valor Recebido</p>
                <p className="text-xl font-semibold text-green-600">
                  {formatarMoeda(cobranca.valorRecebido)}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Pago: {paymentProgress.toFixed(0)}%</span>
                <span>
                  {formatarMoeda(cobranca.valorRecebido)} / {formatarMoeda(cobranca.totalClientePaga)}
                </span>
              </div>
              <Progress value={paymentProgress} className="h-3" />
            </div>
          </div>

          {/* Saldo Devedor */}
          {cobranca.saldoDevedorGerado > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 dark:text-red-400">Saldo Devedor</p>
                <p className="text-xl font-bold text-red-700 dark:text-red-300">
                  {formatarMoeda(cobranca.saldoDevedorGerado)}
                </p>
              </div>
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={openPaymentDialog}
              >
                <CreditCard className="h-4 w-4" />
                Registrar Pagamento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Detalhes */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Detalhes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Cliente */}
            <div
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => navigate('cliente-detalhe', cobranca.clienteId)}
            >
              <div>
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className="text-sm font-medium">{cobranca.clienteNome || cobranca.cliente?.nomeExibicao}</p>
              </div>
              <User className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Produto */}
            <div
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => cobranca.produtoId && navigate('produto-detalhe', cobranca.produtoId)}
            >
              <div>
                <p className="text-xs text-muted-foreground">Produto</p>
                <p className="text-sm font-medium">{cobranca.produtoIdentificador || cobranca.produto?.identificador}</p>
                {cobranca.produto && (
                  <p className="text-xs text-muted-foreground">
                    {cobranca.produto.tipoNome} · {cobranca.produto.descricaoNome}
                  </p>
                )}
              </div>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Locação */}
            <div
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => navigate('locacao-detalhe', cobranca.locacaoId)}
            >
              <div>
                <p className="text-xs text-muted-foreground">Locação</p>
                <p className="text-sm font-medium">{formatFormaPagamento(cobranca.formaPagamento)}</p>
              </div>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Relógio */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Relógio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-xs text-muted-foreground">Relógio Anterior</p>
                <p className="text-sm font-medium">{cobranca.relogioAnterior}</p>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Relógio Atual</p>
                <p className="text-sm font-medium">{cobranca.relogioAtual}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Fichas Rodadas</p>
                <p className="text-lg font-bold">{cobranca.fichasRodadas}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Valor por Ficha</p>
                <p className="text-lg font-bold">{formatarMoeda(cobranca.valorFicha)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Datas */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Datas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Data Início</p>
                <p className="text-sm font-medium">{formatDate(cobranca.dataInicio)}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Data Fim</p>
                <p className="text-sm font-medium">{formatDate(cobranca.dataFim)}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Data Vencimento</p>
                <p className="text-sm font-medium">{formatDate(cobranca.dataVencimento)}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Data Pagamento</p>
                <p className="text-sm font-medium">{formatDate(cobranca.dataPagamento)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Observação */}
        {cobranca.observacao && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Observação</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{cobranca.observacao}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Registrar Pagamento Button (for non-paid cobranças) */}
      {cobranca.status !== 'Pago' && (
        <div className="flex justify-end">
          <Button onClick={openPaymentDialog} className="gap-2">
            <CreditCard className="h-4 w-4" />
            Registrar Pagamento
          </Button>
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>
              Registre o pagamento para a cobrança de {cobranca?.clienteNome}
            </DialogDescription>
          </DialogHeader>
          {cobranca && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Valor Total</p>
                  <p className="font-semibold">{formatarMoeda(cobranca.totalClientePaga)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor Já Recebido</p>
                  <p className="font-semibold text-green-600">{formatarMoeda(cobranca.valorRecebido)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Saldo Devedor</p>
                  <p className="font-semibold text-red-600">{formatarMoeda(cobranca.saldoDevedorGerado)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status Atual</p>
                  <StatusBadge status={cobranca.status} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentValue">Valor do Pagamento (R$)</Label>
                <Input
                  id="paymentValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentValue}
                  onChange={(e) => setPaymentValue(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={paymentSubmitting}
            >
              Cancelar
            </Button>
            <Button onClick={handlePayment} disabled={paymentSubmitting} className="gap-2">
              {paymentSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Registrar Pagamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cobrança</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta cobrança? Esta ação não pode ser desfeita.
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

function DetailSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <Card className="shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
