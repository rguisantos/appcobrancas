import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// JWT secret - must match auth-jwt.ts
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'app-cobrancas-secret-key-min-32-chars!!'
)

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth/login',
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

  // Check for auth token in cookies
  const token = request.cookies.get('auth-token')?.value

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
