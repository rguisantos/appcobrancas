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
}

export default function MapInner({ clientes, rotas, showRouteLines = false }: MapInnerProps) {
  const { navigate } = useNavigation()

  // Center on Campo Grande, MS
  const center: [number, number] = [-20.44, -54.64]
  const zoom = 12

  // Build a map of rotaId -> cor for quick lookup
  const rotaCorMap: Record<string, string> = {}
  rotas.forEach((r) => {
    rotaCorMap[r.id] = r.cor
  })

  // Helper to get marker color
  const getMarkerColor = (rotaId: string | null) => {
    if (!rotaId) return '#6b7280' // gray for no rota
    return rotaCorMap[rotaId] || '#6b7280'
  }

  // Helper to get marker radius based on importance
  const getMarkerRadius = (cliente: ClienteMapa) => {
    if (cliente.temAtrasado) return 12
    if (cliente.totalPendente > 0) return 10
    if (cliente.cobrancasResumo.pendente > 0) return 9
    return 7
  }

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
    `
    document.head.appendChild(style)
    return () => {
      const el = document.getElementById(styleId)
      if (el) el.remove()
    }
  }, [])

  return (
    <div className="rounded-lg overflow-hidden shadow-sm border">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: 'calc(100vh - 340px)', minHeight: '500px', width: '100%' }}
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

          const color = getMarkerColor(cliente.rotaId)
          const rotaDesc = cliente.rota?.descricao || 'Sem rota'
          const radius = getMarkerRadius(cliente)

          return (
            <CircleMarker
              key={cliente.id}
              center={[cliente.latitude, cliente.longitude]}
              radius={radius}
              pathOptions={{
                fillColor: color,
                color: cliente.temAtrasado ? '#dc2626' : '#fff',
                weight: cliente.temAtrasado ? 3 : 2,
                opacity: 1,
                fillOpacity: cliente.temAtrasado ? 1 : 0.85,
                className: cliente.temAtrasado ? 'pulse-marker' : '',
              }}
            >
              {/* Pulsing ring for atrasado clients */}
              {cliente.temAtrasado && (
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
              <Popup>
                <div className="min-w-[220px] max-w-[280px] space-y-2.5">
                  {/* Header */}
                  <div>
                    <div className="font-bold text-sm leading-tight">{cliente.nomeExibicao}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">ID: {cliente.identificador}</div>
                  </div>

                  {/* Route with color dot */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
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
                      {cliente.cobrancasResumo.pendente > 0 && (
                        <span className="map-cobranca-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#f59e0b' }} />
                          {cliente.cobrancasResumo.pendente} pendente
                        </span>
                      )}
                      {cliente.cobrancasResumo.atrasado > 0 && (
                        <span className="map-cobranca-badge" style={{ background: '#fee2e2', color: '#991b1b' }}>
                          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#dc2626' }} />
                          {cliente.cobrancasResumo.atrasado} atrasado
                        </span>
                      )}
                      {cliente.cobrancasResumo.parcial > 0 && (
                        <span className="map-cobranca-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>
                          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#3b82f6' }} />
                          {cliente.cobrancasResumo.parcial} parcial
                        </span>
                      )}
                      {cliente.cobrancasResumo.pago > 0 && (
                        <span className="map-cobranca-badge" style={{ background: '#dcfce7', color: '#166534' }}>
                          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#16a34a' }} />
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
