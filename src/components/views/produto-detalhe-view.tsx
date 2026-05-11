'use client'

import { useState, useEffect } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Package,
  Hash,
  MapPin,
  FileText,
  Wrench,
  Gauge,
  CheckCircle,
  XCircle,
  Clock,
  Settings2,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/layout/breadcrumb'

interface ProdutoDetalhe {
  id: string
  identificador: string
  tipoId: string
  tipoNome: string
  tipo: { id: string; nome: string }
  descricaoId: string
  descricaoNome: string
  descricao: { id: string; nome: string }
  tamanhoId: string
  tamanhoNome: string
  tamanho: { id: string; nome: string }
  numeroRelogio: string
  codigoCH?: string
  codigoABLF?: string
  conservacao: string
  statusProduto: string
  estabelecimento?: string
  observacao?: string
  locacoes: LocacaoItem[]
  manutencoes: ManutencaoItem[]
}

interface LocacaoItem {
  id: string
  clienteNome: string
  dataLocacao: string
  dataFim?: string
  formaPagamento: string
  numeroRelogio: string
  status: string
}

interface ManutencaoItem {
  id: string
  tipo: string
  descricao: string
  dataInicio: string
  dataFim?: string
  custo: number
  status: string
  observacao?: string
}

interface HistoricoRelogioItem {
  id: string
  relogioAnterior: string
  relogioNovo: string
  motivo?: string
  observacao?: string
  usuarioNome?: string
  createdAt: string
}

