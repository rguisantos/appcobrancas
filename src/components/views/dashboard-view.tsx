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
  Map as MapIcon,
  Sun,
  MoonStar,
  Sunrise,
  CalendarDays,
  BarChart2,
  Inbox,
  CalendarX,
  CircleDot,
  Table2,
  Disc3,
  Music,
  Wind,
  Gamepad2,
  Cigarette,
  Coffee,
  Trophy,
  Dices,
  Box,
  Plus,
  Pencil,
  Trash2,
  CreditCard,
  Activity,
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
  LineChart,
  Line,
  AreaChart,
  Area,
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
  cobrancasByFormaPagamento: Array<{ formaPagamento: string; quantidade: number }>
  clientesDivida: Array<{ id: string; nomeExibicao: string; divida: number }>
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

function StatusBadgePill({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    Pago: { label: 'Pago', bg: 'bg-emerald-100 dark:bg-emerald-900/50', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
    Pendente: { label: 'Pendente', bg: 'bg-amber-100 dark:bg-amber-900/50', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
    Atrasado: { label: 'Atrasado', bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
    Parcial: { label: 'Parcial', bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  }
  const c = config[status]
  if (!c) return <span className="status-badge bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">{status}</span>
  return (
    <span className={`status-badge ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

function getProductTypeStyle(tipoNome: string): {
  icon: React.ReactNode | null
  gradient: string
  iconBg: string
  iconColor: string
  barColor: string
} {
  const lowerName = tipoNome.toLowerCase()

  if (lowerName.includes('bilhar')) {
    return {
      icon: <Table2 className="h-4 w-4" />,
      gradient: 'from-emerald-50 to-emerald-100/60 dark:from-emerald-950 dark:to-emerald-900/40',
      iconBg: 'bg-emerald-200 dark:bg-emerald-800',
      iconColor: 'text-emerald-700 dark:text-emerald-300',
      barColor: '#16a34a',
    }
  }
  if (lowerName.includes('pebolim')) {
    return {
      icon: <Gamepad2 className="h-4 w-4" />,
      gradient: 'from-amber-50 to-amber-100/60 dark:from-amber-950 dark:to-amber-900/40',
      iconBg: 'bg-amber-200 dark:bg-amber-800',
      iconColor: 'text-amber-700 dark:text-amber-300',
      barColor: '#d97706',
    }
  }
  if (lowerName.includes('jukebox') || lowerName.includes('música') || lowerName.includes('musica')) {
    return {
      icon: <Music className="h-4 w-4" />,
      gradient: 'from-rose-50 to-rose-100/60 dark:from-rose-950 dark:to-rose-900/40',
      iconBg: 'bg-rose-200 dark:bg-rose-800',
      iconColor: 'text-rose-700 dark:text-rose-300',
      barColor: '#e11d48',
    }
  }
  if (lowerName.includes('air hockey') || lowerName.includes('hockey')) {
    return {
      icon: <Wind className="h-4 w-4" />,
      gradient: 'from-sky-50 to-sky-100/60 dark:from-sky-950 dark:to-sky-900/40',
      iconBg: 'bg-sky-200 dark:bg-sky-800',
      iconColor: 'text-sky-700 dark:text-sky-300',
      barColor: '#0284c7',
    }
  }
  if (lowerName.includes('fumaça') || lowerName.includes('fumaca') || lowerName.includes('cigarro')) {
    return {
      icon: <Cigarette className="h-4 w-4" />,
      gradient: 'from-violet-50 to-violet-100/60 dark:from-violet-950 dark:to-violet-900/40',
      iconBg: 'bg-violet-200 dark:bg-violet-800',
      iconColor: 'text-violet-700 dark:text-violet-300',
      barColor: '#7c3aed',
    }
  }
  if (lowerName.includes('café') || lowerName.includes('cafe')) {
    return {
      icon: <Coffee className="h-4 w-4" />,
      gradient: 'from-orange-50 to-orange-100/60 dark:from-orange-950 dark:to-orange-900/40',
      iconBg: 'bg-orange-200 dark:bg-orange-800',
      iconColor: 'text-orange-700 dark:text-orange-300',
      barColor: '#ea580c',
    }
  }
  if (lowerName.includes('dart') || lowerName.includes('dardo')) {
    return {
      icon: <Trophy className="h-4 w-4" />,
      gradient: 'from-teal-50 to-teal-100/60 dark:from-teal-950 dark:to-teal-900/40',
      iconBg: 'bg-teal-200 dark:bg-teal-800',
      iconColor: 'text-teal-700 dark:text-teal-300',
      barColor: '#0d9488',
    }
  }
  if (lowerName.includes('box') || lowerName.includes('caixa')) {
    return {
      icon: <Box className="h-4 w-4" />,
      gradient: 'from-slate-50 to-slate-100/60 dark:from-slate-950 dark:to-slate-900/40',
      iconBg: 'bg-slate-200 dark:bg-slate-700',
      iconColor: 'text-slate-700 dark:text-slate-300',
      barColor: '#475569',
    }
  }
  if (lowerName.includes('pinball') || lowerName.includes('fliperama')) {
    return {
      icon: <Dices className="h-4 w-4" />,
      gradient: 'from-pink-50 to-pink-100/60 dark:from-pink-950 dark:to-pink-900/40',
      iconBg: 'bg-pink-200 dark:bg-pink-800',
      iconColor: 'text-pink-700 dark:text-pink-300',
      barColor: '#db2777',
    }
  }
  if (lowerName.includes('discoteca') || lowerName.includes('disco') || lowerName.includes('totem')) {
    return {
      icon: <Disc3 className="h-4 w-4" />,
      gradient: 'from-fuchsia-50 to-fuchsia-100/60 dark:from-fuchsia-950 dark:to-fuchsia-900/40',
      iconBg: 'bg-fuchsia-200 dark:bg-fuchsia-800',
      iconColor: 'text-fuchsia-700 dark:text-fuchsia-300',
      barColor: '#c026d3',
    }
  }
  // Default fallback
  return {
    icon: <CircleDot className="h-4 w-4" />,
    gradient: 'from-gray-50 to-gray-100/60 dark:from-gray-900 dark:to-gray-800/40',
    iconBg: 'bg-gray-200 dark:bg-gray-700',
    iconColor: 'text-gray-700 dark:text-gray-300',
    barColor: '#6b7280',
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

const FORMA_PGTO_COLORS = ['#7c3aed', '#0ea5e9', '#f59e0b', '#16a34a', '#ef4444']

const formaPagamentoChartConfig: ChartConfig = {
  Periodo: { label: 'Período', color: '#7c3aed' },
  PercentualPagar: { label: '% a Pagar', color: '#0ea5e9' },
  PercentualReceber: { label: '% a Receber', color: '#f59e0b' },
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

  // Product status cards state
  const [productTypes, setProductTypes] = useState<Array<{
    tipoNome: string
    total: number
    locados: number
  }> | null>(null)

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

  // Fetch products for type distribution cards
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/produtos?limit=100')
        if (res.ok) {
          const json = await res.json()
          const produtos: Array<{
            tipoNome: string
            locacoes: Array<{ status: string; deletedAt: string | null }>
          }> = json.data || []

          // Group by tipoNome
          const typeMap = new Map<string, { total: number; locados: number }>()
          for (const p of produtos) {
            const existing = typeMap.get(p.tipoNome) || { total: 0, locados: 0 }
            existing.total += 1
            if (p.locacoes && p.locacoes.some((l) => l.status === 'Ativa' && !l.deletedAt)) {
              existing.locados += 1
            }
            typeMap.set(p.tipoNome, existing)
          }

          const types = Array.from(typeMap.entries()).map(([tipoNome, counts]) => ({
            tipoNome,
            total: counts.total,
            locados: counts.locados,
          }))

          setProductTypes(types)
        }
      } catch (error) {
        console.error('Erro ao buscar produtos:', error)
      }
    }
    fetchProducts()
  }, [])

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
      gradient: 'bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/40 dark:to-card',
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
      gradient: 'bg-gradient-to-br from-sky-50/80 to-white dark:from-sky-950/40 dark:to-card',
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
      gradient: 'bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-950/40 dark:to-card',
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
      gradient: 'bg-gradient-to-br from-rose-50/80 to-white dark:from-rose-950/40 dark:to-card',
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
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 gradient-border-animated rounded-xl bg-card p-4"
      >
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800 p-3 shadow-md">
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
          <Card className="shadow-sm border-2 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 shine-effect">
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
            <Card className={`shadow-sm hover:shadow-md transition-shadow ${kpi.accent} ${kpi.gradient} shine-effect`}>
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
                  <div className={`rounded-xl p-2.5 shadow-sm ${kpi.iconBg}`}>
                    <span className={kpi.iconColor}>{kpi.icon}</span>
                  </div>
                </div>
                {/* Progress bar */}
                {kpi.progress !== undefined && (
                  <div className="mt-3">
                    <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full progress-animated"
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
            className="hover-lift cursor-pointer group border-0 bg-gradient-to-br from-emerald-100 to-emerald-200/80 dark:from-emerald-900 dark:to-emerald-800/80 hover:from-emerald-200 hover:to-emerald-300 dark:hover:from-emerald-800 dark:hover:to-emerald-700"
            onClick={() => navigate('cobranca-nova')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-emerald-300/80 dark:bg-emerald-700 p-3 shadow-md group-hover:scale-105 transition-transform">
                <PlusCircle className="h-6 w-6 text-emerald-800 dark:text-emerald-200" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Nova Cobrança</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Criar cobrança</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="hover-lift cursor-pointer group border-0 bg-gradient-to-br from-sky-100 to-sky-200/80 dark:from-sky-900 dark:to-sky-800/80 hover:from-sky-200 hover:to-sky-300 dark:hover:from-sky-800 dark:hover:to-sky-700"
            onClick={() => navigate('cliente-novo')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-sky-300/80 dark:bg-sky-700 p-3 shadow-md group-hover:scale-105 transition-transform">
                <UserPlus className="h-6 w-6 text-sky-800 dark:text-sky-200" />
              </div>
              <div>
                <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">Novo Cliente</p>
                <p className="text-[10px] text-sky-600 dark:text-sky-400">Cadastrar cliente</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="hover-lift cursor-pointer group border-0 bg-gradient-to-br from-amber-100 to-amber-200/80 dark:from-amber-900 dark:to-amber-800/80 hover:from-amber-200 hover:to-amber-300 dark:hover:from-amber-800 dark:hover:to-amber-700"
            onClick={() => navigate('relatorios')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-amber-300/80 dark:bg-amber-700 p-3 shadow-md group-hover:scale-105 transition-transform">
                <BarChart3 className="h-6 w-6 text-amber-800 dark:text-amber-200" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Ver Relatórios</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400">Análises e dados</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="hover-lift cursor-pointer group border-0 bg-gradient-to-br from-rose-100 to-rose-200/80 dark:from-rose-900 dark:to-rose-800/80 hover:from-rose-200 hover:to-rose-300 dark:hover:from-rose-800 dark:hover:to-rose-700"
            onClick={() => navigate('mapa')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-rose-300/80 dark:bg-rose-700 p-3 shadow-md group-hover:scale-105 transition-transform">
                <MapIcon className="h-6 w-6 text-rose-800 dark:text-rose-200" />
              </div>
              <div>
                <p className="text-sm font-semibold text-rose-900 dark:text-rose-100">Mapa de Rotas</p>
                <p className="text-[10px] text-rose-600 dark:text-rose-400">Visualizar mapa</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Monthly Comparison Widget */}
      <div className="section-divider" />
      <MonthlyComparisonWidget />

      {/* Próximos Vencimentos Widget */}
      <ProximosVencimentosWidget navigate={navigate} />

      {/* Atividade Recente */}
      <RecentActivityFeed navigate={navigate} />

      {/* Resumo Financeiro */}
      <div className="section-divider" />
      <FinancialOverviewWidget data={data} />

      {/* Charts Section */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6"
        variants={chartVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Revenue Trend Area Chart - 12 months */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Tendência de Receita
            </CardTitle>
            <CardDescription>Últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barChartConfig} className="h-[220px] sm:h-[280px] w-full">
              {data.receitaMensal.length > 0 && data.receitaMensal.some(d => d.valor > 0) ? (
              <AreaChart data={data.receitaMensal} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="mes" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => [formatarMoeda(value), 'Receita']}
                  contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  fill="url(#revenueGradient)"
                  dot={{ fill: '#16a34a', r: 4, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#16a34a' }}
                />
              </AreaChart>
              ) : (
                <div className="flex flex-col items-center justify-center h-[220px] sm:h-[280px] text-muted-foreground">
                  <BarChart2 className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm font-medium">Nenhum dado disponível</p>
                  <p className="text-xs mt-1">Os dados de receita aparecerão aqui</p>
                </div>
              )}
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Payment Method Distribution Pie Chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-violet-600" />
              Cobranças por Forma de Pagamento
            </CardTitle>
            <CardDescription>Distribuição por método de pagamento</CardDescription>
          </CardHeader>
          <CardContent>
            {data.cobrancasByFormaPagamento && data.cobrancasByFormaPagamento.length > 0 ? (
              <ChartContainer config={formaPagamentoChartConfig} className="h-[220px] sm:h-[280px] w-full">
                <PieChart>
                  <Pie
                    data={data.cobrancasByFormaPagamento}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="quantidade"
                    nameKey="formaPagamento"
                    label={({ formaPagamento, percent }: { formaPagamento: string; percent: number }) =>
                      `${formaPagamento} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {data.cobrancasByFormaPagamento.map((entry, index) => (
                      <Cell
                        key={entry.formaPagamento}
                        fill={FORMA_PGTO_COLORS[index % FORMA_PGTO_COLORS.length]}
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
              <div className="flex flex-col items-center justify-center h-[220px] sm:h-[280px] text-muted-foreground">
                <CreditCard className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm font-medium">Nenhum dado disponível</p>
                <p className="text-xs mt-1">Os dados de pagamento aparecerão aqui</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Client Debt Ranking + Cobranças by Status */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        {/* Client Debt Ranking - Horizontal Bar Chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Top 5 Clientes Inadimplentes
            </CardTitle>
            <CardDescription>Maiores dívidas pendentes</CardDescription>
          </CardHeader>
          <CardContent>
            {data.clientesDivida && data.clientesDivida.length > 0 ? (
              <div className="space-y-3">
                {data.clientesDivida.map((cliente, idx) => {
                  const maxDivida = data.clientesDivida[0]?.divida || 1
                  const pct = (cliente.divida / maxDivida) * 100
                  const colors = [
                    'bg-red-500',
                    'bg-orange-500',
                    'bg-amber-500',
                    'bg-yellow-500',
                    'bg-emerald-500',
                  ]
                  return (
                    <div
                      key={cliente.id}
                      className="cursor-pointer rounded-lg p-3 hover:bg-muted/50 transition-colors"
                      onClick={() => navigate('cliente-detalhe', cliente.id)}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold text-white ${colors[idx] || colors[4]}`}>
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium truncate max-w-[150px]">{cliente.nomeExibicao}</span>
                        </div>
                        <span className="text-sm font-bold text-red-600 dark:text-red-400">
                          {formatarMoeda(cliente.divida)}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${colors[idx] || colors[4]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <Users className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm font-medium">Nenhuma inadimplência</p>
                <p className="text-xs mt-1">Todos os clientes estão em dia</p>
              </div>
            )}
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
              <div className="flex flex-col items-center justify-center h-[220px] sm:h-[280px] text-muted-foreground">
                <Inbox className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm font-medium">Nenhum dado disponível</p>
                <p className="text-xs mt-1">As cobranças por status aparecerão aqui</p>
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
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {data.cobrancasRecentes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Inbox className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma cobrança encontrada</p>
                </div>
              ) : (
                <>
                  {/* Header row */}
                  <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 pb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b">
                    <span>Cliente / Produto</span>
                    <span>Valor</span>
                    <span>Status</span>
                  </div>
                  {data.cobrancasRecentes.map((c, idx) => (
                    <div
                      key={c.id}
                      className={`grid grid-cols-[1fr_auto_auto] gap-3 items-center py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer ${getStatusBorderColor(c.status)} ${idx % 2 === 1 ? 'bg-muted/20' : ''}`}
                      onClick={() => navigate('cobranca-detalhe', c.id)}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.clienteNome}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.produtoIdentificador} · <span className="text-[10px]">{getRelativeTime(c.createdAt)}</span>
                        </p>
                      </div>
                      <span className="text-sm font-semibold">{formatarMoeda(c.totalClientePaga)}</span>
                      <StatusBadgePill status={c.status} />
                    </div>
                  ))}
                </>
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

      {/* Top Clientes Ranking */}
      <TopClientsWidget navigate={navigate} />

      {/* Produtos por Tipo Section */}
      {productTypes && productTypes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-600" />
                Produtos por Tipo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {productTypes.map((pt) => {
                  const occupation = pt.total > 0 ? (pt.locados / pt.total) * 100 : 0
                  const { icon, gradient, iconBg, iconColor, barColor } = getProductTypeStyle(pt.tipoNome)

                  return (
                    <div
                      key={pt.tipoNome}
                      className={`rounded-xl p-4 border-0 bg-gradient-to-br ${gradient} hover:shadow-md transition-shadow cursor-pointer`}
                      onClick={() => navigate('produtos')}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`rounded-lg p-2 ${iconBg}`}>
                          {icon && <span className={iconColor}>{icon}</span>}
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">
                          {pt.tipoNome}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-bold">{pt.total}</span>
                          <span className="text-xs text-muted-foreground">produtos</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {pt.locados} locado{pt.locados !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {/* Occupation progress bar */}
                      <div className="mt-3">
                        <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min(occupation, 100)}%`,
                              backgroundColor: barColor,
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {occupation.toFixed(0)}% ocupação
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

function TopClientsWidget({ navigate }: { navigate: (view: string, id?: string | null) => void }) {
  const [topClients, setTopClients] = useState<Array<{
    id: string
    nomeExibicao: string
    identificador: string
    totalReceita: number
  }> | null>(null)

  useEffect(() => {
    async function fetchTopClients() {
      try {
        const [clientesRes, cobrancasRes] = await Promise.all([
          fetch('/api/clientes?limit=100'),
          fetch('/api/cobrancas?limit=1000'),
        ])
        if (!clientesRes.ok || !cobrancasRes.ok) return

        const clientesJson = await clientesRes.json()
        const cobrancasJson = await cobrancasRes.json()

        const clientes: Array<{ id: string; nomeExibicao: string; identificador: string }> = clientesJson.data || []
        const cobrancas: Array<{ clienteId: string; status: string; totalClientePaga: number; valorRecebido: number }> = cobrancasJson.data || []

        // Build revenue map per client
        const revenueMap = new Map<string, number>()
        for (const c of cobrancas) {
          if (c.status === 'Pago' || c.status === 'Parcial') {
            const current = revenueMap.get(c.clienteId) || 0
            revenueMap.set(c.clienteId, current + (c.valorRecebido || 0))
          }
        }

        // Combine with client info and sort
        const ranked = clientes
          .map((cl) => ({
            id: cl.id,
            nomeExibicao: cl.nomeExibicao,
            identificador: cl.identificador,
            totalReceita: revenueMap.get(cl.id) || 0,
          }))
          .filter((cl) => cl.totalReceita > 0)
          .sort((a, b) => b.totalReceita - a.totalReceita)
          .slice(0, 5)

        setTopClients(ranked)
      } catch {
        // silently ignore
      }
    }
    fetchTopClients()
  }, [])

  const maxRevenue = topClients && topClients.length > 0 ? topClients[0].totalReceita : 0

  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#6b7280', '#6b7280']
  const rankBg = ['bg-yellow-100 dark:bg-yellow-900/50', 'bg-gray-100 dark:bg-gray-800/50', 'bg-orange-100 dark:bg-orange-900/50', 'bg-slate-100 dark:bg-slate-800/50', 'bg-slate-100 dark:bg-slate-800/50']
  const rankText = ['text-yellow-700 dark:text-yellow-300', 'text-gray-600 dark:text-gray-300', 'text-orange-700 dark:text-orange-300', 'text-slate-600 dark:text-slate-300', 'text-slate-600 dark:text-slate-300']

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.5 }}
    >
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Top Clientes
          </CardTitle>
          <CardDescription>Maiores receitas por cliente</CardDescription>
        </CardHeader>
        <CardContent>
          {!topClients ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : topClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm font-medium">Nenhum dado disponível</p>
              <p className="text-xs mt-1">Os top clientes aparecerão aqui quando houver receitas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topClients.map((client, idx) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 80, duration: 0.3 }}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate('cliente-detalhe', client.id)}
                >
                  {/* Rank number */}
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${rankBg[idx]} ${rankText[idx]}`}
                    style={idx < 3 ? { boxShadow: `0 0 0 2px ${rankColors[idx]}40` } : undefined}
                  >
                    {idx + 1}
                  </div>
                  {/* Client info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{client.nomeExibicao}</p>
                      <span className="text-sm font-bold shrink-0 ml-2">{formatarMoeda(client.totalReceita)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{client.identificador}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full progress-animated"
                          style={{
                            width: `${maxRevenue > 0 ? (client.totalReceita / maxRevenue) * 100 : 0}%`,
                            backgroundColor: rankColors[idx],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
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

function FinancialOverviewWidget({ data }: { data: DashboardData }) {
  const [financialData, setFinancialData] = useState<{
    totalReceita: number
    totalPendente: number
    totalAtrasado: number
  } | null>(null)

  useEffect(() => {
    async function fetchFinancialData() {
      try {
        const res = await fetch('/api/cobrancas?limit=1000')
        if (res.ok) {
          const json = await res.json()
          const items: Array<{
            status: string
            totalClientePaga: number
            valorRecebido: number
          }> = json.data || []

          let totalReceita = 0
          let totalPendente = 0
          let totalAtrasado = 0

          for (const c of items) {
            if (c.status === 'Pago') {
              totalReceita += c.valorRecebido || 0
            } else if (c.status === 'Parcial') {
              totalReceita += c.valorRecebido || 0
              totalPendente += (c.totalClientePaga - c.valorRecebido)
            } else if (c.status === 'Pendente') {
              totalPendente += c.totalClientePaga
            } else if (c.status === 'Atrasado') {
              totalAtrasado += (c.totalClientePaga - c.valorRecebido)
            }
          }

          setFinancialData({ totalReceita, totalPendente, totalAtrasado })
        }
      } catch {
        // silently ignore
      }
    }
    fetchFinancialData()
  }, [data])

  const totalReceita = financialData?.totalReceita ?? data.ganhoAtualMes
  const totalPendente = financialData?.totalPendente ?? 0
  const totalAtrasado = financialData?.totalAtrasado ?? data.totalAtrasadoValor
  const totalGeral = totalReceita + totalPendente + totalAtrasado
  const inadimplencia = totalGeral > 0 ? (totalAtrasado / totalGeral) * 100 : 0
  const receivedRatio = totalGeral > 0 ? (totalReceita / totalGeral) * 100 : 0
  const pendingRatio = totalGeral > 0 ? (totalPendente / totalGeral) * 100 : 0

  const financialMetrics = [
    {
      label: 'Total Receita',
      value: formatarMoeda(totalReceita),
      icon: <DollarSign className="h-4 w-4" />,
      iconBg: 'bg-emerald-100 dark:bg-emerald-900',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      accent: 'border-l-4 border-l-emerald-500',
    },
    {
      label: 'Total Pendente',
      value: formatarMoeda(totalPendente),
      icon: <Clock className="h-4 w-4" />,
      iconBg: 'bg-amber-100 dark:bg-amber-900',
      iconColor: 'text-amber-600 dark:text-amber-400',
      accent: 'border-l-4 border-l-amber-500',
    },
    {
      label: 'Total Atrasado',
      value: formatarMoeda(totalAtrasado),
      icon: <AlertTriangle className="h-4 w-4" />,
      iconBg: 'bg-red-100 dark:bg-red-900',
      iconColor: 'text-red-600 dark:text-red-400',
      accent: 'border-l-4 border-l-red-500',
    },
    {
      label: '% Inadimplência',
      value: `${inadimplencia.toFixed(1)}%`,
      icon: <TrendingDown className="h-4 w-4" />,
      iconBg: 'bg-rose-100 dark:bg-rose-900',
      iconColor: 'text-rose-600 dark:text-rose-400',
      accent: 'border-l-4 border-l-rose-500',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
    >
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            Resumo Financeiro
          </CardTitle>
          <CardDescription>Visão geral das finanças</CardDescription>
        </CardHeader>
        <CardContent>
          {!financialData ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {financialMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className={`p-3 rounded-lg bg-card border ${metric.accent}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`rounded-md p-1.5 ${metric.iconBg}`}>
                        <span className={metric.iconColor}>{metric.icon}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                    </div>
                    <p className="text-lg font-bold">{metric.value}</p>
                  </div>
                ))}
              </div>

              {/* Progress bar showing received vs pending ratio */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Recebido vs. Pendente</span>
                  <span className="font-medium">
                    {receivedRatio.toFixed(0)}% recebido
                  </span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                  {receivedRatio > 0 && (
                    <div
                      className="h-full bg-emerald-500 transition-all duration-700"
                      style={{ width: `${Math.min(receivedRatio, 100)}%`, borderRadius: receivedRatio >= 100 ? '9999px' : '9999px 0 0 9999px' }}
                    />
                  )}
                  {pendingRatio > 0 && (
                    <div
                      className="h-full bg-amber-400 transition-all duration-700"
                      style={{ width: `${Math.min(pendingRatio, 100 - receivedRatio)}%` }}
                    />
                  )}
                  {inadimplencia > 0 && (
                    <div
                      className="h-full bg-red-500 transition-all duration-700"
                      style={{ width: `${Math.min(inadimplencia, 100 - receivedRatio - pendingRatio)}%`, borderRadius: (receivedRatio + pendingRatio + inadimplencia) >= 99.9 ? '0 9999px 9999px 0' : undefined }}
                    />
                  )}
                </div>
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Recebido
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    Pendente
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Atrasado
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function ProximosVencimentosWidget({ navigate }: { navigate: (view: string, id?: string | null) => void }) {
  const [vencimentos, setVencimentos] = useState<Array<{
    id: string
    clienteNome: string
    produtoIdentificador: string
    totalClientePaga: number
    valorRecebido: number
    status: string
    dataVencimento: string | null
  }> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchVencimentos() {
      try {
        const res = await fetch('/api/cobrancas?limit=500')
        if (res.ok) {
          const json = await res.json()
          const items: Array<{
            id: string
            clienteNome: string
            produtoIdentificador: string
            totalClientePaga: number
            valorRecebido: number
            status: string
            dataVencimento: string | null
          }> = json.data || []

          const now = new Date()
          const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

          const upcoming = items
            .filter((c) => {
              if (c.status === 'Pago') return false
              if (!c.dataVencimento) return false
              try {
                const vencDate = new Date(c.dataVencimento)
                return vencDate >= now && vencDate <= sevenDaysFromNow
              } catch {
                return false
              }
            })
            .sort((a, b) => {
              if (!a.dataVencimento || !b.dataVencimento) return 0
              return new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime()
            })
            .slice(0, 5)

          setVencimentos(upcoming)
        }
      } catch {
        // silently ignore
      } finally {
        setLoading(false)
      }
    }
    fetchVencimentos()
  }, [])

  const getDaysUntil = (dateStr: string): number => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const target = new Date(dateStr)
    target.setHours(0, 0, 0, 0)
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getUrgencyColor = (days: number) => {
    if (days <= 1) return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50'
    if (days <= 3) return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50'
    return 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
    >
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-amber-100 dark:bg-amber-900 p-2">
                <CalendarDays className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-base">Próximos Vencimentos</CardTitle>
                <CardDescription>Cobranças vencendo nos próximos 7 dias</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate('agenda')}
            >
              Ver agenda <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !vencimentos || vencimentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarX className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum vencimento nos próximos 7 dias</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Tudo em dia por enquanto</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {vencimentos.map((c) => {
                const daysUntil = c.dataVencimento ? getDaysUntil(c.dataVencimento) : 0
                const urgencyClass = getUrgencyColor(daysUntil)
                const saldo = c.totalClientePaga - c.valorRecebido

                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate('cobranca-detalhe', c.id)}
                  >
                    <div className={`shrink-0 px-2 py-1 rounded-md text-xs font-bold ${urgencyClass}`}>
                      {daysUntil === 0 ? 'Hoje' : daysUntil === 1 ? 'Amanhã' : `${daysUntil}d`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.clienteNome}</p>
                      <p className="text-xs text-muted-foreground">{c.produtoIdentificador}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{formatarMoeda(saldo)}</p>
                      <StatusBadgePill status={c.status} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function MonthlyComparisonWidget() {
  const [monthData, setMonthData] = useState<{ thisMonth: number; lastMonth: number; thisMonthLabel: string; lastMonthLabel: string } | null>(null)
  const [hasData, setHasData] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMonthlyData() {
      try {
        // Fetch ALL cobranças and group by dataInicio month
        const res = await fetch('/api/cobrancas?limit=1000')
        if (!res.ok) {
          setHasData(false)
          return
        }

        const json = await res.json()
        const items: Array<{ valorRecebido: number; dataInicio: string }> = json.data || []

        if (items.length === 0) {
          setHasData(false)
          return
        }

        // Group by month from dataInicio
        const now = new Date()
        const thisYear = now.getFullYear()
        const thisMonth = now.getMonth() // 0-based

        // Previous month
        const prevDate = new Date(thisYear, thisMonth - 1, 1)
        const prevYear = prevDate.getFullYear()
        const prevMonth = prevDate.getMonth()

        const thisMonthKey = `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}`
        const lastMonthKey = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`

        let thisMonthTotal = 0
        let lastMonthTotal = 0

        for (const c of items) {
          const monthKey = c.dataInicio?.substring(0, 7) // "YYYY-MM"
          if (monthKey === thisMonthKey) {
            thisMonthTotal += c.valorRecebido || 0
          } else if (monthKey === lastMonthKey) {
            lastMonthTotal += c.valorRecebido || 0
          }
        }

        // If no data for either month, find the two most recent months with data
        if (thisMonthTotal === 0 && lastMonthTotal === 0) {
          const monthMap = new Map<string, number>()
          for (const c of items) {
            const monthKey = c.dataInicio?.substring(0, 7)
            if (monthKey) {
              monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + (c.valorRecebido || 0))
            }
          }

          const sortedMonths = Array.from(monthMap.entries()).sort((a, b) => b[0].localeCompare(a[0]))

          if (sortedMonths.length >= 2) {
            thisMonthTotal = sortedMonths[0][1]
            lastMonthTotal = sortedMonths[1][1]
            setMonthData({
              thisMonth: thisMonthTotal,
              lastMonth: lastMonthTotal,
              thisMonthLabel: formatMonthLabel(sortedMonths[0][0]),
              lastMonthLabel: formatMonthLabel(sortedMonths[1][0]),
            })
            return
          } else if (sortedMonths.length === 1) {
            setMonthData({
              thisMonth: sortedMonths[0][1],
              lastMonth: 0,
              thisMonthLabel: formatMonthLabel(sortedMonths[0][0]),
              lastMonthLabel: '—',
            })
            return
          }

          setHasData(false)
          return
        }

        const thisMonthLabel = now.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        const lastMonthLabel = prevDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })

        setMonthData({
          thisMonth: thisMonthTotal,
          lastMonth: lastMonthTotal,
          thisMonthLabel,
          lastMonthLabel,
        })
      } catch (error) {
        console.error('Erro ao buscar dados mensais:', error)
        setHasData(false)
      } finally {
        setLoading(false)
      }
    }

    fetchMonthlyData()
  }, [])

  const percentageChange = monthData && monthData.lastMonth > 0
    ? ((monthData.thisMonth - monthData.lastMonth) / monthData.lastMonth) * 100
    : monthData && monthData.thisMonth > 0 ? 100 : 0

  const isUp = percentageChange >= 0

  // Bar visualization proportions
  const maxVal = monthData ? Math.max(monthData.thisMonth, monthData.lastMonth, 1) : 1
  const thisMonthBarHeight = monthData ? (monthData.thisMonth / maxVal) * 100 : 0
  const lastMonthBarHeight = monthData ? (monthData.lastMonth / maxVal) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
    >
      <Card className="shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-teal-100 dark:bg-teal-900 p-2">
                <CalendarDays className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Comparativo Mensal</h3>
                <p className="text-[10px] text-muted-foreground">Receita recebida por mês</p>
              </div>
            </div>
            {monthData && !loading && monthData.thisMonth > 0 && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                isUp
                  ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
              }`}>
                {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {isUp ? '+' : ''}{percentageChange.toFixed(1)}%
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-end gap-4 h-20">
              <Skeleton className="flex-1 h-full" />
              <Skeleton className="flex-1 h-3/4" />
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <CalendarX className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Sem dados no período</p>
              <p className="text-[10px] text-muted-foreground/60">Nenhuma cobrança registrada</p>
            </div>
          ) : monthData ? (
            <>
              <div className="flex items-end gap-4 h-20 mb-3">
                {/* This month bar */}
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: '60px' }}>
                    <div
                      className="w-full max-w-[60px] rounded-t-md bg-teal-500 dark:bg-teal-600 transition-all duration-700"
                      style={{ height: `${Math.max(thisMonthBarHeight, 4)}%` }}
                    />
                  </div>
                </div>
                {/* Last month bar */}
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: '60px' }}>
                    <div
                      className="w-full max-w-[60px] rounded-t-md bg-muted-foreground/20 dark:bg-muted-foreground/30 transition-all duration-700"
                      style={{ height: `${Math.max(lastMonthBarHeight, 4)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-teal-500" />
                    <span className="text-xs text-muted-foreground">{monthData.thisMonthLabel}</span>
                  </div>
                  <span className="text-sm font-semibold">{formatarMoeda(monthData.thisMonth)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                    <span className="text-xs text-muted-foreground">{monthData.lastMonthLabel}</span>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">{formatarMoeda(monthData.lastMonth)}</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Erro ao carregar comparativo</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function formatMonthLabel(monthKey: string): string {
  // monthKey is "YYYY-MM"
  const [year, month] = monthKey.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

interface AuditLogEntry {
  id: string
  acao: string
  entidade: string
  entidadeId: string | null
  entidadeNome: string | null
  createdAt: string
  usuario: {
    id: string
    nome: string
    email: string
  } | null
}

function getAuditActionLabel(acao: string): string {
  if (acao.includes('criar') || acao.includes('criacao') || acao.includes('novo')) return 'Criação'
  if (acao.includes('atualizar') || acao.includes('editar') || acao.includes('alterar')) return 'Atualização'
  if (acao.includes('excluir') || acao.includes('remover') || acao.includes('deletar')) return 'Exclusão'
  if (acao.includes('pagamento') || acao.includes('registrar_pagamento')) return 'Pagamento'
  if (acao.includes('login') || acao.includes('acesso')) return 'Acesso'
  return 'Ação'
}

function getAuditEntityLabel(entidade: string): string {
  const map: Record<string, string> = {
    cliente: 'Cliente',
    produto: 'Produto',
    locacao: 'Locação',
    cobranca: 'Cobrança',
    manutencao: 'Manutenção',
    rota: 'Rota',
    usuario: 'Usuário',
    meta: 'Meta',
    relogio: 'Relógio',
  }
  return map[entidade] || entidade
}

function getAuditIcon(acao: string) {
  if (acao.includes('criar') || acao.includes('criacao') || acao.includes('novo')) return Plus
  if (acao.includes('atualizar') || acao.includes('editar') || acao.includes('alterar')) return Pencil
  if (acao.includes('excluir') || acao.includes('remover') || acao.includes('deletar')) return Trash2
  if (acao.includes('pagamento') || acao.includes('registrar_pagamento')) return CreditCard
  return Activity
}

function getAuditDotColor(acao: string): string {
  if (acao.includes('criar') || acao.includes('criacao') || acao.includes('novo') || acao.includes('pagamento') || acao.includes('registrar_pagamento')) return 'bg-green-500'
  if (acao.includes('atualizar') || acao.includes('editar') || acao.includes('alterar')) return 'bg-amber-500'
  if (acao.includes('excluir') || acao.includes('remover') || acao.includes('deletar')) return 'bg-red-500'
  return 'bg-slate-400'
}

function getAuditNavView(entidade: string): string | null {
  const map: Record<string, string> = {
    cliente: 'cliente-detalhe',
    produto: 'produto-detalhe',
    locacao: 'locacao-detalhe',
    cobranca: 'cobranca-detalhe',
    manutencao: 'manutencoes',
    rota: 'admin-rotas',
    usuario: 'admin-usuarios',
    meta: 'admin-metas',
    relogio: 'relogios',
  }
  return map[entidade] || null
}

function RecentActivityFeed({ navigate }: { navigate: (view: string, id?: string | null) => void }) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch('/api/auditoria?limit=10')
        if (res.ok) {
          const data = await res.json()
          setLogs(data.data || [])
        }
      } catch {
        // silently ignore
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
    >
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-violet-100 dark:bg-violet-900 p-2">
                <Activity className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-base">Atividade Recente</CardTitle>
                <CardDescription>Últimas ações no sistema</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate('admin-auditoria')}
            >
              Ver todas <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
            </div>
          ) : (
            <div className="space-y-0 max-h-96 overflow-y-auto">
              {logs.map((log, idx) => {
                const Icon = getAuditIcon(log.acao)
                const dotColor = getAuditDotColor(log.acao)
                const actionLabel = getAuditActionLabel(log.acao)
                const entityLabel = getAuditEntityLabel(log.entidade)
                const navView = getAuditNavView(log.entidade)
                const isLast = idx === logs.length - 1

                const avatarBg = log.acao.includes('criar') || log.acao.includes('criacao') || log.acao.includes('novo')
                  ? 'bg-emerald-100 dark:bg-emerald-900/60'
                  : log.acao.includes('pagamento') || log.acao.includes('registrar_pagamento')
                    ? 'bg-teal-100 dark:bg-teal-900/60'
                    : log.acao.includes('atualizar') || log.acao.includes('editar') || log.acao.includes('alterar')
                      ? 'bg-amber-100 dark:bg-amber-900/60'
                      : log.acao.includes('excluir') || log.acao.includes('remover') || log.acao.includes('deletar')
                        ? 'bg-red-100 dark:bg-red-900/60'
                        : 'bg-slate-100 dark:bg-slate-800/60'
                const avatarIconColor = log.acao.includes('criar') || log.acao.includes('criacao') || log.acao.includes('novo')
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : log.acao.includes('pagamento') || log.acao.includes('registrar_pagamento')
                    ? 'text-teal-600 dark:text-teal-400'
                    : log.acao.includes('atualizar') || log.acao.includes('editar') || log.acao.includes('alterar')
                      ? 'text-amber-600 dark:text-amber-400'
                      : log.acao.includes('excluir') || log.acao.includes('remover') || log.acao.includes('deletar')
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-600 dark:text-slate-400'

                return (
                  <div
                    key={log.id}
                    className={`flex items-start gap-3 py-3 ${!isLast ? 'border-b border-border/50' : ''} ${navView && log.entidadeId ? 'cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors' : ''}`}
                    onClick={() => {
                      if (navView && log.entidadeId) {
                        navigate(navView, log.entidadeId)
                      }
                    }}
                  >
                    {/* Avatar with icon */}
                    <div className="relative shrink-0">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${avatarBg}`}>
                        <Icon className={`h-3.5 w-3.5 ${avatarIconColor}`} />
                      </div>
                      {!isLast && (
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-px h-[calc(100%+0px)] bg-border/30" style={{ height: 'calc(100% + 12px)' }} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {actionLabel} em {entityLabel}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {log.entidadeNome && (
                          <span className="text-xs text-muted-foreground truncate">
                            {log.entidadeNome}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          · {getRelativeTime(log.createdAt)}
                        </span>
                      </div>
                      {log.usuario && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-primary">{log.usuario.nome?.charAt(0) || '?'}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            por {log.usuario.nome}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right dot indicator */}
                    <div className={`h-2 w-2 rounded-full ${dotColor} shrink-0 mt-3`} />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
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
