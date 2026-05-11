'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { useNavigation } from '@/lib/store/navigation'

// Fix default marker icon
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = defaultIcon

// Blue user location icon
const userLocationIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  className: 'user-location-marker',
})

// Status color constants
const STATUS_COLORS = {
  pago: '#22c55e',       // Green
  atrasado: '#ef4444',   // Red
  parcial: '#f97316',    // Orange
  pendenteCobranca: '#eab308', // Yellow
  pendente: '#eab308',   // Yellow (smaller)
  neutro: '#6b7280',     // Gray
} as const

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

interface MapInnerProps {
  clientes: ClienteMapa[]
  rotas: RotaMapa[]
  stats: StatsMapa
  showRouteLines?: boolean
  selectedRotaId?: string
  matchingClientIds?: Set<string> | null
  locateClientId?: string | null
  userLocation?: { lat: number; lng: number } | null
}

type PinStatus = 'pendenteCobranca' | 'atrasado' | 'parcial' | 'pago' | 'pendente' | 'neutro'

/**
 * Determine pin status with priority:
 * 1. pendenteCobranca (has active locações but no cobrança this month) — HIGHEST
 * 2. atrasado (any cobrança is Atrasado)
 * 3. parcial (any cobrança is Parcial)
 * 4. pago (all cobranças are Pago)
 * 5. pendente (all cobranças are Pendente, not yet due)
 * 6. neutro (no cobranças and no active locações)
 */
function getPinStatus(cliente: ClienteMapa): PinStatus {
  if (cliente.pendenteCobranca) return 'pendenteCobranca'
  if (cliente.cobrancasResumo.atrasado > 0) return 'atrasado'
  if (cliente.cobrancasResumo.parcial > 0) return 'parcial'
  if (cliente.cobrancasResumo.pago > 0 && cliente.cobrancasResumo.pendente === 0 && cliente.cobrancasResumo.atrasado === 0 && cliente.cobrancasResumo.parcial === 0) return 'pago'
  if (cliente.cobrancasResumo.pendente > 0) return 'pendente'
  return 'neutro'
}

function getPinColor(status: PinStatus): string {
  return STATUS_COLORS[status] || STATUS_COLORS.neutro
}

function getPinRadius(status: PinStatus): number {
  if (status === 'pendenteCobranca') return 14 // Larger pin
  if (status === 'atrasado') return 12
  if (status === 'parcial') return 10
  if (status === 'pago') return 8
  if (status === 'pendente') return 9
  return 7
}

function getStatusLabel(status: PinStatus): string {
  switch (status) {
    case 'pendenteCobranca': return 'Pendente de Cobrança'
    case 'atrasado': return 'Devendo/Atrasado'
    case 'parcial': return 'Pagamento Parcial'
    case 'pago': return 'Pago'
    case 'pendente': return 'Pendente'
    case 'neutro': return 'Sem cobranças'
  }
}

function getCobrancaStatusLabel(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case 'Pago': return { label: 'Pago', color: '#166534', bg: '#dcfce7' }
    case 'Atrasado': return { label: 'Atrasado', color: '#991b1b', bg: '#fee2e2' }
    case 'Parcial': return { label: 'Parcial', color: '#9a3412', bg: '#ffedd5' }
    case 'Pendente': return { label: 'Pendente', color: '#92400e', bg: '#fef3c7' }
    default: return { label: status, color: '#6b7280', bg: '#f3f4f6' }
  }
}

// Component to handle map flyTo animations
function MapController({ locateClientId, userLocation, clientes }: {
  locateClientId: string | null
  userLocation: { lat: number; lng: number } | null
  clientes: ClienteMapa[]
}) {
  const map = useMap()
  const prevLocateId = useRef<string | null>(null)
  const prevUserLoc = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (locateClientId && locateClientId !== prevLocateId.current) {
      const client = clientes.find((c) => c.id === locateClientId)
      if (client && client.latitude != null && client.longitude != null) {
        map.flyTo([client.latitude, client.longitude], 16, { duration: 1.2 })
      }
      prevLocateId.current = locateClientId
    }
  }, [locateClientId, clientes, map])

  useEffect(() => {
    if (userLocation && (!prevUserLoc.current || prevUserLoc.current.lat !== userLocation.lat || prevUserLoc.current.lng !== userLocation.lng)) {
      map.flyTo([userLocation.lat, userLocation.lng], 15, { duration: 1.2 })
      prevUserLoc.current = userLocation
    }
  }, [userLocation, map])

  return null
}

