import { SignJWT, jwtVerify } from 'jose'
import { cookies, headers } from 'next/headers'
import { JWT_SECRET, JWT_EXPIRATION } from './jwt-config'
import { validateSession } from './session'

export interface AuthPayload {
  userId: string
  email: string
  nome: string
  tipoPermissao: string
  permissoesWeb: Record<string, boolean>
  rotasPermitidas: string[]
}

export async function signToken(payload: AuthPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as AuthPayload
  } catch {
    return null
  }
}

/**
 * Get the current authenticated session.
 * Supports both cookie-based auth (web) and Bearer token auth (mobile).
 * Also validates the session against the database to reject revoked tokens.
 */
export async function getAuthSession(): Promise<AuthPayload | null> {
  // Try cookie first (web browser), then fall back to x-raw-token header set by middleware (mobile Bearer)
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
    || (await headers()).get('x-raw-token')
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  // Validate session exists in DB (not revoked)
  const isValid = await validateSession(token)
  if (!isValid) return null

  return payload
}
