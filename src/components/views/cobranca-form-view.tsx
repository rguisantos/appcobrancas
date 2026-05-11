'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2, Save, Search, Calculator, Info, Lightbulb, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { formatarMoeda, calcularCobranca, determinarStatusPagamento, type CobrancaCalcResult } from '@/lib/cobranca-calculos'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Checkbox } from '@/components/ui/checkbox'
import { format, parseISO } from 'date-fns'

interface Locacao {
  id: string
  clienteId: string
  clienteNome: string
  produtoId: string
  produtoIdentificador: string
  produtoTipo: string
  formaPagamento: string
  numeroRelogio: string
  precoFicha: number
  percentualEmpresa: number
  percentualCliente: number
  valorFixo: number | null
  periodicidade: string | null
  dataLocacao: string
  dataPrimeiraCobranca?: string
  ultimaLeituraRelogio: number | null
  status: string
  cliente: {
    id: string
    nomeExibicao: string
  } | null
  produto: {
    id: string
    identificador: string
  } | null
}

interface CobrancaFormData {
  locacaoId: string
  clienteId: string
  clienteNome: string
  produtoId: string
  produtoIdentificador: string
  formaPagamento: string
  precoFicha: number
  percentualEmpresa: number
  valorFixo: number | null
  dataInicio: string
  dataFim: string
  relogioAnterior: number
  relogioAtual: number
  descontoPartidasQtd: number
  descontoPartidasValor: number
  descontoDinheiro: number
  valorRecebido: number
  status: string
  observacao: string
}

const initialFormData: CobrancaFormData = {
  locacaoId: '',
  clienteId: '',
  clienteNome: '',
  produtoId: '',
  produtoIdentificador: '',
  formaPagamento: 'Periodo',
  precoFicha: 0,
  percentualEmpresa: 0,
  valorFixo: null,
  dataInicio: '',
  dataFim: '',
  relogioAnterior: 0,
  relogioAtual: 0,
  descontoPartidasQtd: 0,
  descontoPartidasValor: 0,
  descontoDinheiro: 0,
  valorRecebido: 0,
  status: 'Pendente',
  observacao: '',
}

