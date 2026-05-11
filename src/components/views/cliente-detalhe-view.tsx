'use client'

import { useState, useEffect, useMemo } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  User,
  Phone,
  Mail,
  MapPin,
  Route,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  FileText,
  Wallet,
  CircleDollarSign,
  MessageCircle,
  Plus,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/layout/breadcrumb'

interface ClienteDetalhe {
  id: string
  tipoPessoa: string
  identificador: string
  nomeExibicao: string
  nomeCompleto?: string
  razaoSocial?: string
  cpf?: string
  cnpj?: string
  rg?: string
  inscricaoEstadual?: string
  telefonePrincipal: string
  email?: string
  contatos?: string
  cep: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: string
  status: string
  rota: {
    id: string
    descricao: string
    cor: string
  } | null
  locacoes: LocacaoItem[]
  cobrancas: CobrancaItem[]
}

interface LocacaoItem {
  id: string
  produtoIdentificador: string
  produtoTipo: string
  dataLocacao: string
  dataFim?: string
  formaPagamento: string
  status: string
}

interface CobrancaItem {
  id: string
  produtoIdentificador: string
  dataInicio: string
  dataFim: string
  totalClientePaga: number
  valorRecebido: number
  saldoDevedorGerado: number
  status: string
}

interface FinancialSummary {
  clienteId: string
  nomeExibicao: string
  identificador: string
  totalCobrancas: number
  totalPago: number
  totalPendente: number
  totalAtrasado: number
  totalParcial: number
  averageMonthlyPayment: number
  saldoDevedorAcumulado: number
  paymentHistory: Array<{
    mes: string
    label: string
    total: number
    pago: number
    quantidade: number
  }>
}

