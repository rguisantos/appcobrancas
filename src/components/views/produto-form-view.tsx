'use client'

import { useState, useEffect } from 'react'
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
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

interface TipoProduto {
  id: string
  nome: string
}

interface DescricaoProduto {
  id: string
  nome: string
}

interface TamanhoProduto {
  id: string
  nome: string
}

interface ProdutoFormData {
  identificador: string
  numeroRelogio: string
  tipoId: string
  tipoNome: string
  descricaoId: string
  descricaoNome: string
  tamanhoId: string
  tamanhoNome: string
  codigoCH: string
  codigoABLF: string
  conservacao: string
  statusProduto: string
  estabelecimento: string
  observacao: string
}

const initialFormData: ProdutoFormData = {
  identificador: '',
  numeroRelogio: '0',
  tipoId: '',
  tipoNome: '',
  descricaoId: '',
  descricaoNome: '',
  tamanhoId: '',
  tamanhoNome: '',
  codigoCH: '',
  codigoABLF: '',
  conservacao: 'Boa',
  statusProduto: 'Ativo',
  estabelecimento: '',
  observacao: '',
}

export function ProdutoFormView() {
  const { selectedId, currentView, navigate, goBack } = useNavigation()
  const isEditing = currentView === 'produto-editar' && !!selectedId

  const [formData, setFormData] = useState<ProdutoFormData>(initialFormData)
  const [tipos, setTipos] = useState<TipoProduto[]>([])
  const [descricoes, setDescricoes] = useState<DescricaoProduto[]>([])
  const [tamanhos, setTamanhos] = useState<TamanhoProduto[]>([])
  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)

  // Fetch tipos, descricoes, tamanhos
  useEffect(() => {
    async function fetchOptions() {
      try {
        const [tiposRes, descricoesRes, tamanhosRes] = await Promise.all([
          fetch('/api/tipos-produto'),
          fetch('/api/descricoes-produto'),
          fetch('/api/tamanhos-produto'),
        ])
        if (tiposRes.ok) setTipos(await tiposRes.json())
        if (descricoesRes.ok) setDescricoes(await descricoesRes.json())
        if (tamanhosRes.ok) setTamanhos(await tamanhosRes.json())
      } catch (error) {
        console.error('Erro ao buscar opções:', error)
      }
    }
    fetchOptions()
  }, [])

  // Load produto data if editing
  useEffect(() => {
    if (isEditing && selectedId) {
      async function fetchProduto() {
        try {
          const res = await fetch(`/api/produtos/${selectedId}`)
          if (res.ok) {
            const data = await res.json()
            setFormData({
              identificador: data.identificador || '',
              numeroRelogio: data.numeroRelogio || '0',
              tipoId: data.tipoId || '',
              tipoNome: data.tipoNome || data.tipo?.nome || '',
              descricaoId: data.descricaoId || '',
              descricaoNome: data.descricaoNome || data.descricao?.nome || '',
              tamanhoId: data.tamanhoId || '',
              tamanhoNome: data.tamanhoNome || data.tamanho?.nome || '',
              codigoCH: data.codigoCH || '',
              codigoABLF: data.codigoABLF || '',
              conservacao: data.conservacao || 'Boa',
              statusProduto: data.statusProduto || 'Ativo',
              estabelecimento: data.estabelecimento || '',
              observacao: data.observacao || '',
            })
          } else {
            toast.error('Produto não encontrado')
            navigate('produtos')
          }
        } catch {
          toast.error('Erro ao carregar produto')
          navigate('produtos')
        } finally {
          setLoading(false)
        }
      }
      fetchProduto()
    }
  }, [isEditing, selectedId, navigate])

  // Handle field changes
  const handleChange = (field: keyof ProdutoFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Auto-fill tipoNome when tipoId changes
  const handleTipoChange = (value: string) => {
    const tipo = tipos.find((t) => t.id === value)
    setFormData((prev) => ({
      ...prev,
      tipoId: value,
      tipoNome: tipo?.nome || '',
    }))
  }

  // Auto-fill descricaoNome when descricaoId changes
  const handleDescricaoChange = (value: string) => {
    const descricao = descricoes.find((d) => d.id === value)
    setFormData((prev) => ({
      ...prev,
      descricaoId: value,
      descricaoNome: descricao?.nome || '',
    }))
  }

  // Auto-fill tamanhoNome when tamanhoId changes
  const handleTamanhoChange = (value: string) => {
    const tamanho = tamanhos.find((t) => t.id === value)
    setFormData((prev) => ({
      ...prev,
      tamanhoId: value,
      tamanhoNome: tamanho?.nome || '',
    }))
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.identificador.trim()) {
      toast.error('Identificador é obrigatório')
      return
    }
    if (!formData.tipoId) {
      toast.error('Tipo é obrigatório')
      return
    }
    if (!formData.descricaoId) {
      toast.error('Descrição é obrigatória')
      return
    }
    if (!formData.tamanhoId) {
      toast.error('Tamanho é obrigatório')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        identificador: formData.identificador,
        numeroRelogio: formData.numeroRelogio || '0',
        tipoId: formData.tipoId,
        tipoNome: formData.tipoNome,
        descricaoId: formData.descricaoId,
        descricaoNome: formData.descricaoNome,
        tamanhoId: formData.tamanhoId,
        tamanhoNome: formData.tamanhoNome,
        codigoCH: formData.codigoCH || undefined,
        codigoABLF: formData.codigoABLF || undefined,
        conservacao: formData.conservacao,
        statusProduto: formData.statusProduto,
        estabelecimento: formData.estabelecimento || undefined,
        observacao: formData.observacao || undefined,
      }

      let res: Response
      if (isEditing && selectedId) {
        res = await fetch(`/api/produtos/${selectedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/produtos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (res.ok) {
        toast.success(isEditing ? 'Produto atualizado com sucesso' : 'Produto criado com sucesso')
        navigate('produtos')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao salvar produto')
      }
    } catch {
      toast.error('Erro ao salvar produto')
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
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEditing ? 'Atualize os dados do produto' : 'Preencha os dados para criar um novo produto'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Dados do Produto */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Dados do Produto</CardTitle>
              <CardDescription>Informações básicas do produto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="identificador">Identificador *</Label>
                  <Input
                    id="identificador"
                    value={formData.identificador}
                    onChange={(e) => handleChange('identificador', e.target.value)}
                    placeholder="Ex: P001"
                    required
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipoId">Tipo *</Label>
                  <Select value={formData.tipoId} onValueChange={handleTipoChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tipos.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricaoId">Descrição *</Label>
                  <Select value={formData.descricaoId} onValueChange={handleDescricaoChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a descrição" />
                    </SelectTrigger>
                    <SelectContent>
                      {descricoes.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tamanhoId">Tamanho *</Label>
                  <Select value={formData.tamanhoId} onValueChange={handleTamanhoChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o tamanho" />
                    </SelectTrigger>
                    <SelectContent>
                      {tamanhos.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="conservacao">Conservação</Label>
                  <Select value={formData.conservacao} onValueChange={(v) => handleChange('conservacao', v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ótima">Ótima</SelectItem>
                      <SelectItem value="Boa">Boa</SelectItem>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Ruim">Ruim</SelectItem>
                      <SelectItem value="Péssima">Péssima</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="statusProduto">Status</Label>
                  <Select value={formData.statusProduto} onValueChange={(v) => handleChange('statusProduto', v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                      <SelectItem value="Manutenção">Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Códigos */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Códigos</CardTitle>
              <CardDescription>Códigos de identificação adicionais</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigoCH">Código CH</Label>
                  <Input
                    id="codigoCH"
                    value={formData.codigoCH}
                    onChange={(e) => handleChange('codigoCH', e.target.value)}
                    placeholder="Código CH (opcional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigoABLF">Código ABLF</Label>
                  <Input
                    id="codigoABLF"
                    value={formData.codigoABLF}
                    onChange={(e) => handleChange('codigoABLF', e.target.value)}
                    placeholder="Código ABLF (opcional)"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Localização e Observação */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Localização e Observação</CardTitle>
              <CardDescription>Estabelecimento e observações do produto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="estabelecimento">Estabelecimento</Label>
                <Input
                  id="estabelecimento"
                  value={formData.estabelecimento}
                  onChange={(e) => handleChange('estabelecimento', e.target.value)}
                  placeholder="Nome do estabelecimento (opcional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observacao">Observação</Label>
                <Textarea
                  id="observacao"
                  value={formData.observacao}
                  onChange={(e) => handleChange('observacao', e.target.value)}
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
                {isEditing ? 'Atualizar' : 'Criar Produto'}
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
