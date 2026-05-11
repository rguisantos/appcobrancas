'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigation } from '@/lib/store/navigation'
import { useAuth } from '@/lib/store/auth'
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  DollarSign,
  Users,
  Package,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Clock,
  Zap,
  PlusCircle,
  UserPlus,
  BarChart3,
  Map,
  Sun,
  MoonStar,
  Sunrise,
} from 'lucide-react'
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
} from 'recharts'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'

interface DashboardData {
  ganhoAtualMes: number
  totalClientes: number
  produtosLocados: number
  totalProdutos: number
  locacoesAtivas: number
  cobrancasPendentes: number
  cobrancasAtrasadas: number
  totalAtrasadoValor: number
  clientesNaoCobrados: Array<{
    id: string
    identificador: string
    nomeExibicao: string
    telefonePrincipal: string
    rota: { descricao: string; cor: string } | null
  }>
  receitaMensal: Array<{ mes: string; valor: number }>
  cobrancasByStatus: Array<{ status: string; quantidade: number }>
  cobrancasRecentes: Array<{
    id: string
    clienteNome: string
    produtoIdentificador: string
    totalClientePaga: number
    status: string
    createdAt: string
    dataInicio: string
    dataFim: string
  }>
}

const PIE_COLORS = ['#16a34a', '#eab308', '#f97316', '#ef4444', '#8b5cf6']

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getGreetingIcon() {
  const hour = new Date().getHours()
  if (hour < 12) return Sunrise
  if (hour < 18) return Sun
  return MoonStar
}

function formatDatePT() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
}

function getRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'agora mesmo'
  if (diffMins < 60) return `há ${diffMins} min`
  if (diffHours < 24) return `há ${diffHours}h`
  if (diffDays === 1) return 'há 1 dia'
  if (diffDays < 30) return `há ${diffDays} dias`
  return `há ${Math.floor(diffDays / 30)} mês${Math.floor(diffDays / 30) > 1 ? 'es' : ''}`
}

function getStatusBorderColor(status: string): string {
  switch (status) {
    case 'Pago': return 'border-l-4 border-l-green-500'
    case 'Pendente': return 'border-l-4 border-l-yellow-500'
    case 'Atrasado': return 'border-l-4 border-l-red-500'
    case 'Parcial': return 'border-l-4 border-l-orange-500'
    default: return 'border-l-4 border-l-gray-400'
  }
}

const barChartConfig: ChartConfig = {
  valor: {
    label: 'Receita',
    color: '#16a34a',
  },
}

const pieChartConfig: ChartConfig = {
  Pago: { label: 'Pago', color: '#16a34a' },
  Pendente: { label: 'Pendente', color: '#eab308' },
  Parcial: { label: 'Parcial', color: '#f97316' },
  Atrasado: { label: 'Atrasado', color: '#ef4444' },
}

function useCountUp(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const startTime = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      setCount(Math.floor(progress * end))
      if (progress >= 1) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [end, duration])
  return count
}

function CountUpValue({ value, isCurrency = false }: { value: number; isCurrency?: boolean }) {
  const count = useCountUp(value, 1000)
  if (isCurrency) {
    return <>{formatarMoeda(count)}</>
  }
  return <>{count.toLocaleString('pt-BR')}</>
}

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 100,
      duration: 0.5,
      ease: 'easeOut',
    },
  }),
}

const chartVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 400,
      duration: 0.5,
      ease: 'easeOut',
    },
  },
}

const bottomVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 600,
      duration: 0.5,
      ease: 'easeOut',
    },
  },
}