export function ClienteDetalheView() {
  const { selectedId, navigate, goBack } = useNavigation()
  const [cliente, setCliente] = useState<ClienteDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null)
  const [financialLoading, setFinancialLoading] = useState(true)

  useEffect(() => {
    if (!selectedId) {
      navigate('clientes')
      return
    }

    async function fetchCliente() {
      try {
        const res = await fetch(`/api/clientes/${selectedId}`)
        if (res.ok) {
          const data = await res.json()
          setCliente(data)
        } else {
          toast.error('Cliente não encontrado')
          navigate('clientes')
        }
      } catch {
        toast.error('Erro ao carregar cliente')
        navigate('clientes')
      } finally {
        setLoading(false)
      }
    }
    fetchCliente()
  }, [selectedId, navigate])

  // Fetch financial summary from API
  useEffect(() => {
    if (!selectedId) return

    async function fetchFinancial() {
      try {
        const res = await fetch(`/api/clientes/${selectedId}/financeiro`)
        if (res.ok) {
          const data = await res.json()
          setFinancialSummary(data)
        }
      } catch {
        // silently ignore
      } finally {
        setFinancialLoading(false)
      }
    }
    fetchFinancial()
  }, [selectedId])

  const handleDelete = async () => {
    if (!selectedId) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/clientes/${selectedId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Cliente excluído com sucesso')
        navigate('clientes')
      } else {
        toast.error('Erro ao excluir cliente')
      }
    } catch {
      toast.error('Erro ao excluir cliente')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Chart data for cobranças by status (computed before early returns for hooks rules)
  const chartData = useMemo(() => {
    const cobrancas = cliente?.cobrancas?.filter(c => c.status !== 'Cancelada') || []
    const statusMap: Record<string, { count: number; total: number }> = {}
    cobrancas.forEach(c => {
      if (!statusMap[c.status]) statusMap[c.status] = { count: 0, total: 0 }
      statusMap[c.status].count++
      statusMap[c.status].total += c.totalClientePaga
    })
    return Object.entries(statusMap).map(([status, data]) => ({
      status,
      count: data.count,
      total: data.total,
    }))
  }, [cliente?.cobrancas])

  if (loading) {
    return <DetailSkeleton />
  }

  if (!cliente) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <p className="text-muted-foreground">Cliente não encontrado.</p>
      </div>
    )
  }

  // Financial summary calculations
  const cobrancasAtivas = cliente.cobrancas?.filter(c => c.status !== 'Cancelada') || []
  const totalRecebido = cobrancasAtivas.reduce((acc, c) => acc + (c.valorRecebido || 0), 0)
  const totalPendente = cobrancasAtivas
    .filter(c => c.status === 'Pendente' || c.status === 'Parcial')
    .reduce((acc, c) => acc + (c.totalClientePaga - c.valorRecebido), 0)
  const totalAtrasado = cobrancasAtivas
    .filter(c => c.status === 'Atrasado')
    .reduce((acc, c) => acc + c.totalClientePaga, 0)

  const fullAddress = [
    cliente.logradouro,
    cliente.numero,
    cliente.complemento,
    cliente.bairro,
    cliente.cidade,
    cliente.estado,
    cliente.cep && `CEP: ${cliente.cep}`,
  ].filter(Boolean).join(', ') || '—'

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-9 w-9 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{cliente.nomeExibicao}</h1>
            <StatusBadge status={cliente.status} />
            {cliente.rota && (
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border-0"
                style={{
                  backgroundColor: `${cliente.rota.cor}20`,
                  color: cliente.rota.cor,
                }}
              >
                <Route className="h-3 w-3 mr-1" />
                {cliente.rota.descricao}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">{cliente.identificador}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(financialSummary?.saldoDevedorAcumulado ?? (totalAtrasado + totalPendente)) > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
              onClick={() => {
                const saldoDevedor = formatarMoeda(financialSummary?.saldoDevedorAcumulado ?? (totalAtrasado + totalPendente))
                const phone = cliente.telefonePrincipal.replace(/[()\-\s]/g, '').replace(/^0+/, '')
                const phoneWithCountry = phone.startsWith('55') ? phone : `55${phone}`
                const message = encodeURIComponent(
                  `Olá, ${cliente.nomeExibicao}! \n\nTemos cobranças pendentes em aberto no valor de R$ ${saldoDevedor}.\n\nPor favor, entre em contato para regularizar.\n\nApp Cobranças - Sistema de Gestão`
                )
                window.open(`https://web.whatsapp.com/send?phone=${phoneWithCountry}&text=${message}`, '_blank')
                toast.success('Lembrete aberto no WhatsApp')
              }}
            >
              <MessageCircle className="h-4 w-4" />
              Enviar Lembrete
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate('cliente-editar', cliente.id)}
          >
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Personal Info */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <InfoRow label="Tipo" value={cliente.tipoPessoa === 'Fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'} />
            {cliente.tipoPessoa === 'Fisica' ? (
              <>
                <InfoRow label="Nome" value={cliente.nomeCompleto} />
                <InfoRow label="CPF" value={cliente.cpf} />
                <InfoRow label="RG" value={cliente.rg} />
              </>
            ) : (
              <>
                <InfoRow label="Razão Social" value={cliente.razaoSocial} />
                <InfoRow label="CNPJ" value={cliente.cnpj} />
                <InfoRow label="IE" value={cliente.inscricaoEstadual} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <InfoRow label="Telefone" value={cliente.telefonePrincipal} />
            <InfoRow label="Email" value={cliente.email} />
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{fullAddress}</p>
          </CardContent>
        </Card>

        {/* Route Info */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Route className="h-4 w-4" />
              Rota
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {cliente.rota ? (
              <>
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: cliente.rota.cor }}
                  />
                  <span className="text-sm font-medium">{cliente.rota.descricao}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma rota vinculada</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumo Financeiro - KPI Cards */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-600" />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Total de Cobranças */}
            <div className="p-3 rounded-lg border border-l-4 border-l-slate-500 bg-card">
              <div className="flex items-center gap-2 mb-1">
                <div className="rounded-md p-1.5 bg-slate-100 dark:bg-slate-900">
                  <FileText className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                </div>
                <p className="text-xs text-muted-foreground">Cobranças</p>
              </div>
              <p className="text-xl font-bold">
                {financialLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  financialSummary?.totalCobrancas ?? cliente.cobrancas?.length ?? 0
                )}
              </p>
            </div>

            {/* Total Pago */}
            <div className="p-3 rounded-lg border border-l-4 border-l-emerald-500 bg-card">
              <div className="flex items-center gap-2 mb-1">
                <div className="rounded-md p-1.5 bg-emerald-100 dark:bg-emerald-900">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-xs text-muted-foreground">Total Pago</p>
              </div>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {financialLoading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  formatarMoeda(financialSummary?.totalPago ?? totalRecebido)
                )}
              </p>
            </div>

            {/* Total Pendente */}
            <div className="p-3 rounded-lg border border-l-4 border-l-amber-500 bg-card">
              <div className="flex items-center gap-2 mb-1">
                <div className="rounded-md p-1.5 bg-amber-100 dark:bg-amber-900">
                  <DollarSign className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-xs text-muted-foreground">Total Pendente</p>
              </div>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {financialLoading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  formatarMoeda(financialSummary?.totalPendente ?? totalPendente)
                )}
              </p>
            </div>

            {/* Saldo Devedor */}
            <div className={`p-3 rounded-lg border bg-card ${
              (financialSummary?.saldoDevedorAcumulado ?? (totalAtrasado + totalPendente)) > 0
                ? 'border-l-4 border-l-red-500'
                : 'border-l-4 border-l-green-500'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`rounded-md p-1.5 ${
                  (financialSummary?.saldoDevedorAcumulado ?? (totalAtrasado + totalPendente)) > 0
                    ? 'bg-red-100 dark:bg-red-900'
                    : 'bg-green-100 dark:bg-green-900'
                }`}>
                  <CircleDollarSign className={`h-3.5 w-3.5 ${
                    (financialSummary?.saldoDevedorAcumulado ?? (totalAtrasado + totalPendente)) > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`} />
                </div>
                <p className="text-xs text-muted-foreground">Saldo Devedor</p>
              </div>
              <p className={`text-xl font-bold ${
                (financialSummary?.saldoDevedorAcumulado ?? (totalAtrasado + totalPendente)) > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {financialLoading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  formatarMoeda(financialSummary?.saldoDevedorAcumulado ?? (totalAtrasado + totalPendente))
                )}
              </p>
              {(financialSummary?.saldoDevedorAcumulado ?? (totalAtrasado + totalPendente)) <= 0 && (
                <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5">Sem dívidas</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary Chart */}
      {chartData.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => formatarMoeda(value)} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={
                      entry.status === 'Pago' ? '#22c55e' :
                      entry.status === 'Parcial' ? '#f97316' :
                      entry.status === 'Pendente' ? '#eab308' :
                      entry.status === 'Atrasado' ? '#ef4444' :
                      '#94a3b8'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Locações & Cobranças */}
      <Tabs defaultValue="locacoes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="locacoes">
            Locações ({cliente.locacoes?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="cobrancas">
            Cobranças ({cliente.cobrancas?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Locações Tab */}
        <TabsContent value="locacoes">
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {!cliente.locacoes || cliente.locacoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <TrendingUp className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Nenhuma locação registrada</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    As locações deste cliente aparecerão aqui
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data Locação</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cliente.locacoes.map((loc) => (
                      <TableRow
                        key={loc.id}
                        className="cursor-pointer"
                        onClick={() => navigate('locacao-detalhe', loc.id)}
                      >
                        <TableCell className="font-medium">{loc.produtoIdentificador}</TableCell>
                        <TableCell className="text-muted-foreground">{loc.produtoTipo}</TableCell>
                        <TableCell>{loc.dataLocacao}</TableCell>
                        <TableCell>{loc.dataFim || '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{loc.formaPagamento}</TableCell>
                        <TableCell>
                          <StatusBadge status={loc.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cobranças Tab */}
        <TabsContent value="cobrancas">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Cobranças</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  onClick={() => navigate('cobranca-nova', null, { clienteId: cliente.id })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nova Cobrança
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!cliente.cobrancas || cliente.cobrancas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileTextIcon className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Nenhuma cobrança registrada</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    As cobranças deste cliente aparecerão aqui
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Recebido</TableHead>
                      <TableHead>Saldo Devedor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cliente.cobrancas.map((cob) => (
                      <TableRow
                        key={cob.id}
                        className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                          cob.status === 'Pago' ? 'border-l-4 border-l-green-500' :
                          cob.status === 'Pendente' ? 'border-l-4 border-l-yellow-500' :
                          cob.status === 'Atrasado' ? 'border-l-4 border-l-red-500' :
                          cob.status === 'Parcial' ? 'border-l-4 border-l-orange-500' :
                          ''
                        }`}
                        onClick={() => navigate('cobranca-detalhe', cob.id)}
                      >
                        <TableCell className="font-medium">{cob.produtoIdentificador}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {cob.dataInicio} a {cob.dataFim}
                        </TableCell>
                        <TableCell>{formatarMoeda(cob.totalClientePaga)}</TableCell>
                        <TableCell>{formatarMoeda(cob.valorRecebido)}</TableCell>
                        <TableCell>
                          {cob.saldoDevedorGerado > 0 ? (
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              {formatarMoeda(cob.saldoDevedorGerado)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={cob.status} />
                            {(cob.status === 'Pendente' || cob.status === 'Atrasado' || cob.status === 'Parcial') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const saldoDevedor = formatarMoeda(cob.saldoDevedorGerado || cob.totalClientePaga - cob.valorRecebido)
                                  const phone = cliente.telefonePrincipal.replace(/[()\-\s]/g, '').replace(/^0+/, '')
                                  const phoneWithCountry = phone.startsWith('55') ? phone : `55${phone}`
                                  const message = encodeURIComponent(
                                    `Olá, ${cliente.nomeExibicao}! \n\nTemos cobranças pendentes em aberto no valor de R$ ${saldoDevedor}.\n\nPor favor, entre em contato para regularizar.\n\nApp Cobranças - Sistema de Gestão`
                                  )
                                  window.open(`https://web.whatsapp.com/send?phone=${phoneWithCountry}&text=${message}`, '_blank')
                                }}
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cliente &quot;{cliente.nomeExibicao}&quot; será
              marcado como excluído no sistema.
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

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}:</span>
      <span className="text-sm">{value}</span>
    </div>
  )
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  )
}

function DetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-10 w-64" />
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