export function ProdutoDetalheView() {
  const { selectedId, navigate, goBack } = useNavigation()
  const [produto, setProduto] = useState<ProdutoDetalhe | null>(null)
  const [historicoRelogio, setHistoricoRelogio] = useState<HistoricoRelogioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    if (!selectedId) {
      navigate('produtos')
      return
    }

    async function fetchProduto() {
      try {
        const res = await fetch(`/api/produtos/${selectedId}`)
        if (res.ok) {
          const data = await res.json()
          setProduto(data)
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
  }, [selectedId, navigate])

  // Fetch histórico relógio
  useEffect(() => {
    if (!selectedId) return

    async function fetchHistorico() {
      try {
        const res = await fetch(`/api/historico-relogio?produtoId=${selectedId}`)
        if (res.ok) {
          const data = await res.json()
          setHistoricoRelogio(Array.isArray(data) ? data : data.data || [])
        }
      } catch (error) {
        console.error('Erro ao buscar histórico:', error)
      }
    }
    fetchHistorico()
  }, [selectedId])

  const handleDelete = async () => {
    if (!selectedId) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/produtos/${selectedId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Produto excluído com sucesso')
        navigate('produtos')
      } else {
        toast.error('Erro ao excluir produto')
      }
    } catch {
      toast.error('Erro ao excluir produto')
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return <DetailSkeleton />
  }

  if (!produto) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <p className="text-muted-foreground">Produto não encontrado.</p>
      </div>
    )
  }

  const conservacaoColors: Record<string, string> = {
    'Ótima': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Boa': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'Regular': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'Ruim': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'Péssima': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  // Get accent color based on conservação
  const conservacaoAccent: Record<string, string> = {
    'Ótima': 'from-green-500 to-green-600',
    'Boa': 'from-sky-500 to-sky-600',
    'Regular': 'from-yellow-500 to-yellow-600',
    'Ruim': 'from-orange-500 to-orange-600',
    'Péssima': 'from-red-500 to-red-600',
  }
  const headerAccent = conservacaoAccent[produto.conservacao] || 'from-gray-500 to-gray-600'

  const conservacaoAccentBorder: Record<string, string> = {
    'Ótima': 'border-green-500',
    'Boa': 'border-sky-500',
    'Regular': 'border-yellow-500',
    'Ruim': 'border-orange-500',
    'Péssima': 'border-red-500',
  }
  const accentBorder = conservacaoAccentBorder[produto.conservacao] || 'border-gray-500'

  const statusIcon = produto.statusProduto === 'Ativo' ? <CheckCircle className="h-8 w-8 text-green-500" /> : produto.statusProduto === 'Manutenção' ? <Wrench className="h-8 w-8 text-purple-500" /> : <XCircle className="h-8 w-8 text-red-400" />
  const statusGradient = produto.statusProduto === 'Ativo' ? 'from-green-50 to-green-100/50 dark:from-green-950 dark:to-green-900/30' : produto.statusProduto === 'Manutenção' ? 'from-purple-50 to-purple-100/50 dark:from-purple-950 dark:to-purple-900/30' : 'from-red-50 to-red-100/50 dark:from-red-950 dark:to-red-900/30'

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb />
      {/* Header with accent bar */}
      <div className={`rounded-xl bg-gradient-to-r ${headerAccent} p-[3px]`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-card rounded-lg p-4">
          <Button variant="ghost" size="icon" onClick={goBack} className="h-9 w-9 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold truncate">{produto.identificador}</h1>
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border-0 bg-primary/10 text-primary">
                {produto.tipoNome || produto.tipo?.nome}
              </span>
              <StatusBadge status={produto.statusProduto} />
            </div>
            <p className="text-muted-foreground text-sm">
              {produto.descricaoNome || produto.descricao?.nome} — {produto.tamanhoNome || produto.tamanho?.nome}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate('produto-editar', produto.id)}
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
      </div>

      {/* Product Status Card */}
      <Card className={`shadow-sm border-l-4 ${accentBorder} bg-gradient-to-br ${statusGradient}`}>
        <CardContent className="p-5">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-white/80 dark:bg-black/20 flex items-center justify-center shadow-sm shrink-0">
              {statusIcon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-lg font-bold">{produto.identificador}</h2>
                <StatusBadge status={produto.statusProduto} />
              </div>
              <p className="text-sm text-muted-foreground">{produto.tipoNome || produto.tipo?.nome} — {produto.descricaoNome || produto.descricao?.nome}</p>
            </div>
            <div className="hidden sm:flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{produto.locacoes?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Locações</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{produto.manutencoes?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Manutenções</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Técnicas */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Settings2 className="h-4 w-4" />
            Informações Técnicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Conservação</p>
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border-0 ${conservacaoColors[produto.conservacao] || 'bg-gray-100 text-gray-800'}`}>
                {produto.conservacao}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Relógio</p>
              <p className="text-sm font-medium">{produto.numeroRelogio || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="text-sm font-medium">{produto.tipoNome || produto.tipo?.nome || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Descrição</p>
              <p className="text-sm font-medium">{produto.descricaoNome || produto.descricao?.nome || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tamanho</p>
              <p className="text-sm font-medium">{produto.tamanhoNome || produto.tamanho?.nome || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Código CH</p>
              <p className="text-sm font-medium">{produto.codigoCH || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Código ABLF</p>
              <p className="text-sm font-medium">{produto.codigoABLF || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Estabelecimento</p>
              <p className="text-sm font-medium">{produto.estabelecimento || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Locações */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            Histórico de Locações ({produto.locacoes?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!produto.locacoes || produto.locacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Nenhuma locação registrada</p>
              <p className="text-xs text-muted-foreground mt-1">
                As locações deste produto aparecerão aqui
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data Locação</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Relógio</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produto.locacoes.map((loc) => (
                  <TableRow
                    key={loc.id}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${loc.status === 'Ativa' ? 'border-l-4 border-l-green-500' : loc.status === 'Finalizada' ? 'border-l-4 border-l-gray-400' : 'border-l-4 border-l-red-400'}`}
                    onClick={() => navigate('locacao-detalhe', loc.id)}
                  >
                    <TableCell className="font-medium">{loc.clienteNome}</TableCell>
                    <TableCell>{loc.dataLocacao}</TableCell>
                    <TableCell>{loc.dataFim || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{loc.formaPagamento}</TableCell>
                    <TableCell>{loc.numeroRelogio}</TableCell>
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

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dados do Produto */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Package className="h-4 w-4" />
              Dados do Produto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <InfoRow label="Tipo" value={produto.tipoNome || produto.tipo?.nome} />
            <InfoRow label="Descrição" value={produto.descricaoNome || produto.descricao?.nome} />
            <InfoRow label="Tamanho" value={produto.tamanhoNome || produto.tamanho?.nome} />
            <InfoRow
              label="Conservação"
              value={produto.conservacao}
              badge
              badgeClass={conservacaoColors[produto.conservacao] || ''}
            />
            <InfoRow label="Relógio" value={produto.numeroRelogio} />
          </CardContent>
        </Card>

        {/* Códigos */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Hash className="h-4 w-4" />
              Códigos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <InfoRow label="CH" value={produto.codigoCH} />
            <InfoRow label="ABLF" value={produto.codigoABLF} />
            {!produto.codigoCH && !produto.codigoABLF && (
              <p className="text-sm text-muted-foreground">Nenhum código registrado</p>
            )}
          </CardContent>
        </Card>

        {/* Status e Localização */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Status e Localização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-muted-foreground shrink-0">Status:</span>
              <StatusBadge status={produto.statusProduto} />
            </div>
            <InfoRow label="Estabelecimento" value={produto.estabelecimento} />
            {!produto.estabelecimento && (
              <p className="text-sm text-muted-foreground">Nenhum estabelecimento vinculado</p>
            )}
          </CardContent>
        </Card>

        {/* Observação */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              Observação
            </CardTitle>
          </CardHeader>
          <CardContent>
            {produto.observacao ? (
              <p className="text-sm leading-relaxed">{produto.observacao}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma observação registrada</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Locações, Manutenções, Histórico Relógio */}
      <Tabs defaultValue="locacoes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="locacoes">
            Locações ({produto.locacoes?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="manutencoes">
            Manutenções ({produto.manutencoes?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="relogio">
            Histórico Relógio ({historicoRelogio.length})
          </TabsTrigger>
        </TabsList>

        {/* Locações Tab */}
        <TabsContent value="locacoes">
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {!produto.locacoes || produto.locacoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Nenhuma locação registrada</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    As locações deste produto aparecerão aqui
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data Locação</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Relógio</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produto.locacoes.map((loc) => (
                      <TableRow
                        key={loc.id}
                        className="cursor-pointer"
                        onClick={() => navigate('locacao-detalhe', loc.id)}
                      >
                        <TableCell className="font-medium">{loc.clienteNome}</TableCell>
                        <TableCell>{loc.dataLocacao}</TableCell>
                        <TableCell>{loc.dataFim || '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{loc.formaPagamento}</TableCell>
                        <TableCell>{loc.numeroRelogio}</TableCell>
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

        {/* Manutenções Tab */}
        <TabsContent value="manutencoes">
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {!produto.manutencoes || produto.manutencoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Wrench className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Nenhuma manutenção registrada</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    As manutenções deste produto aparecerão aqui
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Custo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produto.manutencoes.map((man) => (
                      <TableRow key={man.id}>
                        <TableCell className="font-medium capitalize">{man.tipo?.replace('_', ' ')}</TableCell>
                        <TableCell className="text-muted-foreground">{man.descricao}</TableCell>
                        <TableCell>{man.dataInicio}</TableCell>
                        <TableCell>{man.dataFim || '—'}</TableCell>
                        <TableCell>
                          {man.custo ? man.custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={man.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Histórico Relógio Tab */}
        <TabsContent value="relogio">
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {historicoRelogio.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Gauge className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Nenhum histórico de relógio</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    As alterações no relógio aparecerão aqui
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Relógio Anterior</TableHead>
                      <TableHead>Relógio Novo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historicoRelogio.map((hist) => (
                      <TableRow key={hist.id}>
                        <TableCell className="font-medium">{hist.relogioAnterior}</TableCell>
                        <TableCell className="font-medium">{hist.relogioNovo}</TableCell>
                        <TableCell className="text-muted-foreground">{hist.motivo || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{hist.usuarioNome || '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {hist.createdAt ? format(new Date(hist.createdAt), 'dd/MM/yyyy HH:mm') : '—'}
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
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O produto &quot;{produto.identificador}&quot; será
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

function InfoRow({ label, value, badge, badgeClass }: { label: string; value?: string | null; badge?: boolean; badgeClass?: string }) {
  if (!value) return null
  if (badge) {
    return (
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-muted-foreground shrink-0">{label}:</span>
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border-0 ${badgeClass || ''}`}>
          {value}
        </span>
      </div>
    )
  }
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