export default function MapInner({
  clientes,
  rotas,
  showRouteLines = false,
  selectedRotaId = 'all',
  matchingClientIds = null,
  locateClientId = null,
  userLocation = null,
}: MapInnerProps) {
  const { navigate } = useNavigation()

  // Center on Campo Grande, MS
  const center: [number, number] = [-20.44, -54.64]
  const zoom = 12

  // Build a map of rotaId -> cor for quick lookup
  const rotaCorMap: Record<string, string> = {}
  rotas.forEach((r) => {
    rotaCorMap[r.id] = r.cor
  })

  // Build route polylines: connect clients in the same route (ordered by identifier)
  const routePolylines = (() => {
    if (!showRouteLines) return []
    return rotas.map((rota) => {
      const rotaClientes = clientes
        .filter((c) => c.rotaId === rota.id && c.latitude != null && c.longitude != null)
        .sort((a, b) => a.identificador.localeCompare(b.identificador))
        .map((c) => [c.latitude!, c.longitude!] as [number, number])
      return {
        rotaId: rota.id,
        cor: rota.cor,
        positions: rotaClientes,
      }
    }).filter((r) => r.positions.length >= 2)
  })()

  // Format phone for tel: link
  const formatPhoneLink = (phone: string) => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length >= 10) {
      return `tel:+55${digits}`
    }
    return `tel:${phone}`
  }

  // Format WhatsApp link with pre-filled message
  const getWhatsAppLink = (cliente: ClienteMapa) => {
    const digits = cliente.telefonePrincipal.replace(/\D/g, '')
    const phone = digits.length >= 10 ? `55${digits}` : digits
    const pendente = cliente.totalPendente > 0
      ? `\n\nValor pendente: ${formatarMoeda(cliente.totalPendente)}`
      : ''
    const message = `Olá ${cliente.nomeExibicao}! Aqui é da equipe de cobranças.${pendente}\nGostaríamos de verificar a situação do seu pagamento.`
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  }

  useEffect(() => {
    // Force Leaflet to recalculate map size after mounting
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Inject CSS animation for pulsing markers and glow effects
  useEffect(() => {
    const styleId = 'map-pulse-styles'
    if (document.getElementById(styleId)) return
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes map-pulse-ring {
        0% { transform: scale(1); opacity: 0.8; }
        100% { transform: scale(2.5); opacity: 0; }
      }
      @keyframes map-pend-cobranca-pulse {
        0% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.15); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes map-glow-pulse {
        0% { box-shadow: 0 0 6px 2px currentColor; opacity: 0.8; }
        50% { box-shadow: 0 0 12px 4px currentColor; opacity: 0.4; }
        100% { box-shadow: 0 0 6px 2px currentColor; opacity: 0.8; }
      }
      .leaflet-popup-content-wrapper {
        border-radius: 12px !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
      }
      .leaflet-popup-content {
        margin: 12px 16px !important;
        line-height: 1.4 !important;
      }
      .map-popup-btn {
        display: block;
        width: 100%;
        text-align: center;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
        border: none;
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
      }
      .map-popup-btn:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      .map-popup-btn-whatsapp {
        display: block;
        width: 100%;
        text-align: center;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
        border: none;
        background: #25D366;
        color: #fff;
      }
      .map-popup-btn-whatsapp:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      .map-popup-btn-cobranca {
        display: block;
        width: 100%;
        text-align: center;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
        border: none;
        background: #f59e0b;
        color: #fff;
      }
      .map-popup-btn-cobranca:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      .map-cobranca-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 1px 6px;
        border-radius: 9999px;
        font-size: 10px;
        font-weight: 600;
      }
      .map-locacao-tag {
        display: inline-block;
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 500;
        background: #f0fdf4;
        color: #166534;
        border: 1px solid #bbf7d0;
      }
      .map-status-bar {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
      }
      .map-locacao-detail {
        padding: 6px 8px;
        border-radius: 6px;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        margin-bottom: 4px;
      }
      .map-locacao-detail:last-child {
        margin-bottom: 0;
      }
      .user-location-marker {
        filter: hue-rotate(200deg) saturate(2);
      }
      /* Pulsing animation for pendenteCobranca markers */
      .pend-cobranca-pulse path {
        animation: map-pend-cobranca-pulse 2s ease-in-out infinite;
        transform-origin: center;
        transform-box: fill-box;
      }
      /* Glow effect for atrasado markers */
      .atrasado-glow {
        filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.6));
      }
      /* Glow effect for pago/parcial markers */
      .ativo-glow {
        filter: drop-shadow(0 0 3px rgba(34, 197, 94, 0.4));
      }
    `
    document.head.appendChild(style)
    return () => {
      const el = document.getElementById(styleId)
      if (el) el.remove()
    }
  }, [])

  // Count clients by status for the mini-stats
  const statusCounts = clientes.reduce((acc, c) => {
    const status = getPinStatus(c)
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<PinStatus, number>)

  return (
    <div className="rounded-lg overflow-hidden shadow-sm border">
      {/* Mini status summary above map */}
      <div className="bg-card border-b px-4 py-2.5 flex flex-wrap items-center gap-4">
        <span className="text-xs font-semibold text-muted-foreground">No mapa:</span>
        <div className="flex flex-wrap items-center gap-3">
          {statusCounts.pendenteCobranca > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.pendenteCobranca }} />
              <span className="text-xs font-medium">{statusCounts.pendenteCobranca} pend. cobrança</span>
            </div>
          )}
          {statusCounts.atrasado > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.atrasado }} />
              <span className="text-xs font-medium">{statusCounts.atrasado} atrasado{statusCounts.atrasado > 1 ? 's' : ''}</span>
            </div>
          )}
          {statusCounts.parcial > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.parcial }} />
              <span className="text-xs font-medium">{statusCounts.parcial} parcial</span>
            </div>
          )}
          {statusCounts.pago > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.pago }} />
              <span className="text-xs font-medium">{statusCounts.pago} pago{statusCounts.pago > 1 ? 's' : ''}</span>
            </div>
          )}
          {statusCounts.pendente > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS.pendente }} />
              <span className="text-xs font-medium">{statusCounts.pendente} pendente{statusCounts.pendente > 1 ? 's' : ''}</span>
            </div>
          )}
          <span className="text-xs text-muted-foreground">({clientes.length} total)</span>
        </div>
        {selectedRotaId !== 'all' && (
          <div className="ml-auto text-xs text-primary font-medium">
            Filtrado por rota
          </div>
        )}
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: 'calc(100vh - 400px)', minHeight: '480px', width: '100%' }}
        scrollWheelZoom={true}
        className="z-0"
      >
        <MapController locateClientId={locateClientId} userLocation={userLocation} clientes={clientes} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User location marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
            <Popup>
              <div className="text-sm font-semibold">Sua Localização</div>
            </Popup>
          </Marker>
        )}

        {/* Route polylines */}
        {routePolylines.map((line) => (
          <Polyline
            key={line.rotaId}
            positions={line.positions}
            pathOptions={{
              color: line.cor,
              weight: 3,
              opacity: 0.5,
              dashArray: '8, 12',
            }}
          />
        ))}

        {clientes.map((cliente) => {
          if (cliente.latitude == null || cliente.longitude == null) return null

          const pinStatus = getPinStatus(cliente)
          const color = getPinColor(pinStatus)
          const rotaDesc = cliente.rota?.descricao || 'Sem rota'
          const rotaColor = cliente.rotaId ? (rotaCorMap[cliente.rotaId] || '#6b7280') : '#6b7280'
          const radius = getPinRadius(pinStatus)

          // Determine if this client matches the search
          const isSearchMatch = matchingClientIds === null || matchingClientIds.has(cliente.id)
          const searchOpacity = matchingClientIds === null ? 1 : (isSearchMatch ? 1 : 0.3)

          // Determine border styling based on status
          const borderColor = pinStatus === 'pendenteCobranca' ? '#ca8a04' : 
                              pinStatus === 'atrasado' ? '#dc2626' : '#fff'
          const borderWeight = pinStatus === 'pendenteCobranca' || pinStatus === 'atrasado' ? 3 : 2

          // CSS class names for animations and effects
          const pinClassName = [
            pinStatus === 'pendenteCobranca' ? 'pend-cobranca-pulse' : '',
            pinStatus === 'atrasado' ? 'atrasado-glow' : '',
            (pinStatus === 'pago' || pinStatus === 'parcial') ? 'ativo-glow' : '',
          ].filter(Boolean).join(' ')

          // Cobrança details for locações
          const locacoesComCobranca = cliente.locacoesDetalhes || []
          const locacoesSemCobranca = locacoesComCobranca.filter(l => !l.ultimaCobranca)
          const locacoesComCobrancaInfo = locacoesComCobranca.filter(l => l.ultimaCobranca)

          return (
            <CircleMarker
              key={cliente.id}
              center={[cliente.latitude, cliente.longitude]}
              radius={radius}
              pathOptions={{
                fillColor: color,
                color: borderColor,
                weight: borderWeight,
                opacity: searchOpacity,
                fillOpacity: searchOpacity * (pinStatus === 'pendenteCobranca' || pinStatus === 'atrasado' ? 1 : 0.85),
                className: pinClassName,
              }}
            >
              {/* Pulsing ring for atrasado clients */}
              {pinStatus === 'atrasado' && (
                <CircleMarker
                  center={[cliente.latitude, cliente.longitude]}
                  radius={radius + 4}
                  pathOptions={{
                    fillColor: 'transparent',
                    color: '#dc2626',
                    weight: 2,
                    opacity: 0.6 * searchOpacity,
                    className: 'pulse-ring-marker',
                  }}
                />
              )}
              {/* Pulsing ring for pendenteCobranca clients */}
              {pinStatus === 'pendenteCobranca' && (
                <CircleMarker
                  center={[cliente.latitude, cliente.longitude]}
                  radius={radius + 5}
                  pathOptions={{
                    fillColor: 'transparent',
                    color: '#eab308',
                    weight: 2,
                    opacity: 0.5 * searchOpacity,
                    className: 'pulse-ring-marker',
                  }}
                />
              )}
              {/* Glow ring for ativo (pago) clients */}
              {pinStatus === 'pago' && (
                <CircleMarker
                  center={[cliente.latitude, cliente.longitude]}
                  radius={radius + 3}
                  pathOptions={{
                    fillColor: 'transparent',
                    color: '#22c55e',
                    weight: 1.5,
                    opacity: 0.3 * searchOpacity,
                  }}
                />
              )}
              {/* Glow ring for parcial clients */}
              {pinStatus === 'parcial' && (
                <CircleMarker
                  center={[cliente.latitude, cliente.longitude]}
                  radius={radius + 3}
                  pathOptions={{
                    fillColor: 'transparent',
                    color: '#f97316',
                    weight: 1.5,
                    opacity: 0.3 * searchOpacity,
                  }}
                />
              )}
              <Popup>
                <div className="min-w-[260px] max-w-[320px] space-y-2.5">
                  {/* Header with status indicator */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-sm leading-tight">{cliente.nomeExibicao}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">ID: {cliente.identificador}</div>
                    </div>
                    {/* Status badge */}
                    <div
                      className="map-status-bar shrink-0"
                      style={{
                        backgroundColor: color + '20',
                        color: color,
                        border: `1px solid ${color}40`,
                      }}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="whitespace-nowrap">{getStatusLabel(pinStatus)}</span>
                    </div>
                  </div>

                  {/* Route with color dot */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: rotaColor }}
                    />
                    <span className="text-xs font-medium">{rotaDesc}</span>
                  </div>

                  {/* Phone - clickable */}
                  {cliente.telefonePrincipal && (
                    <a
                      href={formatPhoneLink(cliente.telefonePrincipal)}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {cliente.telefonePrincipal}
                    </a>
                  )}

                  {/* Divider */}
                  <div className="border-t" />

                  {/* Pendente de cobrança warning */}
                  {pinStatus === 'pendenteCobranca' && (
                    <div className="map-status-bar" style={{ backgroundColor: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' }}>
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span>Nenhuma cobrança criada este mês</span>
                    </div>
                  )}

                  {/* Locações with cobrança details */}
                  {locacoesComCobranca.length > 0 && (
                    <div>
                      <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-1 flex items-center gap-1.5">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Locações Ativas ({locacoesComCobranca.length})
                      </div>

                      {/* Summary count for multiple locações */}
                      {locacoesComCobranca.length > 1 && (
                        <div className="flex items-center gap-2 mb-2 text-[11px]">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                            {locacoesComCobrancaInfo.length} com cobrança
                          </span>
                          {locacoesSemCobranca.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                              {locacoesSemCobranca.length} sem cobrança
                            </span>
                          )}
                        </div>
                      )}

                      {/* Detailed locações list */}
                      <div className="space-y-1">
                        {locacoesComCobranca.map((loc) => {
                          const lastCob = loc.ultimaCobranca
                          const cobStatus = lastCob ? getCobrancaStatusLabel(lastCob.status) : null
                          return (
                            <div key={loc.id} className="map-locacao-detail">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-[11px] font-semibold text-gray-700 truncate">{loc.produtoIdentificador}</span>
                                {cobStatus ? (
                                  <span
                                    className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                                    style={{ backgroundColor: cobStatus.bg, color: cobStatus.color }}
                                  >
                                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cobStatus.color }} />
                                    {cobStatus.label}
                                  </span>
                                ) : (
                                  <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-500">
                                    Sem cobrança
                                  </span>
                                )}
                              </div>
                              {lastCob && (
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-[10px] text-gray-500">
                                    Valor: {formatarMoeda(lastCob.totalClientePaga)}
                                  </span>
                                  {lastCob.saldoDevedor > 0 && (
                                    <span className="text-[10px] font-semibold text-red-600">
                                      Devendo: {formatarMoeda(lastCob.saldoDevedor)}
                                    </span>
                                  )}
                                  {lastCob.saldoDevedor <= 0 && lastCob.status === 'Pago' && (
                                    <span className="text-[10px] font-semibold text-emerald-600">
                                      Quitado
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Fallback: show simple locações tags if no details */}
                  {locacoesComCobranca.length === 0 && cliente.locacoesAtivas.length > 0 && (
                    <div>
                      <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-1">
                        Locações Ativas ({cliente.locacoesAtivas.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {cliente.locacoesAtivas.slice(0, 5).map((identificador, idx) => (
                          <span key={idx} className="map-locacao-tag">
                            {identificador}
                          </span>
                        ))}
                        {cliente.locacoesAtivas.length > 5 && (
                          <span className="map-locacao-tag" style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}>
                            +{cliente.locacoesAtivas.length - 5}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cobranças summary */}
                  <div>
                    <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-1">
                      Cobranças
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {cliente.cobrancasResumo.atrasado > 0 && (
                        <span className="map-cobranca-badge" style={{ background: '#fee2e2', color: '#991b1b' }}>
                          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#dc2626' }} />
                          {cliente.cobrancasResumo.atrasado} atrasado
                        </span>
                      )}
                      {cliente.cobrancasResumo.parcial > 0 && (
                        <span className="map-cobranca-badge" style={{ background: '#ffedd5', color: '#9a3412' }}>
                          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#f97316' }} />
                          {cliente.cobrancasResumo.parcial} parcial
                        </span>
                      )}
                      {cliente.cobrancasResumo.pendente > 0 && (
                        <span className="map-cobranca-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#f59e0b' }} />
                          {cliente.cobrancasResumo.pendente} pendente
                        </span>
                      )}
                      {cliente.cobrancasResumo.pago > 0 && (
                        <span className="map-cobranca-badge" style={{ background: '#dcfce7', color: '#166534' }}>
                          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#22c55e' }} />
                          {cliente.cobrancasResumo.pago} pago
                        </span>
                      )}
                      {cliente.cobrancasResumo.pendente === 0 && cliente.cobrancasResumo.atrasado === 0 && cliente.cobrancasResumo.parcial === 0 && cliente.cobrancasResumo.pago === 0 && (
                        <span className="text-[10px] text-gray-400">Nenhuma cobrança</span>
                      )}
                    </div>
                  </div>

                  {/* Total pendente with red highlight */}
                  {cliente.totalPendente > 0 && (
                    <div className="flex items-center justify-between bg-red-50 -mx-1 px-2 py-1.5 rounded-md border border-red-100">
                      <span className="text-[11px] font-semibold text-red-700">Total Pendente</span>
                      <span className="text-sm font-bold text-red-600">{formatarMoeda(cliente.totalPendente)}</span>
                    </div>
                  )}

                  {/* Total recebido */}
                  {cliente.totalRecebido > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">Total Recebido</span>
                      <span className="text-xs font-semibold text-emerald-600">{formatarMoeda(cliente.totalRecebido)}</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="space-y-1.5 pt-1">
                    {/* WhatsApp button */}
                    {cliente.telefonePrincipal && (
                      <a
                        href={getWhatsAppLink(cliente)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="map-popup-btn-whatsapp flex items-center justify-center gap-1.5"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Enviar WhatsApp
                      </a>
                    )}

                    {/* Gerar Cobrança button - only if pendenteCobranca or has pending items */}
                    {(cliente.pendenteCobranca || cliente.totalPendente > 0) && (
                      <button
                        onClick={() => navigate('cobranca-nova', null, { clienteId: cliente.id })}
                        className="map-popup-btn-cobranca flex items-center justify-center gap-1.5"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Gerar Cobrança
                      </button>
                    )}

                    {/* Ver Cliente button */}
                    <button
                      onClick={() => navigate('cliente-detalhe', cliente.id)}
                      className="map-popup-btn"
                    >
                      Ver Cliente
                    </button>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
