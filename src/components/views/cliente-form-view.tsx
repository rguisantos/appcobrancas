'use client'

import { useState, useEffect } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Loader2, Save, Search, Navigation, X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/layout/breadcrumb'

interface Rota {
  id: string
  descricao: string
  cor: string
}

interface ClienteFormData {
  tipoPessoa: string
  identificador: string
  nomeExibicao: string
  nomeCompleto: string
  razaoSocial: string
  cpf: string
  cnpj: string
  rg: string
  inscricaoEstadual: string
  telefonePrincipal: string
  email: string
  contatos: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  rotaId: string
  status: string
}

const initialFormData: ClienteFormData = {
  tipoPessoa: 'Fisica',
  identificador: '',
  nomeExibicao: '',
  nomeCompleto: '',
  razaoSocial: '',
  cpf: '',
  cnpj: '',
  rg: '',
  inscricaoEstadual: '',
  telefonePrincipal: '',
  email: '',
  contatos: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  rotaId: '',
  status: 'Ativo',
}

export function ClienteFormView() {
  const { selectedId, currentView, navigate, goBack } = useNavigation()
  const isEditing = currentView === 'cliente-editar' && !!selectedId

  const [formData, setFormData] = useState<ClienteFormData>(initialFormData)
  const [rotas, setRotas] = useState<Rota[]>([])
  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [gpsLoading, setGpsLoading] = useState(false)
  const [estados, setEstados] = useState<{id: number; sigla: string; nome: string}[]>([])
  const [cidades, setCidades] = useState<{id: number; nome: string}[]>([])
  const [cidadesLoading, setCidadesLoading] = useState(false)
  const [contatosList, setContatosList] = useState<Array<{nome: string; telefone: string; funcao?: string}>>([])

  // Fetch rotas
  useEffect(() => {
    async function fetchRotas() {
      try {
        const res = await fetch('/api/rotas')
        if (res.ok) {
          const data = await res.json()
          setRotas(data)
        }
      } catch (error) {
        console.error('Erro ao buscar rotas:', error)
      }
    }
    fetchRotas()
  }, [])

  // Fetch Brazilian states from IBGE API
  useEffect(() => {
    async function fetchEstados() {
      try {
        const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados')
        if (res.ok) {
          const data = await res.json()
          setEstados(data.sort((a: {sigla: string}, b: {sigla: string}) => a.sigla.localeCompare(b.sigla)))
        }
      } catch { /* ignore */ }
    }
    fetchEstados()
  }, [])

  // Fetch cities when estado changes
  useEffect(() => {
    if (!formData.estado) {
      setCidades([])
      return
    }
    async function fetchCidades() {
      setCidadesLoading(true)
      try {
        const estadoObj = estados.find(e => e.sigla === formData.estado)
        if (!estadoObj) return
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoObj.id}/municipios`)
        if (res.ok) {
          const data = await res.json()
          setCidades(data.sort((a: {nome: string}, b: {nome: string}) => a.nome.localeCompare(b.nome)))
        }
      } catch { /* ignore */ }
      finally { setCidadesLoading(false) }
    }
    fetchCidades()
  }, [formData.estado, estados])

  // Parse existing contatos JSON on load
  useEffect(() => {
    if (formData.contatos) {
      try {
        const parsed = JSON.parse(formData.contatos)
        if (Array.isArray(parsed)) {
          setContatosList(parsed)
        }
      } catch { /* not valid JSON, ignore */ }
    }
  }, [])

  // Load cliente data if editing
  useEffect(() => {
    if (isEditing && selectedId) {
      async function fetchCliente() {
        try {
          const res = await fetch(`/api/clientes/${selectedId}`)
          if (res.ok) {
            const data = await res.json()
            setFormData({
              tipoPessoa: data.tipoPessoa || 'Fisica',
              identificador: data.identificador || '',
              nomeExibicao: data.nomeExibicao || '',
              nomeCompleto: data.nomeCompleto || '',
              razaoSocial: data.razaoSocial || '',
              cpf: data.cpf || '',
              cnpj: data.cnpj || '',
              rg: data.rg || '',
              inscricaoEstadual: data.inscricaoEstadual || '',
              telefonePrincipal: data.telefonePrincipal || '',
              email: data.email || '',
              contatos: data.contatos || '',
              cep: data.cep || '',
              logradouro: data.logradouro || '',
              numero: data.numero || '',
              complemento: data.complemento || '',
              bairro: data.bairro || '',
              cidade: data.cidade || '',
              estado: data.estado || '',
              rotaId: data.rotaId || '',
              status: data.status || 'Ativo',
            })
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
    }
  }, [isEditing, selectedId, navigate])

  // Helper for input className with validation state
  const inputClassName = (field: string) =>
    `h-11 ${validationErrors[field] ? 'border-destructive focus-visible:ring-destructive' : ''}`

  // Handle field changes
  const handleChange = (field: keyof ClienteFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (validationErrors[field]) {
      setValidationErrors((prev) => { const next = {...prev}; delete next[field]; return next })
    }
  }

  // Helper function to convert Brazilian state names to UF
  function getUfFromState(stateName: string): string {
    const map: Record<string, string> = {
      'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM', 'Bahia': 'BA',
      'Ceará': 'CE', 'Distrito Federal': 'DF', 'Espírito Santo': 'ES', 'Goiás': 'GO',
      'Maranhão': 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS', 'Minas Gerais': 'MG',
      'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR', 'Pernambuco': 'PE', 'Piauí': 'PI',
      'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN', 'Rio Grande do Sul': 'RS',
      'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC', 'São Paulo': 'SP',
      'Sergipe': 'SE', 'Tocantins': 'TO',
    }
    return map[stateName] || stateName
  }

  // GPS Geolocation lookup
  const handleGpsLookup = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não disponível neste navegador')
      return
    }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`)
          if (res.ok) {
            const data = await res.json()
            const addr = data.address || {}
            setFormData((prev) => ({
              ...prev,
              logradouro: (!prev.logradouro.trim() && (addr.road || '')) ? addr.road : prev.logradouro,
              bairro: (!prev.bairro.trim() && (addr.suburb || addr.neighbourhood || '')) ? (addr.suburb || addr.neighbourhood) : prev.bairro,
              cidade: (!prev.cidade.trim() && (addr.city || addr.town || '')) ? (addr.city || addr.town) : prev.cidade,
              estado: (!prev.estado.trim() && (addr.state ? getUfFromState(addr.state) : '')) ? getUfFromState(addr.state) : prev.estado,
              cep: (!prev.cep.trim() && (addr.postcode || '')) ? addr.postcode.replace(/\D/g, '') : prev.cep,
              numero: (!prev.numero.trim() && (addr.house_number || '')) ? addr.house_number : prev.numero,
              complemento: (!prev.complemento.trim() && (addr.complement || '')) ? addr.complement : prev.complemento,
            }))
            toast.success('Localização preenchida automaticamente')
          } else {
            toast.error('Erro ao buscar endereço pela localização')
          }
        } catch {
          toast.error('Erro ao buscar endereço pela localização')
        } finally {
          setGpsLoading(false)
        }
      },
      (error) => {
        setGpsLoading(false)
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Permissão de localização negada')
        } else {
          toast.error('Erro ao obter localização')
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Contatos helpers
  const addContato = () => {
    setContatosList(prev => [...prev, { nome: '', telefone: '', funcao: '' }])
  }

  const removeContato = (index: number) => {
    setContatosList(prev => prev.filter((_, i) => i !== index))
  }

  const updateContato = (index: number, field: string, value: string) => {
    setContatosList(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
    // Also update formData.contatos to keep in sync
    const updated = contatosList.map((c, i) => i === index ? { ...c, [field]: value } : c)
    setFormData(prev => ({ ...prev, contatos: JSON.stringify(updated.filter(c => c.nome || c.telefone)) }))
  }

  // ViaCEP lookup - only fills empty fields
  const handleCepLookup = async () => {
    const cep = formData.cep.replace(/\D/g, '')
    if (cep.length !== 8) {
      toast.error('CEP inválido. Digite 8 números.')
      return
    }

    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      if (res.ok) {
        const data = await res.json()
        if (data.erro) {
          toast.error('CEP não encontrado')
          return
        }
        // Only auto-fill fields that are currently empty (don't overwrite user input)
        setFormData((prev) => ({
          ...prev,
          logradouro: (!prev.logradouro.trim() && data.logradouro) ? data.logradouro : prev.logradouro,
          bairro: (!prev.bairro.trim() && data.bairro) ? data.bairro : prev.bairro,
          cidade: (!prev.cidade.trim() && data.localidade) ? data.localidade : prev.cidade,
          estado: (!prev.estado.trim() && data.uf) ? data.uf : prev.estado,
          complemento: (!prev.complemento.trim() && data.complemento) ? data.complemento : prev.complemento,
        }))
        toast.success('Endereço preenchido automaticamente')
      } else {
        toast.error('Erro ao buscar CEP')
      }
    } catch {
      toast.error('Erro ao conectar ao ViaCEP')
    } finally {
      setCepLoading(false)
    }
  }

  // Debounced CEP auto-lookup (300ms after typing stops)
  useEffect(() => {
    const cep = formData.cep.replace(/\D/g, '')
    if (cep.length !== 8) return

    const timer = setTimeout(() => {
      handleCepLookup()
    }, 300)
    return () => clearTimeout(timer)
  }, [formData.cep])

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const errors: Record<string, string> = {}
    if (!formData.nomeExibicao.trim()) errors.nomeExibicao = 'Nome é obrigatório'
    if (!formData.telefonePrincipal.trim()) errors.telefonePrincipal = 'Telefone é obrigatório'

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    setValidationErrors({})

    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        // Don't send identificador for new clients (auto-generated by API)
        identificador: isEditing ? formData.identificador : undefined,
        rotaId: formData.rotaId || undefined,
        email: formData.email || undefined,
      }

      let res: Response
      if (isEditing && selectedId) {
        res = await fetch(`/api/clientes/${selectedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/clientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (res.ok) {
        toast.success(isEditing ? 'Cliente atualizado com sucesso' : 'Cliente criado com sucesso')
        navigate('clientes')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao salvar cliente')
      }
    } catch {
      toast.error('Erro ao salvar cliente')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <FormSkeleton />
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
            {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEditing ? 'Atualize os dados do cliente' : 'Preencha os dados para criar um novo cliente'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="pessoal" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pessoal">Dados Pessoais</TabsTrigger>
            <TabsTrigger value="contato">Contato</TabsTrigger>
            <TabsTrigger value="endereco">Endereço</TabsTrigger>
            <TabsTrigger value="vinculacao">Vinculação</TabsTrigger>
          </TabsList>

          {/* Dados Pessoais */}
          <TabsContent value="pessoal">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Dados Pessoais</CardTitle>
                <CardDescription>Informações pessoais ou empresariais do cliente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tipo Pessoa */}
                <div className="space-y-2">
                  <Label>Tipo de Pessoa</Label>
                  <RadioGroup
                    value={formData.tipoPessoa}
                    onValueChange={(v) => handleChange('tipoPessoa', v)}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Fisica" id="fisica" />
                      <Label htmlFor="fisica" className="cursor-pointer">Pessoa Física</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Juridica" id="juridica" />
                      <Label htmlFor="juridica" className="cursor-pointer">Pessoa Jurídica</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isEditing && formData.identificador && (
                    <div className="space-y-2">
                      <Label htmlFor="identificador">Identificador</Label>
                      <Input
                        id="identificador"
                        value={formData.identificador}
                        readOnly
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-[11px] text-muted-foreground">Gerado automaticamente</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="nomeExibicao">Nome de Exibição *</Label>
                    <Input
                      id="nomeExibicao"
                      value={formData.nomeExibicao}
                      onChange={(e) => handleChange('nomeExibicao', e.target.value)}
                      placeholder="Nome curto para exibição"
                      className={inputClassName('nomeExibicao')}
                    />
                    {validationErrors.nomeExibicao && <p className="text-xs text-destructive mt-1">{validationErrors.nomeExibicao}</p>}
                  </div>
                </div>
                {!isEditing && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    O identificador será gerado automaticamente ao criar o cliente
                  </p>
                )}

                {formData.tipoPessoa === 'Fisica' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nomeCompleto">Nome Completo</Label>
                      <Input
                        id="nomeCompleto"
                        value={formData.nomeCompleto}
                        onChange={(e) => handleChange('nomeCompleto', e.target.value)}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        value={formData.cpf}
                        onChange={(e) => handleChange('cpf', e.target.value)}
                        placeholder="000.000.000-00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rg">RG</Label>
                      <Input
                        id="rg"
                        value={formData.rg}
                        onChange={(e) => handleChange('rg', e.target.value)}
                        placeholder="0.000.000"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="razaoSocial">Razão Social</Label>
                      <Input
                        id="razaoSocial"
                        value={formData.razaoSocial}
                        onChange={(e) => handleChange('razaoSocial', e.target.value)}
                        placeholder="Razão social completa"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        value={formData.cnpj}
                        onChange={(e) => handleChange('cnpj', e.target.value)}
                        placeholder="00.000.000/0001-00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
                      <Input
                        id="inscricaoEstadual"
                        value={formData.inscricaoEstadual}
                        onChange={(e) => handleChange('inscricaoEstadual', e.target.value)}
                        placeholder="Inscrição estadual"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contato */}
          <TabsContent value="contato">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Contato</CardTitle>
                <CardDescription>Informações de contato do cliente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefonePrincipal">Telefone Principal *</Label>
                    <Input
                      id="telefonePrincipal"
                      value={formData.telefonePrincipal}
                      onChange={(e) => handleChange('telefonePrincipal', e.target.value)}
                      placeholder="(00) 00000-0000"
                      className={inputClassName('telefonePrincipal')}
                    />
                    {validationErrors.telefonePrincipal && <p className="text-xs text-destructive mt-1">{validationErrors.telefonePrincipal}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Contatos Adicionais</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addContato} className="gap-1">
                      <Plus className="h-3.5 w-3.5" /> Adicionar
                    </Button>
                  </div>
                  {contatosList.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Nenhum contato adicional. Clique em "Adicionar" para incluir.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {contatosList.map((contato, index) => (
                        <div key={index} className="flex gap-2 items-start p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <Input
                              placeholder="Nome"
                              value={contato.nome}
                              onChange={(e) => updateContato(index, 'nome', e.target.value)}
                              className="h-9"
                            />
                            <Input
                              placeholder="Telefone"
                              value={contato.telefone}
                              onChange={(e) => updateContato(index, 'telefone', e.target.value)}
                              className="h-9"
                            />
                            <Input
                              placeholder="Função"
                              value={contato.funcao || ''}
                              onChange={(e) => updateContato(index, 'funcao', e.target.value)}
                              className="h-9"
                            />
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => removeContato(index)}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Endereço */}
          <TabsContent value="endereco">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Endereço</CardTitle>
                <CardDescription>Endereço do cliente com busca automática por CEP</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* GPS Button */}
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGpsLookup}
                    disabled={gpsLoading}
                    className="gap-1.5"
                  >
                    {gpsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                    Usar Localização GPS
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="cep"
                          value={formData.cep}
                          onChange={(e) => handleChange('cep', e.target.value)}
                          onBlur={() => {
                            const cep = formData.cep.replace(/\D/g, '')
                            if (cep.length === 8 && !cepLoading) {
                              handleCepLookup()
                            }
                          }}
                          placeholder="00000-000"
                          className="flex-1"
                        />
                        {cepLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCepLookup}
                        disabled={cepLoading}
                        className="shrink-0 gap-1.5"
                      >
                        {cepLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Search className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">Buscar CEP</span>
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Digite o CEP e o endereço será preenchido automaticamente
                    </p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="logradouro">Logradouro</Label>
                    <Input
                      id="logradouro"
                      value={formData.logradouro}
                      onChange={(e) => handleChange('logradouro', e.target.value)}
                      placeholder="Rua, Avenida..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      value={formData.numero}
                      onChange={(e) => handleChange('numero', e.target.value)}
                      placeholder="Nº"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      value={formData.complemento}
                      onChange={(e) => handleChange('complemento', e.target.value)}
                      placeholder="Apto, Sala..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      value={formData.bairro}
                      onChange={(e) => handleChange('bairro', e.target.value)}
                      placeholder="Bairro"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Select
                      value={formData.estado}
                      onValueChange={(v) => {
                        handleChange('estado', v)
                        handleChange('cidade', '') // Reset city when state changes
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {estados.map((e) => (
                          <SelectItem key={e.id} value={e.sigla}>
                            {e.sigla} - {e.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Select
                      value={formData.cidade}
                      onValueChange={(v) => handleChange('cidade', v)}
                      disabled={!formData.estado || cidadesLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={cidadesLoading ? 'Carregando...' : !formData.estado ? 'Selecione o estado primeiro' : 'Selecione a cidade'} />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {cidades.map((c) => (
                          <SelectItem key={c.id} value={c.nome}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vinculação */}
          <TabsContent value="vinculacao">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Vinculação</CardTitle>
                <CardDescription>Rota e status do cliente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rotaId">Rota</Label>
                    <Select
                      value={formData.rotaId || 'none'}
                      onValueChange={(v) => handleChange('rotaId', v === 'none' ? '' : v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione uma rota" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma rota</SelectItem>
                        {rotas.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        <SelectItem value="Ativo">Ativo</SelectItem>
                        <SelectItem value="Inativo">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
                {isEditing ? 'Atualizar' : 'Criar Cliente'}
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
      <Skeleton className="h-10 w-full" />
      <Card className="shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
