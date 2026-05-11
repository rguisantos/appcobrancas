'use client'

import { useState, useEffect, useRef } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'

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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Pencil,
  Repeat,
  Warehouse,
  User,
  Package,
  DollarSign,
  Search,
  Loader2,
  CreditCard,
  Clock,
  CalendarDays,
  Percent,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/layout/breadcrumb'

interface LocacaoDetalhe {
  id: string
  clienteId: string
  clienteNome: string
  produtoId: string
  produtoIdentificador: string
  produtoTipo: string
  dataLocacao: string
  dataFim?: string
  formaPagamento: string
  numeroRelogio: string
  precoFicha: number
  percentualEmpresa: number
  percentualCliente: number
  valorFixo?: number
  periodicidade?: string
  dataPrimeiraCobranca?: string
  observacoes?: string
  status: string
  trocaPano: boolean
  cliente: {
    id: string
    nomeExibicao: string
    telefonePrincipal: string
    email?: string
    logradouro: string
    numero: string
    bairro: string
    cidade: string
    estado: string
    cep: string
  }
  produto: {
    id: string
    identificador: string
    tipoNome: string
    descricaoNome: string
    numeroRelogio: string
  }
  cobrancas: CobrancaItem[]
}

interface CobrancaItem {
  id: string
  dataInicio: string
  dataFim: string
  relogioAnterior: number
  relogioAtual: number
  fichasRodadas: number
  totalBruto: number
  totalClientePaga: number
  valorRecebido: number
  saldoDevedorGerado: number
  status: string
  formaPagamento: string
}

interface ClienteOption {
  id: string
  nomeExibicao: string
}

interface EstabelecimentoOption {
  id: string
  nome: string
}

