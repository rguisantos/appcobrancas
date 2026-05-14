import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { JWT_SECRET } from './lib/jwt-config'

// Routes that don't require authentication (exact matches only)
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/device-login',
  '/api/auth/logout',
  '/api/health',
]

// Route prefixes that are public (exact prefix, not substring match)
const PUBLIC_PREFIXES = [
  '/api/cron',
]

/** Check if a pathname matches a public route */
function isPublicRoute(pathname: string): boolean {
  // Exact match
  if (PUBLIC_ROUTES.includes(pathname)) return true
  // Prefix match — must be followed by / or be the exact prefix
  if (PUBLIC_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'))) return true
  return false
}

/** Restrictive CORS origins in production; dev-friendly default otherwise. */
function getAllowedOrigin(): string {
  const envOrigin = process.env.ALLOWED_ORIGINS
  if (envOrigin) return envOrigin
  // In production, default to same-origin only; in dev, allow localhost
  if (process.env.NODE_ENV === 'production') {
    return '' // No wildcard in production — must be explicitly configured
  }
  return 'http://localhost:3000'
}

function addCorsHeaders(response: NextResponse | Response) {
  const origin = getAllowedOrigin()
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    // Only set Allow-Credentials when we have a specific origin
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cron-secret')
  response.headers.set('Access-Control-Max-Age', '86400')
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 })
    return addCorsHeaders(response)
  }

  // Allow public routes (exact match + controlled prefix match)
  if (isPublicRoute(pathname)) {
    const response = NextResponse.next()
    if (pathname.startsWith('/api/')) {
      addCorsHeaders(response)
    }
    return response
  }

  // Only protect API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Check for auth token: Cookie (web) or Bearer header (mobile)
  const cookieToken = request.cookies.get('auth-token')?.value
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const token = cookieToken || bearerToken

  if (!token) {
    const response = NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    return addCorsHeaders(response)
  }

  // Verify JWT token inline (avoids importing the full auth-jwt module)
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)

    // Add user info to request headers for downstream use
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.userId as string)
    requestHeaders.set('x-user-email', payload.email as string)
    requestHeaders.set('x-user-permission-type', (payload.tipoPermissao as string) || '')
    requestHeaders.set('x-user-permissions', JSON.stringify(payload.permissoesWeb || {}))
    // Pass the raw token so route handlers can validate against the Sessao table
    requestHeaders.set('x-raw-token', token)

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

    // Add CORS headers to all API responses
    addCorsHeaders(response)

    return response
  } catch {
    const response = NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 })
    return addCorsHeaders(response)
  }
}

export const config = {
  matcher: ['/api/:path*'],
}
