'use client'

import { useState, useEffect, useRef } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2, Save, Search } from 'lucide-react'
import { toast } from 'sonner'
import { formatarMoeda } from '@/lib/cobranca-calculos'

interface Cliente {
  id: string
  identificador: string
  nomeExibicao: string
  telefonePrincipal: string
  status: string
}

interface Produto {
  id: string
  identificador: string
  tipoNome: string
  descricaoNome: string
  statusProduto: string
  numeroRelogio: string
}

interface LocacaoFormData {
  clienteId: string
  clienteNome: string
  produtoId: string
  produtoIdentificador: string
  produtoTipo: string
  dataLocacao: string
  formaPagamento: string
  numeroRelogio: string
  precoFicha: number
  percentualEmpresa: number
  percentualCliente: number
  valorFixo: number
  periodicidade: string
  dataPrimeiraCobranca: string
  observacoes: string
  trocaPano: boolean
}

const initialFormData: LocacaoFormData = {
  clienteId: '',
  clienteNome: '',
  produtoId: '',
  produtoIdentificador: '',
  produtoTipo: '',
  dataLocacao: new Date().toISOString().split('T')[0],
  formaPagamento: 'Periodo',
  numeroRelogio: '0',
  precoFicha: 0,
  percentualEmpresa: 0,
  percentualCliente: 0,
  valorFixo: 0,
  periodicidade: 'Mensal',
  dataPrimeiraCobranca: '',
  observacoes: '',
  trocaPano: false,
}

