'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet'
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

// Status color constants
const STATUS_COLORS = {
  pago: '#22c55e',       // Green
  atrasado: '#ef4444',   // Red
  parcial: '#f97316',    // Orange
  pendenteCobranca: '#eab308', // Yellow
  pendente: '#eab308',   // Yellow (smaller)
  neutro: '#6b7280',     // Gray
} as const

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

export default function MapInner({ clientes, rotas, showRouteLines = false, selectedRotaId = 'all' }: MapInnerProps) {
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

  useEffect(() => {
    // Force Leaflet to recalculate map size after mounting
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Inject CSS animation for pulsing markers
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
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

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

          // Determine border styling based on status
          const borderColor = pinStatus === 'pendenteCobranca' ? '#ca8a04' : 
                              pinStatus === 'atrasado' ? '#dc2626' : '#fff'
          const borderWeight = pinStatus === 'pendenteCobranca' || pinStatus === 'atrasado' ? 3 : 2

          return (
            <CircleMarker
              key={cliente.id}
              center={[cliente.latitude, cliente.longitude]}
              radius={radius}
              pathOptions={{
                fillColor: color,
                color: borderColor,
                weight: borderWeight,
                opacity: 1,
                fillOpacity: pinStatus === 'pendenteCobranca' || pinStatus === 'atrasado' ? 1 : 0.85,
                className: pinStatus === 'atrasado' ? 'pulse-marker' : '',
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
                    opacity: 0.6,
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
                    opacity: 0.5,
                    className: 'pulse-ring-marker',
                  }}
                />
              )}
              <Popup>
                <div className="min-w-[230px] max-w-[300px] space-y-2.5">
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
                      <span>Nenhuma cobrança criada este mês para este cliente</span>
                    </div>
                  )}

                  {/* Active locações */}
                  {cliente.locacoesAtivas.length > 0 && (
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

                  {/* Ver Cliente button */}
                  <button
                    onClick={() => navigate('cliente-detalhe', cliente.id)}
                    className="map-popup-btn"
                  >
                    Ver Cliente
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