export function LocacaoDetalheView() {
  const { selectedId, navigate, goBack } = useNavigation()
  const [locacao, setLocacao] = useState<LocacaoDetalhe | null>(null)
  const [loading, setLoading] = useState(true)

  // Relocar dialog
  const [showRelocarDialog, setShowRelocarDialog] = useState(false)
  const [relocarData, setRelocarData] = useState({
    clienteId: '',
    clienteNome: '',
    numeroRelogio: '0',
    formaPagamento: 'Periodo',
    motivo: '',
    trocaPano: false,
  })
  const [relocarSubmitting, setRelocarSubmitting] = useState(false)
  const [relocarClientes, setRelocarClientes] = useState<ClienteOption[]>([])
  const [relocarClienteSearch, setRelocarClienteSearch] = useState('')
  const [showRelocarDropdown, setShowRelocarDropdown] = useState(false)
  const relocarRef = useRef<HTMLDivElement>(null)

  // Enviar estoque dialog
  const [showEstoqueDialog, setShowEstoqueDialog] = useState(false)
  const [estoqueData, setEstoqueData] = useState({
    estabelecimento: '',
    motivo: '',
    observacao: '',
  })
  const [estoqueSubmitting, setEstoqueSubmitting] = useState(false)
  const [estabelecimentos, setEstabelecimentos] = useState<EstabelecimentoOption[]>([])

  // Fetch locacao
  useEffect(() => {
    if (!selectedId) {
      navigate('locacoes')
      return
    }

    async function fetchLocacao() {
      try {
        const res = await fetch(`/api/locacoes/${selectedId}`)
        if (res.ok) {
          const data = await res.json()
          setLocacao(data)
        } else {
          toast.error('Locação não encontrada')
          navigate('locacoes')
        }
      } catch {
        toast.error('Erro ao carregar locação')
        navigate('locacoes')
      } finally {
        setLoading(false)
      }
    }
    fetchLocacao()
  }, [selectedId, navigate])

  // Fetch estabelecimentos for estoque dialog
  useEffect(() => {
    async function fetchEstabelecimentos() {
      try {
        const res = await fetch('/api/estabelecimentos')
        if (res.ok) {
          setEstabelecimentos(await res.json())
        }
      } catch (error) {
        console.error('Erro ao buscar estabelecimentos:', error)
      }
    }
    fetchEstabelecimentos()
  }, [])

  // Relocar: search clientes
  useEffect(() => {
    if (!relocarClienteSearch || relocarData.clienteId) return
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clientes?search=${encodeURIComponent(relocarClienteSearch)}&limit=10`)
        if (res.ok) {
          const data = await res.json()
          setRelocarClientes(data.data || [])
          setShowRelocarDropdown(true)
        }
      } catch (error) {
        console.error('Erro ao buscar clientes:', error)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [relocarClienteSearch, relocarData.clienteId])

  // Click outside to close relocar dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (relocarRef.current && !relocarRef.current.contains(e.target as Node)) {
        setShowRelocarDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle relocar
  const handleRelocar = async () => {
    if (!relocarData.clienteId) {
      toast.error('Selecione um cliente')
      return
    }

    setRelocarSubmitting(true)
    try {
      // End current locação
      const endRes = await fetch(`/api/locacoes/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: locacao?.clienteId,
          produtoId: locacao?.produtoId,
          dataLocacao: locacao?.dataLocacao,
          dataFim: new Date().toISOString().split('T')[0],
          formaPagamento: locacao?.formaPagamento,
          numeroRelogio: relocarData.numeroRelogio || locacao?.numeroRelogio || '0',
          precoFicha: locacao?.precoFicha || 0,
          percentualEmpresa: locacao?.percentualEmpresa || 0,
          percentualCliente: locacao?.percentualCliente || 0,
          valorFixo: locacao?.valorFixo,
          periodicidade: locacao?.periodicidade,
          observacoes: relocarData.motivo ? `Relocação: ${relocarData.motivo}` : locacao?.observacoes,
          trocaPano: relocarData.trocaPano,
        }),
      })

      if (!endRes.ok) {
        toast.error('Erro ao finalizar locação atual')
        return
      }

      // Create new locação
      const createRes = await fetch('/api/locacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: relocarData.clienteId,
          produtoId: locacao?.produtoId,
          dataLocacao: new Date().toISOString().split('T')[0],
          formaPagamento: relocarData.formaPagamento,
          numeroRelogio: relocarData.numeroRelogio || '0',
          precoFicha: locacao?.precoFicha || 0,
          percentualEmpresa: locacao?.percentualEmpresa || 0,
          percentualCliente: locacao?.percentualCliente || 0,
          valorFixo: relocarData.formaPagamento === 'Periodo' ? (locacao?.valorFixo || 0) : undefined,
          periodicidade: relocarData.formaPagamento === 'Periodo' ? (locacao?.periodicidade || 'Mensal') : undefined,
          observacoes: relocarData.motivo ? `Relocação de ${locacao?.clienteNome}: ${relocarData.motivo}` : '',
          trocaPano: relocarData.trocaPano,
        }),
      })

      if (createRes.ok) {
        toast.success('Relocação realizada com sucesso')
        setShowRelocarDialog(false)
        navigate('locacoes')
      } else {
        toast.error('Erro ao criar nova locação')
      }
    } catch {
      toast.error('Erro ao realizar relocação')
    } finally {
      setRelocarSubmitting(false)
    }
  }

  // Handle enviar para estoque
  const handleEnviarEstoque = async () => {
    if (!estoqueData.estabelecimento) {
      toast.error('Selecione um estabelecimento')
      return
    }

    setEstoqueSubmitting(true)
    try {
      // End locação
      const endRes = await fetch(`/api/locacoes/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: locacao?.clienteId,
          produtoId: locacao?.produtoId,
          dataLocacao: locacao?.dataLocacao,
          dataFim: new Date().toISOString().split('T')[0],
          formaPagamento: locacao?.formaPagamento,
          numeroRelogio: locacao?.numeroRelogio || '0',
          precoFicha: locacao?.precoFicha || 0,
          percentualEmpresa: locacao?.percentualEmpresa || 0,
          percentualCliente: locacao?.percentualCliente || 0,
          valorFixo: locacao?.valorFixo,
          periodicidade: locacao?.periodicidade,
          observacoes: estoqueData.motivo ? `Enviado para estoque: ${estoqueData.motivo}` : locacao?.observacoes,
          trocaPano: locacao?.trocaPano || false,
        }),
      })

      if (!endRes.ok) {
        toast.error('Erro ao finalizar locação')
        return
      }

      // Update produto estabelecimento
      if (locacao?.produtoId) {
        await fetch(`/api/produtos/${locacao.produtoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identificador: locacao.produtoIdentificador,
            tipoId: locacao.produto?.tipoNome || '',
            tipoNome: locacao.produto?.tipoNome || '',
            descricaoId: '',
            descricaoNome: '',
            tamanhoId: '',
            tamanhoNome: '',
            estabelecimento: estoqueData.estabelecimento,
            observacao: estoqueData.observacao,
          }),
        })
      }

      toast.success('Produto enviado para estoque com sucesso')
      setShowEstoqueDialog(false)
      navigate('locacoes')
    } catch {
      toast.error('Erro ao enviar para estoque')
    } finally {
      setEstoqueSubmitting(false)
    }
  }

  if (loading) {
    return <DetailSkeleton />
  }

  if (!locacao) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <p className="text-muted-foreground">Locação não encontrada.</p>
      </div>
    )
  }

  const formatFormaPagamento = (fp: string) => {
    const map: Record<string, string> = {
      'Periodo': 'Período (Valor Fixo)',
      'PercentualPagar': 'Percentual a Pagar',
      'PercentualReceber': 'Percentual a Receber',
    }
    return map[fp] || fp
  }

  const clienteFullAddress = [
    locacao.cliente?.logradouro,
    locacao.cliente?.numero,
    locacao.cliente?.bairro,
    locacao.cliente?.cidade,
    locacao.cliente?.estado,
    locacao.cliente?.cep && `CEP: ${locacao.cliente.cep}`,
  ].filter(Boolean).join(', ') || '—'

  // Cobranças summary
  const cobrancasSummary = {
    total: locacao.cobrancas?.length || 0,
    pago: locacao.cobrancas?.filter(c => c.status === 'Pago').length || 0,
    pendente: locacao.cobrancas?.filter(c => c.status === 'Pendente' || c.status === 'Parcial').length || 0,
    atrasado: locacao.cobrancas?.filter(c => c.status === 'Atrasado').length || 0,
    totalRecebido: locacao.cobrancas?.reduce((acc, c) => acc + (c.status === 'Pago' || c.status === 'Parcial' ? c.valorRecebido : 0), 0) || 0,
    totalDevido: locacao.cobrancas?.reduce((acc, c) => acc + (c.status !== 'Pago' ? c.totalClientePaga - c.valorRecebido : 0), 0) || 0,
  }

  // Timeline events
  const timelineEvents = []
  if (locacao.dataLocacao) {
    timelineEvents.push({ date: locacao.dataLocacao, label: 'Locação criada', icon: <CalendarDays className="h-4 w-4" />, color: 'bg-green-500' })
  }
  if (locacao.dataPrimeiraCobranca) {
    timelineEvents.push({ date: locacao.dataPrimeiraCobranca, label: 'Primeira cobrança', icon: <DollarSign className="h-4 w-4" />, color: 'bg-yellow-500' })
  }
  if (locacao.status === 'Finalizada' && locacao.dataFim) {
    timelineEvents.push({ date: locacao.dataFim, label: 'Locação finalizada', icon: <Clock className="h-4 w-4" />, color: 'bg-gray-500' })
  } else if (locacao.status === 'Cancelada' && locacao.dataFim) {
    timelineEvents.push({ date: locacao.dataFim, label: 'Locação cancelada', icon: <Clock className="h-4 w-4" />, color: 'bg-red-500' })
  } else {
    timelineEvents.push({ date: new Date().toLocaleDateString('pt-BR'), label: 'Em andamento', icon: <Clock className="h-4 w-4" />, color: 'bg-emerald-500' })
  }

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
            <h1 className="text-2xl font-bold truncate">
              {locacao.clienteNome} — {locacao.produtoIdentificador}
            </h1>
            <StatusBadge status={locacao.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            Locação desde {locacao.dataLocacao}
            {locacao.dataFim && ` até ${locacao.dataFim}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate('locacao-editar', locacao.id)}
          >
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              setRelocarData({
                clienteId: '',
                clienteNome: '',
                numeroRelogio: locacao.numeroRelogio || '0',
                formaPagamento: locacao.formaPagamento || 'Periodo',
                motivo: '',
                trocaPano: false,
              })
              setShowRelocarDialog(true)
            }}
          >
            <Repeat className="h-4 w-4" />
            Relocar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              setEstoqueData({ estabelecimento: '', motivo: '', observacao: '' })
              setShowEstoqueDialog(true)
            }}
          >
            <Warehouse className="h-4 w-4" />
            Enviar Estoque
          </Button>
        </div>
      </div>

      {/* Payment Method Card */}
      <Card className="shadow-sm border-l-4 border-l-emerald-500">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center shrink-0">
              <CreditCard className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Forma de Pagamento</h3>
              <p className="text-lg font-bold">{formatFormaPagamento(locacao.formaPagamento)}</p>
            </div>
            <div className="flex items-center gap-6">
              {locacao.formaPagamento === 'Periodo' ? (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Valor Fixo</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {locacao.valorFixo ? formatarMoeda(locacao.valorFixo) : '—'}
                  </p>
                  {locacao.periodicidade && (
                    <p className="text-xs text-muted-foreground">{locacao.periodicidade}</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">% Empresa</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${locacao.percentualEmpresa}%` }} />
                      </div>
                      <span className="text-sm font-bold">{locacao.percentualEmpresa}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">% Cliente</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${locacao.percentualCliente}%` }} />
                      </div>
                      <span className="text-sm font-bold">{locacao.percentualCliente}%</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            Ciclo da Locação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-0 w-full">
            {timelineEvents.map((event, i) => (
              <div key={i} className="flex-1 flex flex-col items-center relative">
                {/* Connector line */}
                {i < timelineEvents.length - 1 && (
                  <div className="absolute top-4 left-1/2 w-full h-0.5 bg-border -z-0" />
                )}
                {/* Dot */}
                <div className={`relative z-10 h-8 w-8 rounded-full ${event.color} flex items-center justify-center text-white shadow-sm`}>
                  {event.icon}
                </div>
                <p className="text-xs font-medium mt-2 text-center">{event.label}</p>
                <p className="text-[10px] text-muted-foreground text-center">{event.date}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Cobranças */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Histórico de Cobranças
            <span className="ml-auto flex items-center gap-3">
              <span className="text-xs font-normal text-green-600 dark:text-green-400">{cobrancasSummary.pago} pagas</span>
              <span className="text-xs font-normal text-yellow-600 dark:text-yellow-400">{cobrancasSummary.pendente} pendentes</span>
              <span className="text-xs font-normal text-red-600 dark:text-red-400">{cobrancasSummary.atrasado} atrasadas</span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!locacao.cobrancas || locacao.cobrancas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Nenhuma cobrança registrada</p>
              <p className="text-xs text-muted-foreground mt-1">
                As cobranças desta locação aparecerão aqui
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead className="hidden md:table-cell">Relógio</TableHead>
                  <TableHead className="hidden md:table-cell">Fichas</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Recebido</TableHead>
                  <TableHead>Saldo Devedor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locacao.cobrancas.map((cob) => {
                  const statusBorder = cob.status === 'Pago' ? 'border-l-4 border-l-green-500' : cob.status === 'Pendente' ? 'border-l-4 border-l-yellow-500' : cob.status === 'Atrasado' ? 'border-l-4 border-l-red-500' : cob.status === 'Parcial' ? 'border-l-4 border-l-orange-500' : 'border-l-4 border-l-gray-400'
                  return (
                    <TableRow
                      key={cob.id}
                      className={`cursor-pointer hover:bg-muted/50 transition-colors ${statusBorder}`}
                      onClick={() => navigate('cobranca-detalhe', cob.id)}
                    >
                      <TableCell className="text-xs">
                        {cob.dataInicio} a {cob.dataFim}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                        {cob.relogioAnterior} → {cob.relogioAtual}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {cob.fichasRodadas}
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
                        <StatusBadge status={cob.status} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Cliente Info */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <InfoRow label="Nome" value={locacao.cliente?.nomeExibicao || locacao.clienteNome} />
            <InfoRow label="Telefone" value={locacao.cliente?.telefonePrincipal} />
            <InfoRow label="Email" value={locacao.cliente?.email} />
            <InfoRow label="Endereço" value={clienteFullAddress} />
          </CardContent>
        </Card>

        {/* Produto Info */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Package className="h-4 w-4" />
              Produto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <InfoRow label="Identificador" value={locacao.produto?.identificador || locacao.produtoIdentificador} />
            <InfoRow label="Tipo" value={locacao.produto?.tipoNome || locacao.produtoTipo} />
            <InfoRow label="Descrição" value={locacao.produto?.descricaoNome} />
            <InfoRow label="Relógio" value={locacao.numeroRelogio} />
          </CardContent>
        </Card>

        {/* Financial Info */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Informações Financeiras
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <InfoRow label="Pagamento" value={formatFormaPagamento(locacao.formaPagamento)} />
            {locacao.formaPagamento === 'Periodo' ? (
              <>
                <InfoRow label="Valor Fixo" value={locacao.valorFixo ? formatarMoeda(locacao.valorFixo) : '—'} />
                <InfoRow label="Periodicidade" value={locacao.periodicidade || '—'} />
              </>
            ) : (
              <>
                <InfoRow label="Preço Ficha" value={formatarMoeda(locacao.precoFicha)} />
                <InfoRow label="% Empresa" value={`${locacao.percentualEmpresa}%`} />
                <InfoRow label="% Cliente" value={`${locacao.percentualCliente}%`} />
              </>
            )}
            <InfoRow label="Troca Pano" value={locacao.trocaPano ? 'Sim' : 'Não'} />
            {locacao.dataPrimeiraCobranca && (
              <InfoRow label="1ª Cobrança" value={locacao.dataPrimeiraCobranca} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Observações */}
      {locacao.observacoes && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{locacao.observacoes}</p>
          </CardContent>
        </Card>
      )}

      {/* Relocar Dialog */}
      <Dialog open={showRelocarDialog} onOpenChange={setShowRelocarDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Relocar Produto</DialogTitle>
            <DialogDescription>
              Finalize a locação atual e crie uma nova para outro cliente.
              Produto: {locacao.produtoIdentificador}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Novo Cliente */}
            <div className="space-y-2" ref={relocarRef}>
              <Label>Novo Cliente *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar cliente..."
                  value={relocarClienteSearch}
                  onChange={(e) => {
                    setRelocarClienteSearch(e.target.value)
                    if (relocarData.clienteId) {
                      setRelocarData(prev => ({ ...prev, clienteId: '', clienteNome: '' }))
                    }
                  }}
                  onFocus={() => relocarClientes.length > 0 && setShowRelocarDropdown(true)}
                />
                {relocarData.clienteId && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="text-xs text-green-600 font-medium">✓ {relocarData.clienteNome}</span>
                  </div>
                )}
                {showRelocarDropdown && relocarClientes.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {relocarClientes.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                        onClick={() => {
                          setRelocarData(prev => ({ ...prev, clienteId: c.id, clienteNome: c.nomeExibicao }))
                          setRelocarClienteSearch(c.nomeExibicao)
                          setShowRelocarDropdown(false)
                        }}
                      >
                        {c.nomeExibicao}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Novo Relógio */}
            <div className="space-y-2">
              <Label htmlFor="relocar-relogio">Novo Nº Relógio</Label>
              <Input
                id="relocar-relogio"
                value={relocarData.numeroRelogio}
                onChange={(e) => setRelocarData(prev => ({ ...prev, numeroRelogio: e.target.value }))}
                placeholder="0"
              />
            </div>

            {/* Forma Pagamento */}
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <RadioGroup
                value={relocarData.formaPagamento}
                onValueChange={(v) => setRelocarData(prev => ({ ...prev, formaPagamento: v }))}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Periodo" id="relocar-periodo" />
                  <Label htmlFor="relocar-periodo" className="cursor-pointer">Período</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PercentualPagar" id="relocar-ppagar" />
                  <Label htmlFor="relocar-ppagar" className="cursor-pointer">% Pagar</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PercentualReceber" id="relocar-preceber" />
                  <Label htmlFor="relocar-preceber" className="cursor-pointer">% Receber</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Motivo */}
            <div className="space-y-2">
              <Label htmlFor="relocar-motivo">Motivo</Label>
              <Input
                id="relocar-motivo"
                value={relocarData.motivo}
                onChange={(e) => setRelocarData(prev => ({ ...prev, motivo: e.target.value }))}
                placeholder="Motivo da relocação (opcional)"
              />
            </div>

            {/* Troca Pano */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="relocar-troca-pano"
                checked={relocarData.trocaPano}
                onCheckedChange={(checked) => setRelocarData(prev => ({ ...prev, trocaPano: checked === true }))}
              />
              <Label htmlFor="relocar-troca-pano" className="cursor-pointer">Troca de Pano</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRelocarDialog(false)} disabled={relocarSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleRelocar} disabled={relocarSubmitting} className="gap-2">
              {relocarSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Relocando...
                </>
              ) : (
                <>
                  <Repeat className="h-4 w-4" />
                  Relocar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enviar Estoque Dialog */}
      <Dialog open={showEstoqueDialog} onOpenChange={setShowEstoqueDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Enviar para Estoque</DialogTitle>
            <DialogDescription>
              Finalize a locação e envie o produto {locacao.produtoIdentificador} para o estoque.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Estabelecimento */}
            <div className="space-y-2">
              <Label>Estabelecimento *</Label>
              <Select
                value={estoqueData.estabelecimento}
                onValueChange={(v) => setEstoqueData(prev => ({ ...prev, estabelecimento: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o estabelecimento" />
                </SelectTrigger>
                <SelectContent>
                  {estabelecimentos.map((est) => (
                    <SelectItem key={est.id} value={est.nome}>
                      {est.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {estabelecimentos.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum estabelecimento cadastrado. Digite o nome manualmente.
                </p>
              )}
              {!estabelecimentos.length && (
                <Input
                  placeholder="Nome do estabelecimento"
                  value={estoqueData.estabelecimento}
                  onChange={(e) => setEstoqueData(prev => ({ ...prev, estabelecimento: e.target.value }))}
                />
              )}
            </div>

            {/* Motivo */}
            <div className="space-y-2">
              <Label htmlFor="estoque-motivo">Motivo *</Label>
              <Input
                id="estoque-motivo"
                value={estoqueData.motivo}
                onChange={(e) => setEstoqueData(prev => ({ ...prev, motivo: e.target.value }))}
                placeholder="Motivo do envio para estoque"
              />
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <Label htmlFor="estoque-obs">Observação</Label>
              <Textarea
                id="estoque-obs"
                value={estoqueData.observacao}
                onChange={(e) => setEstoqueData(prev => ({ ...prev, observacao: e.target.value }))}
                placeholder="Observações adicionais"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEstoqueDialog(false)} disabled={estoqueSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleEnviarEstoque} disabled={estoqueSubmitting} className="gap-2">
              {estoqueSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Warehouse className="h-4 w-4" />
                  Enviar para Estoque
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function DetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
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