export function LocacaoFormView() {
  const { selectedId, currentView, navigate, goBack, params } = useNavigation()
  const isEditing = currentView === 'locacao-editar' && !!selectedId
  const isRelocar = params?.relocar === 'true'

  const [formData, setFormData] = useState<LocacaoFormData>(initialFormData)
  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)

  // Cliente search
  const [clienteSearch, setClienteSearch] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const clienteDropdownRef = useRef<HTMLDivElement>(null)

  // Produto search
  const [produtoSearch, setProdutoSearch] = useState('')
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [showProdutoDropdown, setShowProdutoDropdown] = useState(false)
  const produtoDropdownRef = useRef<HTMLDivElement>(null)

  // Search clientes
  useEffect(() => {
    if (!clienteSearch || formData.clienteId) {
      if (clienteSearch === '') setClientes([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clientes?search=${encodeURIComponent(clienteSearch)}&limit=10`)
        if (res.ok) {
          const data = await res.json()
          setClientes(data.data || [])
          setShowClienteDropdown(true)
        }
      } catch (error) {
        console.error('Erro ao buscar clientes:', error)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [clienteSearch, formData.clienteId])

  // Search produtos
  useEffect(() => {
    if (!produtoSearch || formData.produtoId) {
      if (produtoSearch === '') setProdutos([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/produtos?busca=${encodeURIComponent(produtoSearch)}&disponiveis=true&limit=10`)
        if (res.ok) {
          const data = await res.json()
          setProdutos(data.data || [])
          setShowProdutoDropdown(true)
        }
      } catch (error) {
        console.error('Erro ao buscar produtos:', error)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [produtoSearch, formData.produtoId])

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (clienteDropdownRef.current && !clienteDropdownRef.current.contains(e.target as Node)) {
        setShowClienteDropdown(false)
      }
      if (produtoDropdownRef.current && !produtoDropdownRef.current.contains(e.target as Node)) {
        setShowProdutoDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load locacao data if editing
  useEffect(() => {
    if (isEditing && selectedId) {
      async function fetchLocacao() {
        try {
          const res = await fetch(`/api/locacoes/${selectedId}`)
          if (res.ok) {
            const data = await res.json()
            setFormData({
              clienteId: data.clienteId || '',
              clienteNome: data.clienteNome || data.cliente?.nomeExibicao || '',
              produtoId: data.produtoId || '',
              produtoIdentificador: data.produtoIdentificador || data.produto?.identificador || '',
              produtoTipo: data.produtoTipo || data.produto?.tipoNome || '',
              dataLocacao: data.dataLocacao || '',
              formaPagamento: data.formaPagamento || 'Periodo',
              numeroRelogio: data.numeroRelogio || '0',
              precoFicha: data.precoFicha || 0,
              percentualEmpresa: data.percentualEmpresa || 0,
              percentualCliente: data.percentualCliente || 0,
              valorFixo: data.valorFixo || 0,
              periodicidade: data.periodicidade || 'Mensal',
              dataPrimeiraCobranca: data.dataPrimeiraCobranca || '',
              observacoes: data.observacoes || '',
              trocaPano: data.trocaPano || false,
            })
            if (data.clienteId) setClienteSearch(data.clienteNome || data.cliente?.nomeExibicao || '')
            if (data.produtoId) setProdutoSearch(data.produtoIdentificador || data.produto?.identificador || '')
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
    }
  }, [isEditing, selectedId, navigate])

  // Handle field changes
  const handleChange = (field: keyof LocacaoFormData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Select cliente
  const handleSelectCliente = (cliente: Cliente) => {
    setFormData((prev) => ({
      ...prev,
      clienteId: cliente.id,
      clienteNome: cliente.nomeExibicao,
    }))
    setClienteSearch(cliente.nomeExibicao)
    setShowClienteDropdown(false)
  }

  // Select produto
  const handleSelectProduto = (produto: Produto) => {
    setFormData((prev) => ({
      ...prev,
      produtoId: produto.id,
      produtoIdentificador: produto.identificador,
      produtoTipo: produto.tipoNome,
      numeroRelogio: produto.numeroRelogio || '0',
    }))
    setProdutoSearch(produto.identificador)
    setShowProdutoDropdown(false)
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.clienteId) {
      toast.error('Cliente é obrigatório')
      return
    }
    if (!formData.produtoId) {
      toast.error('Produto é obrigatório')
      return
    }
    if (!formData.dataLocacao) {
      toast.error('Data de locação é obrigatória')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        clienteId: formData.clienteId,
        produtoId: formData.produtoId,
        dataLocacao: formData.dataLocacao,
        formaPagamento: formData.formaPagamento,
        numeroRelogio: formData.numeroRelogio || '0',
        precoFicha: formData.precoFicha || 0,
        percentualEmpresa: formData.percentualEmpresa || 0,
        percentualCliente: formData.percentualCliente || 0,
        valorFixo: formData.formaPagamento === 'Periodo' ? (formData.valorFixo || 0) : undefined,
        periodicidade: formData.formaPagamento === 'Periodo' ? (formData.periodicidade || undefined) : undefined,
        dataPrimeiraCobranca: formData.dataPrimeiraCobranca || undefined,
        observacoes: formData.observacoes || undefined,
        trocaPano: formData.trocaPano,
      }

      let res: Response
      if (isEditing && selectedId) {
        res = await fetch(`/api/locacoes/${selectedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/locacoes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (res.ok) {
        toast.success(isEditing ? 'Locação atualizada com sucesso' : 'Locação criada com sucesso')
        navigate('locacoes')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao salvar locação')
      }
    } catch {
      toast.error('Erro ao salvar locação')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <FormSkeleton />
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isRelocar ? 'Relocar' : isEditing ? 'Editar Locação' : 'Nova Locação'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isRelocar ? 'Relocar produto para um novo cliente' : isEditing ? 'Atualize os dados da locação' : 'Preencha os dados para criar uma nova locação'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Seleção de Cliente e Produto */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Cliente e Produto</CardTitle>
              <CardDescription>Selecione o cliente e o produto para a locação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cliente Search */}
              <div className="space-y-2" ref={clienteDropdownRef}>
                <Label>Cliente *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar cliente por nome..."
                    value={clienteSearch}
                    onChange={(e) => {
                      setClienteSearch(e.target.value)
                      if (formData.clienteId) {
                        handleChange('clienteId', '')
                        handleChange('clienteNome', '')
                      }
                    }}
                    onFocus={() => clientes.length > 0 && setShowClienteDropdown(true)}
                  />
                  {formData.clienteId && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="text-xs text-green-600 font-medium">✓ {formData.clienteNome}</span>
                    </div>
                  )}
                  {showClienteDropdown && clientes.length > 0 && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {clientes.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between"
                          onClick={() => handleSelectCliente(c)}
                        >
                          <div>
                            <span className="font-medium">{c.nomeExibicao}</span>
                            <span className="text-muted-foreground ml-2 text-xs">{c.identificador}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{c.telefonePrincipal}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Produto Search */}
              <div className="space-y-2" ref={produtoDropdownRef}>
                <Label>Produto *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar produto disponível..."
                    value={produtoSearch}
                    onChange={(e) => {
                      setProdutoSearch(e.target.value)
                      if (formData.produtoId) {
                        handleChange('produtoId', '')
                        handleChange('produtoIdentificador', '')
                        handleChange('produtoTipo', '')
                      }
                    }}
                    onFocus={() => produtos.length > 0 && setShowProdutoDropdown(true)}
                  />
                  {formData.produtoId && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="text-xs text-green-600 font-medium">
                        ✓ {formData.produtoIdentificador} — {formData.produtoTipo}
                      </span>
                    </div>
                  )}
                  {showProdutoDropdown && produtos.length > 0 && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {produtos.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between"
                          onClick={() => handleSelectProduto(p)}
                        >
                          <div>
                            <span className="font-medium">{p.identificador}</span>
                            <span className="text-muted-foreground ml-2 text-xs">{p.tipoNome}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{p.descricaoNome}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dados da Locação */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Dados da Locação</CardTitle>
              <CardDescription>Informações de data e forma de pagamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataLocacao">Data Locação *</Label>
                  <Input
                    id="dataLocacao"
                    type="date"
                    value={formData.dataLocacao}
                    onChange={(e) => handleChange('dataLocacao', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numeroRelogio">Nº Relógio</Label>
                  <Input
                    id="numeroRelogio"
                    value={formData.numeroRelogio}
                    onChange={(e) => handleChange('numeroRelogio', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-3">
                <Label>Forma de Pagamento</Label>
                <RadioGroup
                  value={formData.formaPagamento}
                  onValueChange={(v) => handleChange('formaPagamento', v)}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Periodo" id="periodo" />
                    <Label htmlFor="periodo" className="cursor-pointer">Período (Valor Fixo)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PercentualPagar" id="percentualPagar" />
                    <Label htmlFor="percentualPagar" className="cursor-pointer">% Pagar</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PercentualReceber" id="percentualReceber" />
                    <Label htmlFor="percentualReceber" className="cursor-pointer">% Receber</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Conditional fields based on formaPagamento */}
              {formData.formaPagamento === 'Periodo' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valorFixo">Valor Fixo (R$)</Label>
                    <Input
                      id="valorFixo"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valorFixo || ''}
                      onChange={(e) => handleChange('valorFixo', parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="periodicidade">Periodicidade</Label>
                    <Select value={formData.periodicidade} onValueChange={(v) => handleChange('periodicidade', v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Semanal">Semanal</SelectItem>
                        <SelectItem value="Quinzenal">Quinzenal</SelectItem>
                        <SelectItem value="Mensal">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="precoFicha">Preço da Ficha (R$)</Label>
                    <Input
                      id="precoFicha"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.precoFicha || ''}
                      onChange={(e) => handleChange('precoFicha', parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="percentualEmpresa">% Empresa</Label>
                    <Input
                      id="percentualEmpresa"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.percentualEmpresa || ''}
                      onChange={(e) => handleChange('percentualEmpresa', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="percentualCliente">% Cliente</Label>
                    <Input
                      id="percentualCliente"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.percentualCliente || ''}
                      onChange={(e) => handleChange('percentualCliente', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataPrimeiraCobranca">Data Primeira Cobrança</Label>
                  <Input
                    id="dataPrimeiraCobranca"
                    type="date"
                    value={formData.dataPrimeiraCobranca}
                    onChange={(e) => handleChange('dataPrimeiraCobranca', e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3 pt-8">
                  <Checkbox
                    id="trocaPano"
                    checked={formData.trocaPano}
                    onCheckedChange={(checked) => handleChange('trocaPano', checked === true)}
                  />
                  <Label htmlFor="trocaPano" className="cursor-pointer">Troca de Pano</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Observações</CardTitle>
              <CardDescription>Informações adicionais sobre a locação</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => handleChange('observacoes', e.target.value)}
                  placeholder="Observações adicionais (opcional)"
                  rows={4}
                />
              </div>
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
                {isRelocar ? 'Relocar' : isEditing ? 'Atualizar' : 'Criar Locação'}
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
