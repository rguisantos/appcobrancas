'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { MapPin, Users, TrendingUp, AlertTriangle, Layers, Navigation, MapPinned, Route, ChevronDown, ChevronUp, Filter, Search, Crosshair, LocateFixed } from 'lucide-react'

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

interface UltimaCobranca {
  id: string
  status: string
  totalClientePaga: number
  valorRecebido: number
  saldoDevedor: number
  dataVencimento: string | null
  dataFim: string
}

interface LocacaoDetalhe {
  id: string
  produtoIdentificador: string
  produtoTipo: string
  ultimaCobranca: UltimaCobranca | null
}

interface CobrancasResumo {
  pendente: number
  atrasado: number
  pago: number
  parcial: number
}

interface ClienteMapa {
  id: string
  identificador: string
  nomeExibicao: string
  telefonePrincipal: string
  latitude: number | null
  longitude: number | null
  rotaId: string | null
  rota: { id: string; descricao: string; cor: string } | null
  locacoesAtivas: string[]
  locacoesDetalhes: LocacaoDetalhe[]
  cobrancasResumo: CobrancasResumo
  totalRecebido: number
  totalPendente: number
  temAtrasado: boolean
  pendenteCobranca: boolean
}

interface ClienteSemCoordenada {
  id: string
  identificador: string
  nomeExibicao: string
  telefonePrincipal: string
  rotaId: string | null
  rota: { id: string; descricao: string; cor: string } | null
  cobrancasResumo: CobrancasResumo
  totalPendente: number
  temAtrasado: boolean
  pendenteCobranca: boolean
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
  const [clientesSemCoordenadas, setClientesSemCoordenadas] = useState<ClienteSemCoordenada[]>([])
  const [rotas, setRotas] = useState<RotaMapa[]>([])
  const [stats, setStats] = useState<StatsMapa>({
    totalClientes: 0,
    clientesComCoordenadas: 0,
    totalRecebido: 0,
    totalPendente: 0,
  })
  const [loading, setLoading] = useState(true)
  const [hiddenRotas, setHiddenRotas] = useState<Set<string>>(new Set())
  const [showRouteLines, setShowRouteLines] = useState(false)
  const [showSemCoordenadas, setShowSemCoordenadas] = useState(false)
  const [selectedRotaId, setSelectedRotaId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [locateClientId, setLocateClientId] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locatingUser, setLocatingUser] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const rotaParam = selectedRotaId !== 'all' ? `?rotaId=${selectedRotaId}` : ''
        const res = await fetch(`/api/mapa${rotaParam}`)
        if (res.ok) {
          const data = await res.json()
          setClientes(data.clientes || [])
          setClientesSemCoordenadas(data.clientesSemCoordenadas || [])
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
  }, [selectedRotaId])

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

  // Search matching
  const searchLower = searchQuery.toLowerCase().trim()
  const matchingClientIds = searchLower
    ? new Set(
        filteredClientes
          .filter((c) => c.nomeExibicao.toLowerCase().includes(searchLower) || c.identificador.toLowerCase().includes(searchLower))
          .map((c) => c.id)
      )
    : null // null means no search active (all visible)

  const handleLocalizar = useCallback(() => {
    if (!searchLower) return
    const firstMatch = filteredClientes.find(
      (c) => c.nomeExibicao.toLowerCase().includes(searchLower) || c.identificador.toLowerCase().includes(searchLower)
    )
    if (firstMatch) {
      setLocateClientId(firstMatch.id)
      // Reset after a short delay so it can be triggered again
      setTimeout(() => setLocateClientId(null), 2000)
    }
  }, [searchLower, filteredClientes])

  const handleMinhaLocalizacao = useCallback(() => {
    if (!navigator.geolocation) {
      return
    }
    setLocatingUser(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setLocatingUser(false)
      },
      () => {
        setLocatingUser(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // All active clients for route stats (includes those without coordinates)
  const allClientesForStats = [...clientes, ...clientesSemCoordenadas]

  const statsCards = [
    {
      title: 'Total Clientes',
      value: stats.totalClientes.toString(),
      icon: <Users className="h-5 w-5" />,
      accent: 'border-l-4 border-l-blue-500',
      gradient: 'stat-card-blue',
      iconBg: 'bg-blue-100 dark:bg-blue-900',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Com Coordenadas',
      value: stats.clientesComCoordenadas.toString(),
      icon: <MapPin className="h-5 w-5" />,
      accent: 'border-l-4 border-l-emerald-500',
      gradient: 'stat-card-emerald',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Total Recebido',
      value: formatarMoeda(stats.totalRecebido),
      icon: <TrendingUp className="h-5 w-5" />,
      accent: 'border-l-4 border-l-emerald-500',
      gradient: 'stat-card-emerald',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Total Pendente',
      value: formatarMoeda(stats.totalPendente),
      icon: <AlertTriangle className="h-5 w-5" />,
      accent: 'border-l-4 border-l-red-500',
      gradient: 'stat-card-red',
      iconBg: 'bg-red-100 dark:bg-red-900',
      iconColor: 'text-red-600 dark:text-red-400',
    },
  ]

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Mapa de Rotas</h1>
          <p className="text-muted-foreground text-sm">
            Visualize clientes e rotas no mapa
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Route lines toggle */}
          <button
            onClick={() => setShowRouteLines(!showRouteLines)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              showRouteLines
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-muted text-muted-foreground border-muted-foreground/20'
            }`}
          >
            <Route className="h-3.5 w-3.5" />
            Rotas
          </button>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{rotas.length} rota{rotas.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Search Bar + Location Buttons */}
      {!loading && (
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente pelo nome ou ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-4 h-9 text-sm"
                />
              </div>
              {/* Localizar button */}
              <button
                onClick={handleLocalizar}
                disabled={!searchLower}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LocateFixed className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Localizar</span>
              </button>
              {/* Minha Localização button */}
              <button
                onClick={handleMinhaLocalizacao}
                disabled={locatingUser}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Crosshair className={`h-3.5 w-3.5 ${locatingUser ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{locatingUser ? 'Localizando...' : 'Minha Localização'}</span>
                <span className="sm:hidden">{locatingUser ? '...' : 'Localização'}</span>
              </button>
            </div>
            {searchLower && matchingClientIds && (
              <div className="mt-2 text-xs text-muted-foreground">
                {matchingClientIds.size === 0 ? (
                  <span className="text-amber-600 dark:text-amber-400">Nenhum cliente encontrado</span>
                ) : (
                  <span>{matchingClientIds.size} cliente{matchingClientIds.size !== 1 ? 's' : ''} encontrado{matchingClientIds.size !== 1 ? 's' : ''}</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Route Filter + Status Legend */}
      {!loading && (
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
              {/* Route Filter */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Filtrar Rota:</span>
                </div>
                <Select value={selectedRotaId} onValueChange={setSelectedRotaId}>
                  <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm">
                    <SelectValue placeholder="Todas as Rotas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Rotas</SelectItem>
                    {rotas.map((rota) => (
                      <SelectItem key={rota.id} value={rota.id}>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: rota.cor }}
                          />
                          {rota.descricao} ({rota.totalClientes})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-10 bg-border" />

              {/* Status Legend */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Status dos Pins:</span>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: '#22c55e' }} />
                    <span className="text-xs font-medium">Pago</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: '#ef4444' }} />
                    <span className="text-xs font-medium">Devendo/Atrasado</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: '#f97316' }} />
                    <span className="text-xs font-medium">Pagamento Parcial</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded-full shrink-0 border-2 border-yellow-400" style={{ backgroundColor: '#eab308' }} />
                    <span className="text-xs font-medium">Pendente de Cobrança</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            <Card key={card.title} className={`shadow-sm ${card.accent} ${card.gradient}`}>
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-medium">{card.title}</p>
                    <p className="text-xl sm:text-2xl font-bold">{card.value}</p>
                  </div>
                  <div className={`rounded-lg p-2 sm:p-2.5 ${card.iconBg}`}>
                    <span className={card.iconColor}>{card.icon}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Clients without coordinates warning */}
      {!loading && clientesSemCoordenadas.length > 0 && (
        <Card className="shadow-sm border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <button
              onClick={() => setShowSemCoordenadas(!showSemCoordenadas)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="rounded-lg p-2 bg-amber-100 dark:bg-amber-900">
                  <MapPinned className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    {clientesSemCoordenadas.length} cliente{clientesSemCoordenadas.length !== 1 ? 's' : ''} sem coordenadas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Adicione localização para visualizá-los no mapa
                  </p>
                </div>
              </div>
              {showSemCoordenadas ? (
                <ChevronUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              )}
            </button>

            {showSemCoordenadas && (
              <div className="mt-3 max-h-64 overflow-y-auto custom-scrollbar">
                <div className="space-y-1.5">
                  {clientesSemCoordenadas.map((cliente) => (
                    <div
                      key={cliente.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cliente.rota?.cor || '#6b7280' }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{cliente.nomeExibicao}</p>
                          <p className="text-[10px] text-muted-foreground">ID: {cliente.identificador}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {cliente.pendenteCobranca && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                            Pend. cobrança
                          </span>
                        )}
                        {cliente.temAtrasado && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                            {cliente.cobrancasResumo.atrasado} atrasado
                          </span>
                        )}
                        {cliente.totalPendente > 0 && (
                          <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                            {formatarMoeda(cliente.totalPendente)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      {!loading && rotas.length > 0 && selectedRotaId === 'all' && (
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm font-semibold text-muted-foreground mr-1">Rotas:</span>
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
      {!loading && rotas.length > 0 && selectedRotaId === 'all' && (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Estatísticas por Rota
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rotas.map((rota) => {
                const rotaClientes = allClientesForStats.filter(c => c.rotaId === rota.id)
                const rotaPendente = rotaClientes.reduce((acc, c) => acc + c.totalPendente, 0)
                const rotaRecebido = rotaClientes.reduce((acc, c) => acc + c.totalRecebido, 0)
                const rotaAtrasados = rotaClientes.filter(c => c.temAtrasado).length
                const rotaPendCobranca = rotaClientes.filter(c => c.pendenteCobranca).length
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
                    {(rotaAtrasados > 0 || rotaPendCobranca > 0) && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {rotaAtrasados > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400">
                            <AlertTriangle className="h-3 w-3" />
                            {rotaAtrasados} atrasado{rotaAtrasados > 1 ? 's' : ''}
                          </div>
                        )}
                        {rotaPendCobranca > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-yellow-600 dark:text-yellow-400">
                            <AlertTriangle className="h-3 w-3" />
                            {rotaPendCobranca} pend. cobrança
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {/* Closest route suggestion */}
            {(() => {
              const rotasComPendente = rotas
                .map(r => ({
                  ...r,
                  pendente: allClientesForStats.filter(c => c.rotaId === r.id).reduce((acc, c) => acc + c.totalPendente, 0)
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
        <MapInner
          clientes={filteredClientes}
          rotas={rotas}
          stats={stats}
          showRouteLines={showRouteLines}
          selectedRotaId={selectedRotaId}
          matchingClientIds={matchingClientIds}
          locateClientId={locateClientId}
          userLocation={userLocation}
        />
      )}
    </div>
  )
}
