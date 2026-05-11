'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
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

interface MapInnerProps {
  clientes: ClienteMapa[]
  rotas: RotaMapa[]
  stats: StatsMapa
}

export default function MapInner({ clientes, rotas }: MapInnerProps) {
  const { navigate } = useNavigation()

  // Center on Campo Grande, MS
  const center: [number, number] = [-20.44, -54.64]
  const zoom = 12

  // Build a map of rotaId -> cor for quick lookup
  const rotaCorMap: Record<string, string> = {}
  rotas.forEach((r) => {
    rotaCorMap[r.id] = r.cor
  })

  // Helper to darken/lighten hex colors for better visibility
  const getMarkerColor = (rotaId: string | null) => {
    if (!rotaId) return '#6b7280' // gray for no rota
    return rotaCorMap[rotaId] || '#6b7280'
  }

  useEffect(() => {
    // Force Leaflet to recalculate map size after mounting
    // This handles the case where the container size changes
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 100)
    return () => clearTimeout(timer)
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

        {clientes.map((cliente) => {
          if (cliente.latitude == null || cliente.longitude == null) return null

          const color = getMarkerColor(cliente.rotaId)
          const rotaDesc = cliente.rota?.descricao || 'Sem rota'

          return (
            <CircleMarker
              key={cliente.id}
              center={[cliente.latitude, cliente.longitude]}
              radius={8}
              pathOptions={{
                fillColor: color,
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.85,
              }}
            >
              <Popup>
                <div className="min-w-[200px] space-y-2">
                  <div className="font-semibold text-sm">{cliente.nomeExibicao}</div>
                  <div className="text-xs text-gray-500">ID: {cliente.identificador}</div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs font-medium">{rotaDesc}</span>
                  </div>
                  <div className="border-t pt-1.5 space-y-0.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Locações Ativas:</span>
                      <span className="font-medium">{cliente.locacoesAtivas}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Recebido:</span>
                      <span className="font-medium text-green-600">{formatarMoeda(cliente.totalRecebido)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pendente:</span>
                      <span className="font-medium text-yellow-600">{formatarMoeda(cliente.totalPendente)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('cliente-detalhe', cliente.id)}
                    className="w-full text-xs text-center py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
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
