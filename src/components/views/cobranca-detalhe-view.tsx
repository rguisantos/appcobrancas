'use client'

import { useState, useEffect } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Printer,
  Banknote,
  QrCode,
  CreditCard as CardIcon,
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  CircleDot,
  Info,
  History,
  Map as MapIcon,
  MessageCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/layout/breadcrumb'

interface Pagamento {
  id: string
  cobrancaId: string
  valor: number
  formaPagamento: string
  dataPagamento: string
  observacao: string | null
  usuarioId: string | null
  usuarioNome: string | null
  createdAt: string
}

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

function getFormaPagamentoIcon(fp: string) {
  switch (fp) {
    case 'Dinheiro': return <Banknote className="h-4 w-4 text-green-600" />
    case 'Pix': return <QrCode className="h-4 w-4 text-teal-600" />
    case 'Cartão': return <CardIcon className="h-4 w-4 text-sky-600" />
    case 'Transferência': return <ArrowRightLeft className="h-4 w-4 text-violet-600" />
    default: return <CreditCard className="h-4 w-4" />
  }
}

function getFormaPagamentoLabel(fp: string) {
  const map: Record<string, string> = {
    'Dinheiro': 'Dinheiro',
    'Pix': 'Pix',
    'Cartão': 'Cartão',
    'Transferência': 'Transferência',
  }
  return map[fp] || fp
}