export function CobrancaFormView() {
  const { selectedId, currentView, navigate, goBack, params: navParams } = useNavigation()
  const isEditing = currentView === 'cobranca-editar' && !!selectedId

  const [formData, setFormData] = useState<CobrancaFormData>(initialFormData)
  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)

  // Open cobranças for FIFO payment
  const [openCobrancas, setOpenCobrancas] = useState<Array<{id: string; dataVencimento: string; totalClientePaga: number; valorRecebido: number; saldoDevedor: number; produtoIdentificador: string}>>([])
  const [selectedOpenIds, setSelectedOpenIds] = useState<Set<string>>(new Set())

  // Locação search
  const [locacaoSearch, setLocacaoSearch] = useState('')
  const [locacoes, setLocacoes] = useState<Locacao[]>([])
  const [showLocacaoDropdown, setShowLocacaoDropdown] = useState(false)
  const locacaoDropdownRef = useRef<HTMLDivElement>(null)

  // Search locações
  useEffect(() => {
    if (!locacaoSearch || formData.locacaoId) {
      if (locacaoSearch === '') setLocacoes([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/locacoes?status=Ativa&limit=20`)
        if (res.ok) {
          const data = await res.json()
          const items = (data.data || []) as Locacao[]
          // Filter client-side by search term
          const filtered = items.filter((l: Locacao) =>
            l.clienteNome?.toLowerCase().includes(locacaoSearch.toLowerCase()) ||
            l.produtoIdentificador?.toLowerCase().includes(locacaoSearch.toLowerCase()) ||
            l.cliente?.nomeExibicao?.toLowerCase().includes(locacaoSearch.toLowerCase()) ||
            l.produto?.identificador?.toLowerCase().includes(locacaoSearch.toLowerCase())
          )
          setLocacoes(filtered)
          setShowLocacaoDropdown(true)
        }
      } catch (error) {
        console.error('Erro ao buscar locações:', error)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [locacaoSearch, formData.locacaoId])

  // Load all active locações initially for dropdown
  useEffect(() => {
    async function fetchLocacoes() {
      try {
        const res = await fetch(`/api/locacoes?status=Ativa&limit=50`)
        if (res.ok) {
          const data = await res.json()
          const locacoesData = data.data || []
          setLocacoes(locacoesData)

          // Auto-select locação if clienteId is provided via navigation params
          if (!isEditing && navParams?.clienteId) {
            const matching = locacoesData.find(
              (l: Locacao) => l.clienteId === navParams.clienteId
            )
            if (matching) {
              handleSelectLocacao(matching)
            }
          }

          // Auto-select locação if locacaoId is provided via navigation params
          if (!isEditing && navParams?.locacaoId) {
            const matching = locacoesData.find(
              (l: Locacao) => l.id === navParams.locacaoId
            )
            if (matching) {
              handleSelectLocacao(matching)
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar locações:', error)
      }
    }
    fetchLocacoes()
  }, [isEditing, navParams?.clienteId, navParams?.locacaoId])

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (locacaoDropdownRef.current && !locacaoDropdownRef.current.contains(e.target as Node)) {
        setShowLocacaoDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load cobranca data if editing
  useEffect(() => {
    if (isEditing && selectedId) {
      async function fetchCobranca() {
        try {
          const res = await fetch(`/api/cobrancas/${selectedId}`)
          if (res.ok) {
            const data = await res.json()
            setFormData({
              locacaoId: data.locacaoId || '',
              clienteId: data.clienteId || '',
              clienteNome: data.clienteNome || data.cliente?.nomeExibicao || '',
              produtoId: data.produtoId || '',
              produtoIdentificador: data.produtoIdentificador || data.produto?.identificador || '',
              formaPagamento: data.formaPagamento || 'Periodo',
              precoFicha: data.valorFicha || 0,
              percentualEmpresa: data.percentualEmpresa || 0,
              valorFixo: data.locacao?.formaPagamento === 'Periodo' ? (data.totalClientePaga || 0) : null,
              dataInicio: data.dataInicio || '',
              dataFim: data.dataFim || '',
              relogioAnterior: data.relogioAnterior || 0,
              relogioAtual: data.relogioAtual || 0,
              descontoPartidasQtd: data.descontoPartidasQtd || 0,
              descontoPartidasValor: data.descontoPartidasValor || 0,
              descontoDinheiro: data.descontoDinheiro || 0,
              valorRecebido: data.valorRecebido || 0,
              status: data.status || 'Pendente',
              observacao: data.observacao || '',
            })
            if (data.locacaoId) {
              setLocacaoSearch(
                `${data.clienteNome || data.cliente?.nomeExibicao || ''} — ${data.produtoIdentificador || data.produto?.identificador || ''}`
              )
            }
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
  }, [isEditing, selectedId, navigate])

  // Handle field changes
  const handleChange = (field: keyof CobrancaFormData, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Select locação
  const handleSelectLocacao = (locacao: Locacao) => {
    const today = new Date().toISOString().split('T')[0]
    setFormData((prev) => ({
      ...prev,
      locacaoId: locacao.id,
      clienteId: locacao.clienteId,
      clienteNome: locacao.clienteNome || locacao.cliente?.nomeExibicao || '',
      produtoId: locacao.produtoId,
      produtoIdentificador: locacao.produtoIdentificador || locacao.produto?.identificador || '',
      formaPagamento: locacao.formaPagamento,
      precoFicha: locacao.precoFicha || 0,
      percentualEmpresa: locacao.percentualEmpresa || 0,
      valorFixo: locacao.valorFixo || null,
      relogioAnterior: locacao.ultimaLeituraRelogio || parseFloat(locacao.numeroRelogio) || 0,
      relogioAtual: 0,
      dataFim: today,
      dataInicio: '',
    }))
    setLocacaoSearch(
      `${locacao.clienteNome || locacao.cliente?.nomeExibicao || ''} — ${locacao.produtoIdentificador || locacao.produto?.identificador || ''}`
    )
    setShowLocacaoDropdown(false)

    // Fetch last cobrança for this locação to get dataInicio
    fetch(`/api/cobrancas?locacaoId=${locacao.id}&limit=1&status=Pago,Pendente,Parcial`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const cobrancas = data?.data || []
        if (cobrancas.length > 0) {
          const lastDataFim = cobrancas[0].dataFim
          if (lastDataFim) {
            handleChange('dataInicio', lastDataFim)
          }
        } else {
          // No previous cobrança, use locação's dataLocacao or dataPrimeiraCobranca
          const dataInicio = locacao.dataLocacao || locacao.dataPrimeiraCobranca || today
          handleChange('dataInicio', dataInicio.split ? dataInicio.split('T')[0] : dataInicio)
        }
      })
      .catch(() => {
        // Fallback: use locação date
        const dataInicio = locacao.dataLocacao || today
        handleChange('dataInicio', dataInicio.split ? dataInicio.split('T')[0] : dataInicio)
      })

    // Fetch open cobranças for this client
    fetch(`/api/cobrancas?clienteId=${locacao.clienteId}&status=Pendente,Atrasado,Parcial&limit=50`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const items = (data?.data || [])
          .filter((c: {id: string}) => c.id !== selectedId) // Exclude current cobrança if editing
          .map((c: {id: string; dataVencimento?: string; totalClientePaga?: number; valorRecebido?: number; produtoIdentificador?: string}) => ({
            id: c.id,
            dataVencimento: c.dataVencimento || '',
            totalClientePaga: c.totalClientePaga || 0,
            valorRecebido: c.valorRecebido || 0,
            saldoDevedor: (c.totalClientePaga || 0) - (c.valorRecebido || 0),
            produtoIdentificador: c.produtoIdentificador || '',
          }))
          .sort((a: {dataVencimento: string}, b: {dataVencimento: string}) => a.dataVencimento.localeCompare(b.dataVencimento)) // FIFO: oldest first
        setOpenCobrancas(items)
      })
      .catch(() => setOpenCobrancas([]))
  }

  // Live calculation preview
  const calcResult: CobrancaCalcResult = useMemo(() => {
    if (!formData.locacaoId) {
      return {
        fichasRodadas: 0,
        totalBruto: 0,
        subtotalAposDescontos: 0,
        valorPercentual: 0,
        totalClientePaga: 0,
        descontoPartidasValorTotal: 0,
        descontoDinheiroTotal: 0,
      }
    }

    return calcularCobranca({
      formaPagamento: formData.formaPagamento as 'Periodo' | 'PercentualPagar' | 'PercentualReceber',
      relogioAnterior: formData.relogioAnterior,
      relogioAtual: formData.relogioAtual,
      precoFicha: formData.precoFicha,
      percentualEmpresa: formData.percentualEmpresa,
      valorFixo: formData.valorFixo ?? undefined,
      descontoPartidasQtd: formData.descontoPartidasQtd || undefined,
      descontoPartidasValor: formData.descontoPartidasValor || undefined,
      descontoDinheiro: formData.descontoDinheiro || undefined,
    })
  }, [
    formData.locacaoId,
    formData.formaPagamento,
    formData.relogioAnterior,
    formData.relogioAtual,
    formData.precoFicha,
    formData.percentualEmpresa,
    formData.valorFixo,
    formData.descontoPartidasQtd,
    formData.descontoPartidasValor,
    formData.descontoDinheiro,
  ])

  // Auto-determine status based on valorRecebido and totalClientePaga
  // dataVencimento is auto-set to dataFim on create
  const autoStatus = useMemo(() => {
    const dataVencimento = formData.dataFim
    const isVencido = dataVencimento ? new Date(dataVencimento) < new Date() : false
    return determinarStatusPagamento(calcResult.totalClientePaga, formData.valorRecebido, isVencido)
  }, [calcResult.totalClientePaga, formData.valorRecebido, formData.dataFim])

  // Auto-sync status with autoStatus for new cobranças
  useEffect(() => {
    if (!isEditing && formData.locacaoId) {
      setFormData(prev => ({ ...prev, status: autoStatus }))
    }
  }, [autoStatus, isEditing, formData.locacaoId])

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.locacaoId) {
      toast.error('Locação é obrigatória')
      return
    }
    if (!formData.dataInicio) {
      toast.error('Data início é obrigatória')
      return
    }
    if (!formData.dataFim) {
      toast.error('Data fim é obrigatória')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        locacaoId: formData.locacaoId,
        dataInicio: formData.dataInicio,
        dataFim: formData.dataFim,
        relogioAnterior: formData.relogioAnterior,
        relogioAtual: formData.relogioAtual,
        descontoPartidasQtd: formData.descontoPartidasQtd || undefined,
        descontoPartidasValor: formData.descontoPartidasValor || undefined,
        descontoDinheiro: formData.descontoDinheiro || undefined,
        valorRecebido: formData.valorRecebido,
        status: formData.status || autoStatus,
        observacao: formData.observacao || undefined,
      }

      let res: Response
      if (isEditing && selectedId) {
        res = await fetch(`/api/cobrancas/${selectedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/cobrancas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (res.ok) {
        // FIFO payment for selected open cobranças
        if (selectedOpenIds.size > 0 && formData.valorRecebido > calcResult.totalClientePaga) {
          let remaining = formData.valorRecebido - calcResult.totalClientePaga
          // Sort by dataVencimento ascending (FIFO)
          const sortedOpen = openCobrancas
            .filter(c => selectedOpenIds.has(c.id))
            .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))

          for (const cobranca of sortedOpen) {
            if (remaining <= 0) break
            const payAmount = Math.min(cobranca.saldoDevedor, remaining)
            const newValorRecebido = cobranca.valorRecebido + payAmount
            const newStatus = newValorRecebido >= cobranca.totalClientePaga ? 'Pago' : 'Parcial'

            await fetch(`/api/cobrancas/${cobranca.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ _partial: true, valorRecebido: newValorRecebido, status: newStatus }),
            })
            remaining -= payAmount
          }
          toast.success(`${selectedOpenIds.size} cobrança(s) em aberto também foram atualizadas`)
        }

        toast.success(isEditing ? 'Cobrança atualizada com sucesso' : 'Cobrança criada com sucesso')
        navigate('cobrancas')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao salvar cobrança')
      }
    } catch {
      toast.error('Erro ao salvar cobrança')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <FormSkeleton />
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
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <Breadcrumb />
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Editar Cobrança' : 'Nova Cobrança'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEditing ? 'Atualize os dados da cobrança' : 'Preencha os dados para criar uma nova cobrança'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Locação Selection */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Locação</CardTitle>
              <CardDescription>Selecione a locação para gerar a cobrança</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2" ref={locacaoDropdownRef}>
                <Label>Locação Ativa *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por cliente ou produto..."
                    value={locacaoSearch}
                    onChange={(e) => {
                      setLocacaoSearch(e.target.value)
                      if (formData.locacaoId) {
                        handleChange('locacaoId', '')
                        handleChange('clienteId', '')
                        handleChange('clienteNome', '')
                        handleChange('produtoId', '')
                        handleChange('produtoIdentificador', '')
                      }
                    }}
                    onFocus={() => locacoes.length > 0 && setShowLocacaoDropdown(true)}
                    disabled={isEditing}
                  />
                  {formData.locacaoId && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="text-xs text-green-600 font-medium">✓ Selecionada</span>
                    </div>
                  )}
                  {showLocacaoDropdown && locacoes.length > 0 && !isEditing && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {locacoes
                        .filter((l) =>
                          !locacaoSearch ||
                          l.clienteNome?.toLowerCase().includes(locacaoSearch.toLowerCase()) ||
                          l.produtoIdentificador?.toLowerCase().includes(locacaoSearch.toLowerCase()) ||
                          l.cliente?.nomeExibicao?.toLowerCase().includes(locacaoSearch.toLowerCase())
                        )
                        .map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between"
                            onClick={() => handleSelectLocacao(l)}
                          >
                            <div>
                              <span className="font-medium">{l.clienteNome || l.cliente?.nomeExibicao}</span>
                              <span className="text-muted-foreground ml-2 text-xs">
                                — {l.produtoIdentificador || l.produto?.identificador}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatFormaPagamento(l.formaPagamento)}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Locação info summary */}
              {formData.locacaoId && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Cliente</p>
                    <p className="font-medium truncate">{formData.clienteNome}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Produto</p>
                    <p className="font-medium">{formData.produtoIdentificador}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Forma Pagamento</p>
                    <p className="font-medium">{formatFormaPagamento(formData.formaPagamento)}</p>
                  </div>
                  {formData.formaPagamento === 'Periodo' && formData.valorFixo ? (
                    <div>
                      <p className="text-muted-foreground text-xs">Valor Fixo</p>
                      <p className="font-medium">{formatarMoeda(formData.valorFixo)}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-muted-foreground text-xs">Preço Ficha</p>
                      <p className="font-medium">{formatarMoeda(formData.precoFicha)}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Período e Relógio */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Período e Relógio</CardTitle>
              <CardDescription>Defina o período de cobrança e a leitura do relógio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataInicio">Data Início *</Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={formData.dataInicio}
                    onChange={(e) => handleChange('dataInicio', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataFim">Data Fim *</Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={formData.dataFim}
                    onChange={(e) => handleChange('dataFim', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="relogioAnterior">Relógio Anterior</Label>
                  <Input
                    id="relogioAnterior"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.relogioAnterior}
                    onChange={(e) => handleChange('relogioAnterior', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">Última leitura da locação</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relogioAtual">Relógio Atual *</Label>
                  <Input
                    id="relogioAtual"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.relogioAtual || ''}
                    onChange={(e) => handleChange('relogioAtual', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Fichas rodadas: <span className="font-medium">{calcResult.fichasRodadas}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Descontos */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Descontos</CardTitle>
              <CardDescription>Descontos opcionais sobre a cobrança</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="descontoPartidasQtd">Desconto Partidas (Qtd)</Label>
                  <Input
                    id="descontoPartidasQtd"
                    type="number"
                    step="1"
                    min="0"
                    value={formData.descontoPartidasQtd || ''}
                    onChange={(e) => handleChange('descontoPartidasQtd', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descontoPartidasValor">Desconto Partidas (R$)</Label>
                  <Input
                    id="descontoPartidasValor"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.descontoPartidasValor || ''}
                    onChange={(e) => handleChange('descontoPartidasValor', parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descontoDinheiro">Desconto Dinheiro (R$)</Label>
                  <Input
                    id="descontoDinheiro"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.descontoDinheiro || ''}
                    onChange={(e) => handleChange('descontoDinheiro', parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Calculation Preview */}
          {formData.locacaoId && (
            <Card className="shadow-sm border-2 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  Cálculo Automático
                </CardTitle>
                <CardDescription>Cálculo automático baseado nos dados informados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Payment form explanation */}
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="text-xs text-muted-foreground space-y-1">
                      {formData.formaPagamento === 'Periodo' && (
                        <>
                          <p className="font-medium text-foreground">Forma de Pagamento: Período (Valor Fixo)</p>
                          <p>O cliente paga um valor fixo por período, independentemente do uso do produto. O valor é definido na locação e não depende de leitura de relógio.</p>
                        </>
                      )}
                      {formData.formaPagamento === 'PercentualPagar' && (
                        <>
                          <p className="font-medium text-foreground">Forma de Pagamento: % Pagar</p>
                          <p>O cliente paga um percentual do faturamento para a empresa. O cálculo é: Fichas Rodadas × Valor Ficha = Total Bruto. Após descontos, aplica-se o percentual da empresa para obter o valor que o cliente paga.</p>
                        </>
                      )}
                      {formData.formaPagamento === 'PercentualReceber' && (
                        <>
                          <p className="font-medium text-foreground">Forma de Pagamento: % Receber</p>
                          <p>O cliente recebe um percentual do faturamento e paga o restante. O cálculo é: Fichas Rodadas × Valor Ficha = Total Bruto. Após descontos, a empresa recebe o percentual e o cliente paga o valor restante.</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Calculation breakdown */}
                {formData.formaPagamento === 'Periodo' ? (
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <p className="text-sm text-green-600 dark:text-green-400 mb-1">Valor Fixo (Período)</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {formatarMoeda(formData.valorFixo ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Valor definido na locação — não depende de leitura de relógio
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Step 1: Fichas Rodadas */}
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-1.5 text-primary shrink-0">
                        <span className="text-xs font-bold">1</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Fichas Rodadas = Relógio Atual − Relógio Anterior</p>
                        <p className="text-sm font-medium">
                          {formData.relogioAtual} − {formData.relogioAnterior} = <span className="font-bold text-primary">{calcResult.fichasRodadas}</span>
                        </p>
                      </div>
                    </div>

                    {/* Step 2: Total Bruto */}
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-1.5 text-primary shrink-0">
                        <span className="text-xs font-bold">2</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Total Bruto = Fichas Rodadas × Valor Ficha</p>
                        <p className="text-sm font-medium">
                          {calcResult.fichasRodadas} × {formatarMoeda(formData.precoFicha)} = <span className="font-bold text-primary">{formatarMoeda(calcResult.totalBruto)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Step 3: Descontos */}
                    {((calcResult.descontoPartidasValorTotal + calcResult.descontoDinheiroTotal) > 0) && (
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-red-100 dark:bg-red-900 p-1.5 text-red-600 dark:text-red-400 shrink-0">
                          <span className="text-xs font-bold">3</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Descontos</p>
                          <p className="text-sm font-medium text-red-600 dark:text-red-400">
                            -{formatarMoeda(calcResult.descontoPartidasValorTotal + calcResult.descontoDinheiroTotal)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Subtotal: {formatarMoeda(calcResult.subtotalAposDescontos)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Percentual split */}
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-1.5 text-primary shrink-0">
                        <span className="text-xs font-bold">{(calcResult.descontoPartidasValorTotal + calcResult.descontoDinheiroTotal) > 0 ? '4' : '3'}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">
                          Percentual Empresa ({formData.percentualEmpresa}%)
                        </p>
                        <p className="text-sm font-medium">
                          {formatarMoeda(calcResult.subtotalAposDescontos)} × {formData.percentualEmpresa}% = <span className="font-bold text-primary">{formatarMoeda(calcResult.valorPercentual)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Final result */}
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <p className="text-sm text-green-600 dark:text-green-400 mb-1">
                        {formData.formaPagamento === 'PercentualPagar'
                          ? 'Total Cliente Paga (percentual da empresa)'
                          : 'Total Cliente Paga (subtotal − percentual da empresa)'
                        }
                      </p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {formatarMoeda(calcResult.totalClientePaga)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.formaPagamento === 'PercentualPagar'
                          ? `${formatarMoeda(calcResult.valorPercentual)} (empresa recebe ${formData.percentualEmpresa}%)`
                          : `${formatarMoeda(calcResult.subtotalAposDescontos)} − ${formatarMoeda(calcResult.valorPercentual)} = ${formatarMoeda(calcResult.totalClientePaga)}`
                        }
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cobranças em Aberto (FIFO) - MOVED UP near calculations */}
          {openCobrancas.length > 0 && !isEditing && (
            <Card className="shadow-sm border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Cobranças em Aberto
                </CardTitle>
                <CardDescription>
                  Selecione cobranças em aberto para incluir no pagamento. O pagamento segue a ordem das mais antigas primeiro (FIFO).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {openCobrancas.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70">
                    <Checkbox
                      checked={selectedOpenIds.has(c.id)}
                      onCheckedChange={(checked) => {
                        setSelectedOpenIds(prev => {
                          const next = new Set(prev)
                          if (checked) next.add(c.id)
                          else next.delete(c.id)
                          return next
                        })
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{c.produtoIdentificador}</span>
                        <span className="text-xs text-muted-foreground">Venc: {c.dataVencimento ? format(parseISO(c.dataVencimento), 'dd/MM/yyyy') : '—'}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Saldo: <span className="font-medium text-amber-600">{formatarMoeda(c.saldoDevedor)}</span>
                      </div>
                    </div>
                  </label>
                ))}

                {/* Total summary when items are selected */}
                {selectedOpenIds.size > 0 && (() => {
                  const selectedTotal = openCobrancas.filter(c => selectedOpenIds.has(c.id)).reduce((acc, c) => acc + c.saldoDevedor, 0)
                  const totalAReceber = calcResult.totalClientePaga + selectedTotal
                  return (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Valor desta cobrança:</span>
                        <span className="font-medium">{formatarMoeda(calcResult.totalClientePaga)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total em aberto selecionado:</span>
                        <span className="font-medium text-amber-600">{formatarMoeda(selectedTotal)}</span>
                      </div>
                      <div className="h-px bg-amber-200 dark:bg-amber-700 my-1" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">Total a receber:</span>
                        <span className="text-lg font-bold text-green-700 dark:text-green-300">{formatarMoeda(totalAReceber)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ao registrar o pagamento, as cobranças mais antigas serão pagas primeiro (FIFO).
                      </p>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}

          {/* Pagamento */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Pagamento</CardTitle>
              <CardDescription>Informe o valor recebido e o status do pagamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valorRecebido">Valor Recebido (R$)</Label>
                  <Input
                    id="valorRecebido"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valorRecebido || ''}
                    onChange={(e) => handleChange('valorRecebido', parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => handleChange('status', v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Pago">Pago</SelectItem>
                      <SelectItem value="Parcial">Parcial</SelectItem>
                      <SelectItem value="Atrasado">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Status sugerido: <span className="font-medium">{autoStatus}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observação */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Observação</CardTitle>
              <CardDescription>Informações adicionais sobre a cobrança</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.observacao}
                onChange={(e) => handleChange('observacao', e.target.value)}
                placeholder="Observações adicionais (opcional)"
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button type="button" variant="outline" onClick={goBack} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEditing ? 'Atualizar' : 'Criar Cobrança'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Card className="shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
