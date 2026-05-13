import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { JWT_SECRET } from './lib/jwt-config'

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/device-login',
  '/api/auth/logout',
  '/api/health',
  '/api/cron',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
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
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
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

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 })
  }
}

export const config = {
  matcher: ['/api/:path*'],
}