export function CobrancaDetalheView() {
  const { selectedId, navigate, goBack } = useNavigation()

  const [cobranca, setCobranca] = useState<Cobranca | null>(null)
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [loading, setLoading] = useState(true)
  const [pagamentosLoading, setPagamentosLoading] = useState(true)

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentValue, setPaymentValue] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Pix')
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentObs, setPaymentObs] = useState('')
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Fetch cobranca
  useEffect(() => {
    if (selectedId) {
      async function fetchCobranca() {
        try {
          const res = await fetch(`/api/cobrancas/${selectedId}?include=pagamentos`)
          if (res.ok) {
            const data = await res.json()
            setCobranca(data)
            setPagamentos(data.pagamentos || [])
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

  // Fetch payment history (fallback - also loaded with cobranca)
  useEffect(() => {
    if (selectedId) {
      async function fetchPagamentos() {
        try {
          const res = await fetch(`/api/cobrancas/${selectedId}?include=pagamentos`)
          if (res.ok) {
            const data = await res.json()
            setPagamentos(data.pagamentos || [])
          }
        } catch {
          // silently ignore
        } finally {
          setPagamentosLoading(false)
        }
      }
      fetchPagamentos()
    }
  }, [selectedId])

  // Open payment dialog
  const openPaymentDialog = () => {
    if (!cobranca) return
    const remaining = cobranca.totalClientePaga - cobranca.valorRecebido
    setPaymentValue(remaining > 0 ? remaining.toFixed(2) : '0')
    setPaymentMethod('Pix')
    setPaymentDate(new Date().toISOString().split('T')[0])
    setPaymentObs('')
    setPaymentDialogOpen(true)
  }

  // Submit payment
  const handlePayment = async () => {
    if (!cobranca) return

    const valor = parseFloat(paymentValue)
    if (!valor || valor <= 0) {
      toast.error('Valor do pagamento deve ser maior que zero')
      return
    }

    const remaining = cobranca.totalClientePaga - cobranca.valorRecebido
    if (valor > remaining + 0.01) {
      toast.warning(`Valor excede o saldo devedor de ${formatarMoeda(remaining)}`)
    }

    setPaymentSubmitting(true)
    try {
      const res = await fetch(`/api/cobrancas/${cobranca.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valor,
          formaPagamento: paymentMethod,
          dataPagamento: paymentDate || new Date().toISOString().split('T')[0],
          observacao: paymentObs || undefined,
        }),
      })

      if (res.ok) {
        toast.success('Pagamento registrado com sucesso')
        setPaymentDialogOpen(false)
        // Refresh cobranca and pagamentos
        const [cobrancaRes, pagamentosRes] = await Promise.all([
          fetch(`/api/cobrancas/${cobranca.id}`),
          fetch(`/api/cobrancas/${cobranca.id}?include=pagamentos`),
        ])
        if (cobrancaRes.ok) {
          setCobranca(await cobrancaRes.json())
        }
        if (pagamentosRes.ok) {
          const pagData = await pagamentosRes.json()
          setPagamentos(pagData.pagamentos || [])
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

  // Remaining balance for payment dialog
  const remainingBalance = cobranca
    ? Math.max(0, cobranca.totalClientePaga - cobranca.valorRecebido)
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

  const handlePrint = () => {
    if (!cobranca) return

    const formatCurrency = (val: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    const receiptNumber = cobranca.id.substring(0, 8).toUpperCase()
    const descontos = (cobranca.descontoPartidasValor || 0) + (cobranca.descontoDinheiro || 0)
    const now = new Date()
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

    const statusMap: Record<string, string> = {
      Pendente: 'Pendente',
      Pago: 'Pago',
      Parcial: 'Parcial',
      Atrasado: 'Atrasado',
    }

    const printContent = `
      <html>
      <head>
        <title>Recibo - ${cobranca.clienteNome}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 18px; }
          .header p { margin: 4px 0; color: #666; font-size: 12px; }
          .title { text-align: center; font-size: 16px; font-weight: bold; margin: 20px 0; text-transform: uppercase; }
          .receipt-number { text-align: center; font-size: 11px; color: #666; margin-bottom: 15px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 15px 0; }
          .info-item { padding: 6px 0; }
          .info-label { font-size: 11px; color: #666; }
          .info-value { font-size: 13px; font-weight: 500; }
          .section-title { font-size: 13px; font-weight: bold; text-transform: uppercase; margin: 18px 0 8px; color: #444; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
          .financial { border-top: 1px solid #ddd; margin-top: 15px; padding-top: 15px; }
          .financial-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
          .financial-total { font-weight: bold; font-size: 15px; border-top: 2px solid #333; margin-top: 8px; padding-top: 8px; }
          .observation { margin-top: 15px; padding: 10px; background: #f9f9f9; border-radius: 4px; font-size: 12px; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 15px; }
          .payment-history { margin-top: 15px; }
          .payment-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; border-bottom: 1px dotted #ddd; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>App Cobranças - Sistema de Gestão</h1>
          <p>Recibo de Cobrança</p>
        </div>

        <div class="receipt-number">Recibo Nº ${receiptNumber}</div>

        <div class="section-title">Informações do Cliente</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Nome</div>
            <div class="info-value">${cobranca.clienteNome || cobranca.cliente?.nomeExibicao || '—'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Identificador</div>
            <div class="info-value">${cobranca.cliente?.email || cobranca.clienteId.substring(0, 8)}</div>
          </div>
        </div>

        <div class="section-title">Produto / Locação</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Produto</div>
            <div class="info-value">${cobranca.produtoIdentificador || '—'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Forma de Pagamento</div>
            <div class="info-value">${formatFormaPagamento(cobranca.formaPagamento)}</div>
          </div>
        </div>

        <div class="section-title">Período</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Data Início</div>
            <div class="info-value">${formatDate(cobranca.dataInicio)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Data Fim</div>
            <div class="info-value">${formatDate(cobranca.dataFim)}</div>
          </div>
        </div>

        <div class="section-title">Leitura do Relógio</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Relógio Anterior</div>
            <div class="info-value">${cobranca.relogioAnterior}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Relógio Atual</div>
            <div class="info-value">${cobranca.relogioAtual}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Fichas Rodadas</div>
            <div class="info-value">${cobranca.fichasRodadas}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Valor por Ficha</div>
            <div class="info-value">${formatCurrency(cobranca.valorFicha)}</div>
          </div>
        </div>

        <div class="section-title">Resumo Financeiro</div>
        <div class="financial">
          <div class="financial-row">
            <span>Total Bruto</span>
            <span>${formatCurrency(cobranca.totalBruto)}</span>
          </div>
          <div class="financial-row">
            <span>Descontos</span>
            <span>-${formatCurrency(descontos)}</span>
          </div>
          <div class="financial-row">
            <span>Subtotal</span>
            <span>${formatCurrency(cobranca.subtotalAposDescontos)}</span>
          </div>
          <div class="financial-row">
            <span>Percentual Empresa (${cobranca.percentualEmpresa}%)</span>
            <span>${formatCurrency(cobranca.valorPercentual)}</span>
          </div>
          <div class="financial-row financial-total">
            <span>Total Cliente Paga</span>
            <span>${formatCurrency(cobranca.totalClientePaga)}</span>
          </div>
        </div>

        <div class="section-title">Pagamento</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Valor Recebido</div>
            <div class="info-value">${formatCurrency(cobranca.valorRecebido)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Status</div>
            <div class="info-value">${statusMap[cobranca.status] || cobranca.status}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Forma de Pagamento</div>
            <div class="info-value">${formatFormaPagamento(cobranca.formaPagamento)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Data Pagamento</div>
            <div class="info-value">${formatDate(cobranca.dataPagamento)}</div>
          </div>
        </div>

        ${pagamentos.length > 0 ? `
          <div class="section-title">Histórico de Pagamentos</div>
          <div class="payment-history">
            ${pagamentos.map((p: Pagamento) => `
              <div class="payment-row">
                <span>${formatDate(p.dataPagamento)} — ${p.formaPagamento}</span>
                <span>${formatCurrency(p.valor)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${cobranca.observacao ? `
          <div class="observation">
            <strong>Observação:</strong> ${cobranca.observacao}
          </div>
        ` : ''}

        <div class="footer">
          <p>Documento gerado automaticamente pelo App Cobranças</p>
          <p>${dateStr}</p>
        </div>
      </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <Breadcrumb />
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
        <div className="flex items-center gap-2 flex-wrap">
          {cobranca.status !== 'Pago' && (
            <Button
              size="sm"
              className="gap-2"
              onClick={openPaymentDialog}
            >
              <CreditCard className="h-4 w-4" />
              Registrar Pagamento
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              if (cobranca.cliente) {
                const phone = cobranca.cliente.telefonePrincipal?.replace(/\D/g, '')
                const message = encodeURIComponent(
                  `Olá ${cobranca.cliente.nomeExibicao}! Confirmamos o recebimento do pagamento de ${formatarMoeda(cobranca.valorRecebido)} referente à cobrança ${cobranca.produtoIdentificador} (${formatDate(cobranca.dataInicio)} a ${formatDate(cobranca.dataFim)}). Status atual: ${cobranca.status}.${cobranca.status !== 'Pago' ? ` Saldo devedor: ${formatarMoeda(remainingBalance)}.` : ''} Obrigado!`
                )
                const whatsappUrl = `https://wa.me/55${phone}?text=${message}`
                window.open(whatsappUrl, '_blank')
                toast.success('Mensagem aberta no WhatsApp')
              }
            }}
          >
            <MessageCircle className="h-4 w-4 text-green-600" />
            WhatsApp
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate('mapa')}
          >
            <MapIcon className="h-4 w-4" />
            Ver no Mapa
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" />
            Imprimir Recibo
          </Button>
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
          {remainingBalance > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 dark:text-red-400">Saldo Devedor</p>
                <p className="text-xl font-bold text-red-700 dark:text-red-300">
                  {formatarMoeda(remainingBalance)}
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

          {/* Fully paid indicator */}
          {cobranca.status === 'Pago' && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Cobrança Quitada</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Pagamento completo registrado em {formatDate(cobranca.dataPagamento)}
                </p>
              </div>
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

      {/* Payment History Timeline */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-teal-600" />
            Histórico de Pagamentos
          </CardTitle>
          <CardDescription>
            {pagamentos.length} pagamento{pagamentos.length !== 1 ? 's' : ''} registrado{pagamentos.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pagamentosLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : pagamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <CircleDot className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Nenhum pagamento registrado</p>
              <p className="text-xs text-muted-foreground mt-1">
                {cobranca.status !== 'Pago'
                  ? 'Clique em "Registrar Pagamento" para adicionar'
                  : 'Esta cobrança foi marcada como paga sem registro detalhado'
                }
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-300 via-teal-300 to-teal-100 dark:from-emerald-700 dark:via-teal-700 dark:to-teal-900" />

              <div className="space-y-5">
                {pagamentos.map((pag, index) => {
                  const isLatest = index === 0
                  const fpIcon = getFormaPagamentoIcon(pag.formaPagamento)

                  return (
                    <div key={pag.id} className="relative flex gap-4 pl-2">
                      {/* Timeline dot with glow */}
                      <div className={`
                        relative z-10 mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm
                        ${isLatest
                          ? 'bg-emerald-500 text-white shadow-emerald-200 dark:shadow-emerald-900'
                          : 'bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-400'
                        }
                      `}>
                        {isLatest ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <CircleDot className="h-4 w-4" />
                        )}
                      </div>

                      {/* Content card */}
                      <div className={`flex-1 p-4 rounded-xl border transition-colors ${
                        isLatest
                          ? 'border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/30 shadow-sm'
                          : 'border-border bg-card hover:border-teal-200 dark:hover:border-teal-800'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`rounded-lg p-1.5 ${isLatest ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-muted'}`}>
                              {fpIcon}
                            </div>
                            <div>
                              <span className="text-base font-bold">
                                {formatarMoeda(pag.valor)}
                              </span>
                              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                                isLatest
                                  ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                {isLatest ? 'Mais recente' : getFormaPagamentoLabel(pag.formaPagamento)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDate(pag.dataPagamento)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="px-1.5 py-0.5 rounded bg-muted">
                            {getFormaPagamentoLabel(pag.formaPagamento)}
                          </span>
                          {pag.observacao && (
                            <span className="flex items-center gap-1">
                              <Info className="h-3 w-3" />
                              {pag.observacao}
                            </span>
                          )}
                        </div>
                        {pag.usuarioNome && (
                          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/50">
                            <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-[8px] font-bold text-primary">{pag.usuarioNome.charAt(0)}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              Registrado por: {pag.usuarioNome}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {cobranca.status !== 'Pago' && pagamentos.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" size="sm" className="gap-2" onClick={openPaymentDialog}>
                <CreditCard className="h-4 w-4" />
                Registrar Novo Pagamento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Registrar Pagamento
            </DialogTitle>
            <DialogDescription>
              Registre o pagamento para a cobrança de {cobranca?.clienteNome}
            </DialogDescription>
          </DialogHeader>
          {cobranca && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2.5 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className="font-semibold">{formatarMoeda(cobranca.totalClientePaga)}</p>
                </div>
                <div className="p-2.5 bg-green-50 dark:bg-green-950/50 rounded-lg">
                  <p className="text-xs text-green-600 dark:text-green-400">Já Recebido</p>
                  <p className="font-semibold text-green-700 dark:text-green-300">{formatarMoeda(cobranca.valorRecebido)}</p>
                </div>
                <div className="p-2.5 bg-red-50 dark:bg-red-950/50 rounded-lg">
                  <p className="text-xs text-red-600 dark:text-red-400">Saldo Devedor</p>
                  <p className="font-semibold text-red-700 dark:text-red-300">{formatarMoeda(remainingBalance)}</p>
                </div>
                <div className="p-2.5 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Status Atual</p>
                  <StatusBadge status={cobranca.status} />
                </div>
              </div>

              {/* Payment Amount */}
              <div className="space-y-2">
                <Label htmlFor="paymentValue">Valor do Pagamento (R$)</Label>
                <Input
                  id="paymentValue"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remainingBalance > 0 ? (remainingBalance + 1).toFixed(2) : undefined}
                  value={paymentValue}
                  onChange={(e) => setPaymentValue(e.target.value)}
                  placeholder="0,00"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setPaymentValue(remainingBalance.toFixed(2))}
                  >
                    Valor integral
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setPaymentValue((remainingBalance / 2).toFixed(2))}
                  >
                    Metade
                  </Button>
                </div>
                {/* Remaining balance preview */}
                {paymentValue && (
                  <div className="p-2 bg-muted/50 rounded text-xs">
                    <span className="text-muted-foreground">Saldo após pagamento: </span>
                    <span className={`font-semibold ${remainingBalance - parseFloat(paymentValue) <= 0.01 ? 'text-green-600' : 'text-amber-600'}`}>
                      {formatarMoeda(Math.max(0, remainingBalance - parseFloat(paymentValue)))}
                    </span>
                    {remainingBalance - parseFloat(paymentValue) <= 0.01 && parseFloat(paymentValue) > 0 && (
                      <span className="text-green-600 ml-1">(Cobrança será quitada)</span>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dinheiro">
                      <span className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-green-600" />
                        Dinheiro
                      </span>
                    </SelectItem>
                    <SelectItem value="Pix">
                      <span className="flex items-center gap-2">
                        <QrCode className="h-4 w-4 text-teal-600" />
                        Pix
                      </span>
                    </SelectItem>
                    <SelectItem value="Cartão">
                      <span className="flex items-center gap-2">
                        <CardIcon className="h-4 w-4 text-sky-600" />
                        Cartão
                      </span>
                    </SelectItem>
                    <SelectItem value="Transferência">
                      <span className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4 text-violet-600" />
                        Transferência
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Date */}
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Data do Pagamento</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-muted-foreground">Padrão: data de hoje</p>
              </div>

              {/* Observation */}
              <div className="space-y-2">
                <Label htmlFor="paymentObs">Observação (opcional)</Label>
                <Textarea
                  id="paymentObs"
                  value={paymentObs}
                  onChange={(e) => setPaymentObs(e.target.value)}
                  placeholder="Notas sobre o pagamento..."
                  rows={2}
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
