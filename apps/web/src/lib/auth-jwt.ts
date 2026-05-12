import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { JWT_SECRET, JWT_EXPIRATION } from './jwt-config'

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

export async function getAuthSession(): Promise<AuthPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  if (!token) return null
  return verifyToken(token)
}
