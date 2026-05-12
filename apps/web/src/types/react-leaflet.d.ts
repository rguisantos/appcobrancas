import { type LatLngExpression, type Map as LeafletMap } from 'leaflet'
import type { CSSProperties, ReactNode } from 'react'

declare module 'react-leaflet' {
  interface MapContainerProps {
    bounds?: unknown
    boundsOptions?: unknown
    center?: LatLngExpression
    zoom?: number
    style?: CSSProperties
    scrollWheelZoom?: boolean
    className?: string
    id?: string
    placeholder?: ReactNode
    whenReady?: () => void
    children?: ReactNode
  }

  interface TileLayerProps {
    attribution?: string
    url?: string
    children?: ReactNode
  }

  interface MarkerProps {
    position?: LatLngExpression
    icon?: unknown
    children?: ReactNode
  }

  interface CircleMarkerProps {
    center?: LatLngExpression
    radius?: number
    pathOptions?: unknown
    children?: ReactNode
  }

  interface PolylineProps {
    positions?: LatLngExpression[] | LatLngExpression[][]
    pathOptions?: unknown
    children?: ReactNode
  }

  interface PopupProps {
    children?: ReactNode
  }
}