export function DashboardView() {
  const { navigate } = useNavigation()
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [processingVencimento, setProcessingVencimento] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Erro ao buscar dashboard:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleProcessarVencimentos = async () => {
    setProcessingVencimento(true)
    try {
      const res = await fetch('/api/cron/vencimento', { method: 'POST' })
      if (res.ok) {
        const result = await res.json()
        if (result.updated > 0) {
          toast.success(`${result.updated} cobrança(s) marcada(s) como atrasada(s)`)
        } else {
          toast.info('Nenhuma cobrança vencida encontrada')
        }
        fetchData()
      } else {
        toast.error('Erro ao processar vencimentos')
      }
    } catch (error) {
      console.error('Erro ao processar vencimentos:', error)
      toast.error('Erro ao processar vencimentos')
    } finally {
      setProcessingVencimento(false)
    }
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <p className="text-muted-foreground">Erro ao carregar dados do dashboard.</p>
      </div>
    )
  }

  const kpiCards = [
    {
      title: 'Ganhos do Mês',
      rawValue: data.ganhoAtualMes,
      displayValue: <CountUpValue value={data.ganhoAtualMes} isCurrency />,
      icon: <DollarSign className="h-5 w-5" />,
      accent: 'border-t-4 border-t-emerald-500',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      subtitle: 'Receita recebida no mês',
      trend: 12,
      progress: data.totalAtrasadoValor > 0 ? Math.max(0, Math.min(100, ((data.ganhoAtualMes) / (data.ganhoAtualMes + data.totalAtrasadoValor)) * 100)) : 100,
      progressColor: '#16a34a',
      progressLabel: `${data.totalAtrasadoValor > 0 ? ((data.ganhoAtualMes / (data.ganhoAtualMes + data.totalAtrasadoValor)) * 100).toFixed(0) : 100}% da receita recebida`,
    },
    {
      title: 'Clientes Ativos',
      rawValue: data.totalClientes,
      displayValue: <CountUpValue value={data.totalClientes} />,
      icon: <Users className="h-5 w-5" />,
      accent: 'border-t-4 border-t-sky-500',
      iconBg: 'bg-sky-100 dark:bg-sky-900',
      iconColor: 'text-sky-600 dark:text-sky-400',
      subtitle: `${data.clientesNaoCobrados.length} sem cobrança`,
      trend: undefined,
      progress: data.totalClientes > 0 ? Math.max(0, 100 - (data.clientesNaoCobrados.length / data.totalClientes) * 100) : 0,
      progressColor: '#0ea5e9',
      progressLabel: `${data.totalClientes > 0 ? (100 - (data.clientesNaoCobrados.length / data.totalClientes) * 100).toFixed(0) : 0}% com cobrança`,
    },
    {
      title: 'Produtos Locados',
      rawValue: data.produtosLocados,
      displayValue: `${data.produtosLocados}/${data.totalProdutos}`,
      icon: <Package className="h-5 w-5" />,
      accent: 'border-t-4 border-t-amber-500',
      iconBg: 'bg-amber-100 dark:bg-amber-900',
      iconColor: 'text-amber-600 dark:text-amber-400',
      subtitle: 'Locados vs. disponíveis',
      trend: undefined,
      progress: data.totalProdutos > 0 ? (data.produtosLocados / data.totalProdutos) * 100 : 0,
      progressColor: '#f59e0b',
      progressLabel: `${data.totalProdutos > 0 ? ((data.produtosLocados / data.totalProdutos) * 100).toFixed(0) : 0}% de ocupação`,
    },
    {
      title: 'Cobranças Pendentes',
      rawValue: data.cobrancasPendentes,
      displayValue: <CountUpValue value={data.cobrancasPendentes} />,
      icon: <FileText className="h-5 w-5" />,
      accent: 'border-t-4 border-t-rose-500',
      iconBg: 'bg-rose-100 dark:bg-rose-900',
      iconColor: 'text-rose-600 dark:text-rose-400',
      subtitle: `${data.cobrancasAtrasadas} atrasada${data.cobrancasAtrasadas !== 1 ? 's' : ''}`,
      trend: data.cobrancasAtrasadas > 0 ? -5 : undefined,
      progress: undefined,
    },
  ]

  const formatLastUpdated = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // Greeting info
  const GreetingIcon = getGreetingIcon()
  const userName = user?.nome?.split(' ')[0] || 'Usuário'

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Welcome Greeting Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800 p-3">
            <GreetingIcon className="h-7 w-7 text-emerald-600 dark:text-emerald-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {getGreeting()}, {userName}!
            </h1>
            <p className="text-sm text-muted-foreground capitalize">{formatDatePT()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Você tem <span className="font-semibold text-yellow-600 dark:text-yellow-400">{data.cobrancasPendentes} cobrança{data.cobrancasPendentes !== 1 ? 's' : ''} pendente{data.cobrancasPendentes !== 1 ? 's' : ''}</span> e <span className="font-semibold text-red-600 dark:text-red-400">{data.cobrancasAtrasadas} atrasada{data.cobrancasAtrasadas !== 1 ? 's' : ''}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Atualizado às {formatLastUpdated(lastUpdated)}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </motion.div>

      {/* Cobranças Vencidas Warning Banner */}
      {data.cobrancasAtrasadas > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="shadow-sm border-2 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-red-100 dark:bg-red-900 p-2.5">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                      Cobranças Vencidas
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {data.cobrancasAtrasadas} cobrança{data.cobrancasAtrasadas !== 1 ? 's' : ''} atrasada{data.cobrancasAtrasadas !== 1 ? 's' : ''} — Total: {formatarMoeda(data.totalAtrasadoValor)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={handleProcessarVencimentos}
                  disabled={processingVencimento}
                >
                  <Zap className={`h-3.5 w-3.5 ${processingVencimento ? 'animate-pulse' : ''}`} />
                  {processingVencimento ? 'Processando...' : 'Atualizar Vencimentos'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            custom={index}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Card className={`shadow-sm hover:shadow-md transition-shadow ${kpi.accent}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground font-medium">{kpi.title}</p>
                      {kpi.trend && (
                        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${kpi.trend > 0 ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'}`}>
                          {kpi.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {kpi.trend > 0 ? '+' : ''}{kpi.trend}%
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-bold">{kpi.displayValue}</p>
                    <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
                  </div>
                  <div className={`rounded-lg p-2.5 ${kpi.iconBg}`}>
                    <span className={kpi.iconColor}>{kpi.icon}</span>
                  </div>
                </div>
                {/* Progress bar */}
                {kpi.progress !== undefined && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.min(kpi.progress, 100)}%`,
                          backgroundColor: kpi.progressColor || 'var(--color-valor, #16a34a)',
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{kpi.progressLabel}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card
            className="shadow-sm hover:shadow-md transition-all cursor-pointer group border-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 hover:from-emerald-100 hover:to-emerald-200 dark:hover:from-emerald-900 dark:hover:to-emerald-800"
            onClick={() => navigate('cobranca-nova')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-200 dark:bg-emerald-800 p-2 group-hover:scale-110 transition-transform">
                <PlusCircle className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Nova Cobrança</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Criar cobrança</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="shadow-sm hover:shadow-md transition-all cursor-pointer group border-0 bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-950 dark:to-sky-900 hover:from-sky-100 hover:to-sky-200 dark:hover:from-sky-900 dark:hover:to-sky-800"
            onClick={() => navigate('cliente-novo')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-xl bg-sky-200 dark:bg-sky-800 p-2 group-hover:scale-110 transition-transform">
                <UserPlus className="h-5 w-5 text-sky-700 dark:text-sky-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">Novo Cliente</p>
                <p className="text-[10px] text-sky-600 dark:text-sky-400">Cadastrar cliente</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="shadow-sm hover:shadow-md transition-all cursor-pointer group border-0 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 hover:from-amber-100 hover:to-amber-200 dark:hover:from-amber-900 dark:hover:to-amber-800"
            onClick={() => navigate('relatorios')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-xl bg-amber-200 dark:bg-amber-800 p-2 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-5 w-5 text-amber-700 dark:text-amber-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Ver Relatórios</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400">Análises e dados</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="shadow-sm hover:shadow-md transition-all cursor-pointer group border-0 bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950 dark:to-rose-900 hover:from-rose-100 hover:to-rose-200 dark:hover:from-rose-900 dark:hover:to-rose-800"
            onClick={() => navigate('mapa')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-xl bg-rose-200 dark:bg-rose-800 p-2 group-hover:scale-110 transition-transform">
                <Map className="h-5 w-5 text-rose-700 dark:text-rose-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-rose-900 dark:text-rose-100">Mapa de Rotas</p>
                <p className="text-[10px] text-rose-600 dark:text-rose-400">Visualizar mapa</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Charts Section */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6"
        variants={chartVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Monthly Revenue Bar Chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Receita Mensal
            </CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barChartConfig} className="h-[220px] sm:h-[280px] w-full">
              <BarChart data={data.receitaMensal} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="mes" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis className="text-xs" tick={{ fontSize: 12 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => [formatarMoeda(value), 'Receita']}
                  contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="valor" fill="var(--color-valor)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Cobranças by Status Pie Chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Cobranças por Status
            </CardTitle>
            <CardDescription>Distribuição atual</CardDescription>
          </CardHeader>
          <CardContent>
            {data.cobrancasByStatus.length > 0 ? (
              <ChartContainer config={pieChartConfig} className="h-[220px] sm:h-[280px] w-full">
                <PieChart>
                  <Pie
                    data={data.cobrancasByStatus}
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
                    {data.cobrancasByStatus.map((entry, index) => (
                      <Cell
                        key={entry.status}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] sm:h-[280px] text-muted-foreground text-sm">
                Nenhuma cobrança registrada
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom Section */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6"
        variants={bottomVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Recent Activity */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Cobranças Recentes</CardTitle>
                <CardDescription>Últimas cobranças criadas</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => navigate('cobrancas')}
              >
                Ver todas <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.cobrancasRecentes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma cobrança encontrada</p>
              ) : (
                data.cobrancasRecentes.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer ${getStatusBorderColor(c.status)}`}
                    onClick={() => navigate('cobranca-detalhe', c.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.clienteNome}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.produtoIdentificador} · {c.dataInicio} a {c.dataFim}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-semibold">{formatarMoeda(c.totalClientePaga)}</span>
                        <p className="text-[10px] text-muted-foreground">{getRelativeTime(c.createdAt)}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Clientes Não Cobrados */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Clientes Não Cobrados
                </CardTitle>
                <CardDescription>Sem cobranças nos últimos 30 dias</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => navigate('clientes')}
              >
                Ver todos <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.clientesNaoCobrados.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Todos os clientes foram cobrados recentemente
                </p>
              ) : (
                data.clientesNaoCobrados.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate('cliente-detalhe', c.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.nomeExibicao}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.identificador} · {c.telefonePrincipal}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      {c.rota && (
                        <BadgeWithColor
                          label={c.rota.descricao}
                          color={c.rota.cor}
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

function BadgeWithColor({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border-0"
      style={{
        backgroundColor: `${color}20`,
        color: color,
      }}
    >
      {label}
    </span>
  )
}

function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[220px] sm:h-[280px] w-full" />
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[220px] sm:h-[280px] w-full" />
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-44" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
