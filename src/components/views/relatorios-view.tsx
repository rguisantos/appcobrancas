'use client'

import { useState, useEffect } from 'react'
import { useNavigation } from '@/lib/store/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { format } from 'date-fns'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
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
  DollarSign,
  Users,
  Package,
  MapPin,
  AlertTriangle,
  CreditCard,
  Route,
  BarChart3,
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  FileSpreadsheet,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'

const PIE_COLORS = ['#16a34a', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

const barChartConfig: ChartConfig = {
  valor: { label: 'Valor', color: '#16a34a' },
  recebido: { label: 'Recebido', color: '#22c55e' },
  pendente: { label: 'Pendente', color: '#eab308' },
  atrasado: { label: 'Atrasado', color: '#ef4444' },
}

const lineChartConfig: ChartConfig = {
  atual: { label: 'Atual', color: '#16a34a' },
  anterior: { label: 'Anterior', color: '#94a3b8' },
}

const pieChartConfig: ChartConfig = {
  Pago: { label: 'Pago', color: '#16a34a' },
  Pendente: { label: 'Pendente', color: '#eab308' },
  Parcial: { label: 'Parcial', color: '#f97316' },
  Atrasado: { label: 'Atrasado', color: '#ef4444' },
}

interface CobrancaForReport {
  id: string
  clienteId: string
  clienteNome: string
  produtoId: string | null
  produtoIdentificador: string
  dataInicio: string
  dataFim: string
  totalBruto: number
  totalClientePaga: number
  valorRecebido: number
  saldoDevedorGerado: number
  status: string
  formaPagamento: string
  dataPagamento: string | null
  dataVencimento: string | null
  createdAt: string
}

type ReportType = 'financeiro' | 'clientes' | 'produtos' | 'locacoes' | 'inadimplencia' | 'recebimentos' | 'rotas' | 'comparativo'

export function RelatoriosView() {
  const { navigate } = useNavigation()
  const [activeReport, setActiveReport] = useState<ReportType>('financeiro')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [cobrancas, setCobrancas] = useState<CobrancaForReport[]>([])
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 6)
    return d.toISOString().split('T')[0]
  })
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0])

  // Fetch cobrancas for reports
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const params = new URLSearchParams({ limit: '1000' })
        if (dataInicio) params.set('periodoInicio', dataInicio)
        if (dataFim) params.set('periodoFim', dataFim)
        const res = await fetch(`/api/cobrancas?${params}`)
        if (res.ok) {
          const data = await res.json()
          setCobrancas(data.data || [])
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [dataInicio, dataFim])

  const handleExport = async (format: 'xlsx' | 'csv') => {
    setExporting(true)
    try {
      const params = new URLSearchParams({
        tipo: activeReport,
        format,
      })
      if (dataInicio) params.set('dataInicio', dataInicio)
      if (dataFim) params.set('dataFim', dataFim)

      const res = await fetch(`/api/relatorios/export?${params}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Erro ao exportar' }))
        toast.error(errorData.error || 'Erro ao exportar relatório')
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const contentDisposition = res.headers.get('Content-Disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `relatorio-${activeReport}-${new Date().toISOString().slice(0, 10)}.${format}`
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`Relatório ${activeReport} exportado com sucesso!`)
    } catch (error) {
      console.error('Erro ao exportar:', error)
      toast.error('Erro ao exportar relatório')
    } finally {
      setExporting(false)
    }
  }

  // ==================== FINANCEIRO REPORT ====================
  const financeiroData = (() => {
    const monthlyMap = new Map<string, { mes: string; valor: number; recebido: number; pendente: number; atrasado: number }>()

    cobrancas.forEach((c) => {
      const monthKey = c.dataInicio ? c.dataInicio.substring(0, 7) : 'unknown'
      const mesLabel = (() => {
        try {
          const d = new Date(monthKey + '-01')
          return format(d, 'MMM/yy')
        } catch {
          return monthKey
        }
      })()

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { mes: mesLabel, valor: 0, recebido: 0, pendente: 0, atrasado: 0 })
      }
      const entry = monthlyMap.get(monthKey)!
      entry.valor += c.totalClientePaga
      if (c.status === 'Pago' || c.status === 'Parcial') entry.recebido += c.valorRecebido
      if (c.status === 'Pendente' || c.status === 'Parcial') entry.pendente += (c.totalClientePaga - c.valorRecebido)
      if (c.status === 'Atrasado') entry.atrasado += (c.totalClientePaga - c.valorRecebido)
    })

    return Array.from(monthlyMap.values()).sort((a, b) => a.mes.localeCompare(b.mes))
  })()

  const financeiroSummary = {
    totalGeral: cobrancas.reduce((a, c) => a + c.totalClientePaga, 0),
    totalRecebido: cobrancas.filter(c => c.status === 'Pago' || c.status === 'Parcial').reduce((a, c) => a + c.valorRecebido, 0),
    totalPendente: cobrancas.filter(c => c.status === 'Pendente' || c.status === 'Parcial').reduce((a, c) => a + (c.totalClientePaga - c.valorRecebido), 0),
    totalAtrasado: cobrancas.filter(c => c.status === 'Atrasado').reduce((a, c) => a + (c.totalClientePaga - c.valorRecebido), 0),
  }

  const statusDistribution = (() => {
    const map = new Map<string, number>()
    cobrancas.forEach(c => {
      map.set(c.status, (map.get(c.status) || 0) + 1)
    })
    return Array.from(map.entries()).map(([status, quantidade]) => ({ status, quantidade }))
  })()

  // ==================== CLIENTES REPORT ====================
  const clientesData = (() => {
    const map = new Map<string, { clienteNome: string; totalCobrancas: number; totalValor: number; totalRecebido: number; totalPendente: number }>()
    cobrancas.forEach(c => {
      if (!map.has(c.clienteId)) {
        map.set(c.clienteId, { clienteNome: c.clienteNome, totalCobrancas: 0, totalValor: 0, totalRecebido: 0, totalPendente: 0 })
      }
      const entry = map.get(c.clienteId)!
      entry.totalCobrancas++
      entry.totalValor += c.totalClientePaga
      if (c.status === 'Pago' || c.status === 'Parcial') entry.totalRecebido += c.valorRecebido
      entry.totalPendente += (c.totalClientePaga - c.valorRecebido)
    })
    return Array.from(map.values()).sort((a, b) => b.totalValor - a.totalValor)
  })()

  // ==================== PRODUTOS REPORT ====================
  const produtosData = (() => {
    const map = new Map<string, { produtoIdentificador: string; totalCobrancas: number; totalValor: number; totalRecebido: number }>()
    cobrancas.forEach(c => {
      const key = c.produtoId || c.produtoIdentificador
      if (!map.has(key)) {
        map.set(key, { produtoIdentificador: c.produtoIdentificador, totalCobrancas: 0, totalValor: 0, totalRecebido: 0 })
      }
      const entry = map.get(key)!
      entry.totalCobrancas++
      entry.totalValor += c.totalClientePaga
      entry.totalRecebido += c.valorRecebido
    })
    return Array.from(map.values()).sort((a, b) => b.totalValor - a.totalValor)
  })()

  // ==================== INADIMPLENCIA REPORT ====================
  const inadimplenciaData = cobrancas
    .filter(c => c.status === 'Atrasado' || c.status === 'Pendente' || c.status === 'Parcial')
    .sort((a, b) => (b.totalClientePaga - b.valorRecebido) - (a.totalClientePaga - a.valorRecebido))
    .map(c => ({
      ...c,
      saldoDevedor: c.totalClientePaga - c.valorRecebido,
    }))

  // ==================== RECEBIMENTOS REPORT ====================
  const recebimentosData = cobrancas
    .filter(c => c.valorRecebido > 0 && c.dataPagamento)
    .sort((a, b) => (b.dataPagamento || '').localeCompare(a.dataPagamento || ''))

  const recebimentosMonthly = (() => {
    const map = new Map<string, { mes: string; valor: number }>()
    recebimentosData.forEach(c => {
      if (!c.dataPagamento) return
      const monthKey = c.dataPagamento.substring(0, 7)
      const mesLabel = (() => {
        try {
          return format(new Date(monthKey + '-01'), 'MMM/yy')
        } catch {
          return monthKey
        }
      })()
      if (!map.has(monthKey)) {
        map.set(monthKey, { mes: mesLabel, valor: 0 })
      }
      map.get(monthKey)!.valor += c.valorRecebido
    })
    return Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes))
  })()

  // ==================== COMPARATIVO REPORT ====================
  const comparativoData = (() => {
    const currentYear = new Date().getFullYear()
    const lastYear = currentYear - 1
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    return monthNames.map((mes, i) => {
      const currentMonth = `${currentYear}-${String(i + 1).padStart(2, '0')}`
      const lastMonth = `${lastYear}-${String(i + 1).padStart(2, '0')}`

      const atual = cobrancas
        .filter(c => c.dataInicio && c.dataInicio.startsWith(currentMonth))
        .reduce((a, c) => a + c.totalClientePaga, 0)
      const anterior = cobrancas
        .filter(c => c.dataInicio && c.dataInicio.startsWith(lastMonth))
        .reduce((a, c) => a + c.totalClientePaga, 0)

      return { mes, atual, anterior }
    })
  })()

  // ==================== ROTAS REPORT ====================
  // For rotas, we need to join with cliente data. Since we only have cobranças here,
  // we'll group by cliente as a proxy (in a full app, we'd fetch rotas data)
  const rotasData = (() => {
    // Group cobranças by first letter of client name as a simple grouping
    // In production, this would join with rotas data
    const map = new Map<string, { rota: string; totalCobrancas: number; totalValor: number; totalRecebido: number }>()
    cobrancas.forEach(c => {
      const rota = c.clienteNome ? c.clienteNome.charAt(0).toUpperCase() : 'Outros'
      if (!map.has(rota)) {
        map.set(rota, { rota, totalCobrancas: 0, totalValor: 0, totalRecebido: 0 })
      }
      const entry = map.get(rota)!
      entry.totalCobrancas++
      entry.totalValor += c.totalClientePaga
      entry.totalRecebido += c.valorRecebido
    })
    return Array.from(map.values()).sort((a, b) => b.totalValor - a.totalValor)
  })()

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return format(new Date(dateStr + 'T00:00:00'), 'dd/MM/yyyy')
    } catch {
      return dateStr
    }
  }

  const formatMonth = (dateStr: string) => {
    try {
      return format(new Date(dateStr + 'T00:00:00'), 'MMM/yy')
    } catch {
      return dateStr
    }
  }

  const reportTabs: { value: ReportType; label: string; icon: React.ReactNode }[] = [
    { value: 'financeiro', label: 'Financeiro', icon: <DollarSign className="h-4 w-4" /> },
    { value: 'clientes', label: 'Clientes', icon: <Users className="h-4 w-4" /> },
    { value: 'produtos', label: 'Produtos', icon: <Package className="h-4 w-4" /> },
    { value: 'locacoes', label: 'Locações', icon: <MapPin className="h-4 w-4" /> },
    { value: 'inadimplencia', label: 'Inadimplência', icon: <AlertTriangle className="h-4 w-4" /> },
    { value: 'recebimentos', label: 'Recebimentos', icon: <CreditCard className="h-4 w-4" /> },
    { value: 'rotas', label: 'Rotas', icon: <Route className="h-4 w-4" /> },
    { value: 'comparativo', label: 'Comparativo', icon: <BarChart3 className="h-4 w-4" /> },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground text-sm">
            Análises e relatórios do sistema de cobranças
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            disabled={exporting}
            onClick={() => handleExport('xlsx')}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            disabled={exporting}
            onClick={() => handleExport('csv')}
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className="shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-end gap-2 sm:gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Data Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full sm:w-auto h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full sm:w-auto h-9 text-sm"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {cobrancas.length} cobrança{cobrancas.length !== 1 ? 's' : ''} no período
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs value={activeReport} onValueChange={(v) => setActiveReport(v as ReportType)}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {reportTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs">
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* FINANCEIRO */}
        <TabsContent value="financeiro" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm border-l-4 border-l-green-500 stat-card-blue shine-effect">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Total Geral</p>
                <p className="text-2xl font-bold">{formatarMoeda(financeiroSummary.totalGeral)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-l-4 border-l-emerald-500 stat-card-emerald shine-effect">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Total Recebido</p>
                <p className="text-2xl font-bold text-green-600">{formatarMoeda(financeiroSummary.totalRecebido)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-l-4 border-l-yellow-500 stat-card-amber shine-effect">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Total Pendente</p>
                <p className="text-2xl font-bold text-yellow-600">{formatarMoeda(financeiroSummary.totalPendente)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-l-4 border-l-red-500 stat-card-red shine-effect">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Total Atrasado</p>
                <p className="text-2xl font-bold text-red-600">{formatarMoeda(financeiroSummary.totalAtrasado)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Revenue Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Receita Mensal
                </CardTitle>
                <CardDescription>Valores por mês</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ChartContainer config={barChartConfig} className="h-[300px] w-full">
                    <BarChart data={financeiroData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="mes" className="text-xs" tick={{ fontSize: 11 }} />
                      <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatarMoeda(value)} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="recebido" fill="var(--color-recebido)" name="Recebido" radius={[4, 4, 0, 0]} stackId="a" />
                      <Bar dataKey="pendente" fill="var(--color-pendente)" name="Pendente" stackId="a" />
                      <Bar dataKey="atrasado" fill="var(--color-atrasado)" name="Atrasado" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Status Distribution Pie Chart */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Distribuição por Status
                </CardTitle>
                <CardDescription>Cobranças agrupadas por status</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : statusDistribution.length > 0 ? (
                  <ChartContainer config={pieChartConfig} className="h-[300px] w-full">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="quantidade"
                        nameKey="status"
                        label={({ status, percent }: { status: string; percent: number }) =>
                          `${status} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={entry.status} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [value, name]} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      <Legend />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                    Nenhuma cobrança no período
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Monthly Summary Table */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Resumo Mensal</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Recebido</TableHead>
                    <TableHead className="text-right">Pendente</TableHead>
                    <TableHead className="text-right">Atrasado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financeiroData.map((row) => (
                    <TableRow key={row.mes}>
                      <TableCell className="font-medium">{row.mes}</TableCell>
                      <TableCell className="text-right">{formatarMoeda(row.valor)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatarMoeda(row.recebido)}</TableCell>
                      <TableCell className="text-right text-yellow-600">{formatarMoeda(row.pendente)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatarMoeda(row.atrasado)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CLIENTES */}
        <TabsContent value="clientes" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Estatísticas por Cliente
              </CardTitle>
              <CardDescription>Top clientes por faturamento</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ChartContainer config={barChartConfig} className="h-[300px] w-full">
                  <BarChart data={clientesData.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="clienteNome" className="text-xs" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(value: number) => formatarMoeda(value)} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="totalRecebido" fill="#16a34a" name="Recebido" radius={[0, 4, 4, 0]} stackId="a" />
                    <Bar dataKey="totalPendente" fill="#eab308" name="Pendente" radius={[0, 4, 4, 0]} stackId="a" />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Detalhamento por Cliente</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Cobranças</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Recebido</TableHead>
                    <TableHead className="text-right">Pendente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesData.map((row) => (
                    <TableRow key={row.clienteNome} className="cursor-pointer">
                      <TableCell className="font-medium">{row.clienteNome}</TableCell>
                      <TableCell className="text-right">{row.totalCobrancas}</TableCell>
                      <TableCell className="text-right">{formatarMoeda(row.totalValor)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatarMoeda(row.totalRecebido)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatarMoeda(row.totalPendente)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRODUTOS */}
        <TabsContent value="produtos" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Utilização por Produto
              </CardTitle>
              <CardDescription>Receita gerada por produto</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ChartContainer config={barChartConfig} className="h-[300px] w-full">
                  <BarChart data={produtosData.slice(0, 10)} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="produtoIdentificador" className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatarMoeda(value)} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="totalRecebido" fill="#16a34a" name="Recebido" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="totalValor" fill="#eab308" name="Total" radius={[4, 4, 0, 0]} stackId="a" />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Detalhamento por Produto</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Cobranças</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Recebido</TableHead>
                    <TableHead className="text-right">Pendente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtosData.map((row) => (
                    <TableRow key={row.produtoIdentificador}>
                      <TableCell className="font-medium">{row.produtoIdentificador}</TableCell>
                      <TableCell className="text-right">{row.totalCobrancas}</TableCell>
                      <TableCell className="text-right">{formatarMoeda(row.totalValor)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatarMoeda(row.totalRecebido)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatarMoeda(row.totalValor - row.totalRecebido)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOCAÇÕES */}
        <TabsContent value="locacoes" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Locações Ativas
              </CardTitle>
              <CardDescription>Resumo das locações com cobranças no período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Total de Locações</p>
                  <p className="text-2xl font-bold">{new Set(cobrancas.map(c => c.clienteId)).size}</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                  <p className="text-sm text-green-600 dark:text-green-400">Total Recebido</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatarMoeda(financeiroSummary.totalRecebido)}</p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg text-center">
                  <p className="text-sm text-red-600 dark:text-red-400">Total Pendente</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">{formatarMoeda(financeiroSummary.totalPendente + financeiroSummary.totalAtrasado)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Cobranças por Locação</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cobrancas.slice(0, 50).map((c) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate('cobranca-detalhe', c.id)}>
                      <TableCell className="font-medium">{c.clienteNome}</TableCell>
                      <TableCell>{c.produtoIdentificador}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(c.dataInicio)} - {formatDate(c.dataFim)}
                      </TableCell>
                      <TableCell className="text-right">{formatarMoeda(c.totalClientePaga)}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INADIMPLÊNCIA */}
        <TabsContent value="inadimplencia" className="space-y-6">
          <Card className="shadow-sm border-l-4 border-l-red-500 stat-card-red">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total em Inadimplência</p>
                  <p className="text-3xl font-bold text-red-600">
                    {formatarMoeda(inadimplenciaData.reduce((a, c) => a + c.saldoDevedor, 0))}
                  </p>
                  <p className="text-sm text-muted-foreground">{inadimplenciaData.length} cobrança{inadimplenciaData.length !== 1 ? 's' : ''} pendente{inadimplenciaData.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Cobranças em Atraso/Pendente</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Saldo Devedor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inadimplenciaData.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate('cobranca-detalhe', c.id)}>
                      <TableCell className="font-medium">{c.clienteNome}</TableCell>
                      <TableCell>{c.produtoIdentificador}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(c.dataVencimento)}</TableCell>
                      <TableCell className="text-right">{formatarMoeda(c.totalClientePaga)}</TableCell>
                      <TableCell className="text-right text-red-600 font-semibold">{formatarMoeda(c.saldoDevedor)}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RECEBIMENTOS */}
        <TabsContent value="recebimentos" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-sm border-l-4 border-l-green-500 stat-card-emerald shine-effect">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Total Recebido no Período</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatarMoeda(recebimentosData.reduce((a, c) => a + c.valorRecebido, 0))}
                </p>
                <p className="text-sm text-muted-foreground">{recebimentosData.length} pagamento{recebimentosData.length !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-l-4 border-l-blue-500 stat-card-blue shine-effect">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Média por Pagamento</p>
                <p className="text-2xl font-bold">
                  {recebimentosData.length > 0
                    ? formatarMoeda(recebimentosData.reduce((a, c) => a + c.valorRecebido, 0) / recebimentosData.length)
                    : formatarMoeda(0)
                  }
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Recebimentos Mensais
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ChartContainer config={{ valor: { label: 'Recebido', color: '#16a34a' } }} className="h-[300px] w-full">
                  <BarChart data={recebimentosMonthly} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="mes" className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatarMoeda(value)} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="valor" fill="#16a34a" name="Recebido" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Histórico de Recebimentos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                    <TableHead className="text-right">Valor Recebido</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recebimentosData.slice(0, 50).map((c) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate('cobranca-detalhe', c.id)}>
                      <TableCell className="font-medium">{c.clienteNome}</TableCell>
                      <TableCell>{c.produtoIdentificador}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(c.dataPagamento)}</TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">{formatarMoeda(c.valorRecebido)}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROTAS */}
        <TabsContent value="rotas" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Route className="h-4 w-4" />
                Receita por Rota
              </CardTitle>
              <CardDescription>Agrupamento por rota de atendimento</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ChartContainer config={barChartConfig} className="h-[300px] w-full">
                  <BarChart data={rotasData.slice(0, 10)} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="rota" className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatarMoeda(value)} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="totalRecebido" fill="#16a34a" name="Recebido" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="totalValor" fill="#eab308" name="Total" radius={[4, 4, 0, 0]} stackId="a" />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Detalhamento por Rota</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rota</TableHead>
                    <TableHead className="text-right">Cobranças</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Recebido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rotasData.map((row) => (
                    <TableRow key={row.rota}>
                      <TableCell className="font-medium">Rota {row.rota}</TableCell>
                      <TableCell className="text-right">{row.totalCobrancas}</TableCell>
                      <TableCell className="text-right">{formatarMoeda(row.totalValor)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatarMoeda(row.totalRecebido)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMPARATIVO */}
        <TabsContent value="comparativo" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Comparativo Mensal
              </CardTitle>
              <CardDescription>Comparação com o ano anterior</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : (
                <ChartContainer config={lineChartConfig} className="h-[350px] w-full">
                  <LineChart data={comparativoData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="mes" className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatarMoeda(value)} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="atual" stroke="var(--color-atual)" strokeWidth={2} name="Ano Atual" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="anterior" stroke="var(--color-anterior)" strokeWidth={2} strokeDasharray="5 5" name="Ano Anterior" dot={{ r: 3 }} />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Comparação Detalhada</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Ano Atual</TableHead>
                    <TableHead className="text-right">Ano Anterior</TableHead>
                    <TableHead className="text-right">Variação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparativoData.map((row) => {
                    const variacao = row.anterior > 0 ? ((row.atual - row.anterior) / row.anterior) * 100 : 0
                    return (
                      <TableRow key={row.mes}>
                        <TableCell className="font-medium">{row.mes}</TableCell>
                        <TableCell className="text-right">{formatarMoeda(row.atual)}</TableCell>
                        <TableCell className="text-right">{formatarMoeda(row.anterior)}</TableCell>
                        <TableCell className="text-right">
                          {row.anterior > 0 ? (
                            <span className={variacao >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {variacao >= 0 ? <TrendingUp className="inline h-3 w-3 mr-1" /> : <TrendingDown className="inline h-3 w-3 mr-1" />}
                              {variacao.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
