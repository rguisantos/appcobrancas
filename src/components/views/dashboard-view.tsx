'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigation } from '@/lib/store/navigation'
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  Users,
  Package,
  FileText,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
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
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

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
      accent: 'border-l-4 border-l-green-500',
      iconBg: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-600 dark:text-green-400',
      subtitle: 'Receita recebida no mês',
    },
    {
      title: 'Clientes Ativos',
      rawValue: data.totalClientes,
      displayValue: <CountUpValue value={data.totalClientes} />,
      icon: <Users className="h-5 w-5" />,
      accent: 'border-l-4 border-l-blue-500',
      iconBg: 'bg-blue-100 dark:bg-blue-900',
      iconColor: 'text-blue-600 dark:text-blue-400',
      subtitle: 'Total de clientes ativos',
    },
    {
      title: 'Produtos Locados',
      rawValue: data.produtosLocados,
      displayValue: `${data.produtosLocados}/${data.totalProdutos}`,
      icon: <Package className="h-5 w-5" />,
      accent: 'border-l-4 border-l-orange-500',
      iconBg: 'bg-orange-100 dark:bg-orange-900',
      iconColor: 'text-orange-600 dark:text-orange-400',
      subtitle: 'Locados vs. disponíveis',
    },
    {
      title: 'Cobranças Pendentes',
      rawValue: data.cobrancasPendentes,
      displayValue: <CountUpValue value={data.cobrancasPendentes} />,
      icon: <FileText className="h-5 w-5" />,
      accent: 'border-l-4 border-l-red-500',
      iconBg: 'bg-red-100 dark:bg-red-900',
      iconColor: 'text-red-600 dark:text-red-400',
      subtitle: 'Pendentes e atrasadas',
    },
  ]

  const formatLastUpdated = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header with last updated and refresh */}
      <div className="flex items-center justify-between">
        <div />
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
      </div>

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
            <Card className={`shadow-sm ${kpi.accent} transition-shadow`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-medium">{kpi.title}</p>
                    <p className="text-2xl font-bold">{kpi.displayValue}</p>
                    <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
                  </div>
                  <div className={`rounded-lg p-2.5 ${kpi.iconBg}`}>
                    <span className={kpi.iconColor}>{kpi.icon}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

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
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate('cobranca-detalhe', c.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.clienteNome}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.produtoIdentificador} · {c.dataInicio} a {c.dataFim}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <span className="text-sm font-semibold">{formatarMoeda(c.totalClientePaga)}</span>
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
