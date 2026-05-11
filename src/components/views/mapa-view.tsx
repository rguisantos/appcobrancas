'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { MapPin, Users, TrendingUp, AlertTriangle, Layers, Navigation } from 'lucide-react'

const MapInner = dynamic(() => import('./map-inner'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] bg-muted animate-pulse rounded-lg flex items-center justify-center">
      <div className="text-center space-y-2">
        <MapPin className="h-8 w-8 text-muted-foreground mx-auto animate-bounce" />
        <p className="text-sm text-muted-foreground">Carregando mapa...</p>
      </div>
    </div>
  ),
})

interface ClienteMapa {
  id: string
  identificador: string
  nomeExibicao: string
  telefonePrincipal: string
  latitude: number | null
  longitude: number | null
  rotaId: string | null
  rota: { id: string; descricao: string; cor: string } | null
  locacoesAtivas: number
  totalRecebido: number
  totalPendente: number
}

interface RotaMapa {
  id: string
  descricao: string
  cor: string
  totalClientes: number
}

interface StatsMapa {
  totalClientes: number
  clientesComCoordenadas: number
  totalRecebido: number
  totalPendente: number
}

export function MapaView() {
  const [clientes, setClientes] = useState<ClienteMapa[]>([])
  const [rotas, setRotas] = useState<RotaMapa[]>([])
  const [stats, setStats] = useState<StatsMapa>({
    totalClientes: 0,
    clientesComCoordenadas: 0,
    totalRecebido: 0,
    totalPendente: 0,
  })
  const [loading, setLoading] = useState(true)
  const [hiddenRotas, setHiddenRotas] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/mapa')
        if (res.ok) {
          const data = await res.json()
          setClientes(data.clientes || [])
          setRotas(data.rotas || [])
          setStats(data.stats || { totalClientes: 0, clientesComCoordenadas: 0, totalRecebido: 0, totalPendente: 0 })
        }
      } catch (error) {
        console.error('Erro ao buscar dados do mapa:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const toggleRota = (rotaId: string) => {
    setHiddenRotas((prev) => {
      const next = new Set(prev)
      if (next.has(rotaId)) {
        next.delete(rotaId)
      } else {
        next.add(rotaId)
      }
      return next
    })
  }

  const filteredClientes = clientes.filter(
    (c) => c.latitude != null && c.longitude != null && !hiddenRotas.has(c.rotaId || '')
  )

  const statsCards = [
    {
      title: 'Total Clientes',
      value: stats.totalClientes.toString(),
      icon: <Users className="h-5 w-5" />,
      accent: 'border-l-4 border-l-blue-500',
      iconBg: 'bg-blue-100 dark:bg-blue-900',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Com Coordenadas',
      value: stats.clientesComCoordenadas.toString(),
      icon: <MapPin className="h-5 w-5" />,
      accent: 'border-l-4 border-l-green-500',
      iconBg: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Total Recebido',
      value: formatarMoeda(stats.totalRecebido),
      icon: <TrendingUp className="h-5 w-5" />,
      accent: 'border-l-4 border-l-emerald-500',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Total Pendente',
      value: formatarMoeda(stats.totalPendente),
      icon: <AlertTriangle className="h-5 w-5" />,
      accent: 'border-l-4 border-l-yellow-500',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
    },
  ]

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mapa de Rotas</h1>
          <p className="text-muted-foreground text-sm">
            Visualize clientes e rotas no mapa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{rotas.length} rota{rotas.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-7 w-20" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((card) => (
            <Card key={card.title} className={`shadow-sm ${card.accent}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-medium">{card.title}</p>
                    <p className="text-2xl font-bold">{card.value}</p>
                  </div>
                  <div className={`rounded-lg p-2.5 ${card.iconBg}`}>
                    <span className={card.iconColor}>{card.icon}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Legend */}
      {!loading && rotas.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-muted-foreground mr-1">Rotas:</span>
              {rotas.map((rota) => (
                <button
                  key={rota.id}
                  onClick={() => toggleRota(rota.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    hiddenRotas.has(rota.id)
                      ? 'opacity-40 border-muted-foreground/20 bg-muted'
                      : 'border-transparent shadow-sm'
                  }`}
                  style={{
                    backgroundColor: hiddenRotas.has(rota.id) ? undefined : rota.cor + '20',
                    color: hiddenRotas.has(rota.id) ? undefined : rota.cor,
                  }}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: rota.cor }}
                  />
                  {rota.descricao} ({rota.totalClientes})
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Route Stats Cards */}
      {!loading && rotas.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Estatísticas por Rota
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rotas.map((rota) => {
                const rotaClientes = clientes.filter(c => c.rotaId === rota.id)
                const rotaPendente = rotaClientes.reduce((acc, c) => acc + c.totalPendente, 0)
                const rotaRecebido = rotaClientes.reduce((acc, c) => acc + c.totalRecebido, 0)
                return (
                  <div
                    key={rota.id}
                    className={`rounded-lg border p-3 transition-all cursor-pointer hover:shadow-md ${
                      hiddenRotas.has(rota.id) ? 'opacity-40' : ''
                    }`}
                    style={{ borderLeftColor: rota.cor, borderLeftWidth: '4px' }}
                    onClick={() => toggleRota(rota.id)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: rota.cor }}
                      />
                      <span className="text-sm font-medium">{rota.descricao}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold">{rotaClientes.length}</p>
                        <p className="text-[10px] text-muted-foreground">Clientes</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-600">{formatarMoeda(rotaRecebido)}</p>
                        <p className="text-[10px] text-muted-foreground">Recebido</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-red-600">{formatarMoeda(rotaPendente)}</p>
                        <p className="text-[10px] text-muted-foreground">Pendente</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Closest route suggestion */}
            {(() => {
              const rotasComPendente = rotas
                .map(r => ({
                  ...r,
                  pendente: clientes.filter(c => c.rotaId === r.id).reduce((acc, c) => acc + c.totalPendente, 0)
                }))
                .filter(r => r.pendente > 0)
                .sort((a, b) => b.pendente - a.pendente)
              if (rotasComPendente.length > 0) {
                const sugestao = rotasComPendente[0]
                return (
                  <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-xs">
                      <span className="font-semibold">Rota sugerida: </span>
                      <span
                        className="font-bold"
                        style={{ color: sugestao.cor }}
                      >
                        {sugestao.descricao}
                      </span>
                      {' — '}maior volume pendente ({formatarMoeda(sugestao.pendente)})
                    </p>
                  </div>
                )
              }
              return null
            })()}
          </CardContent>
        </Card>
      )}

      {/* Map */}
      {!loading && (
        <MapInner clientes={filteredClientes} rotas={rotas} stats={stats} />
      )}
    </div>
  )
}
