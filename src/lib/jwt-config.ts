/**
 * Shared JWT configuration.
 * Used by both auth-jwt.ts (server-side) and middleware.ts (edge).
 *
 * CRITICAL: JWT_SECRET must be set in production. The fallback is only
 * allowed in development to avoid breaking local DX.
 */

const secret = process.env.JWT_SECRET

if (!secret && process.env.NODE_ENV === 'production') {
  throw new Error(
    'JWT_SECRET environment variable is required in production. ' +
    'Set it to a random string of at least 32 characters.'
  )
}

export const JWT_SECRET = new TextEncoder().encode(
  secret || 'app-cobrancas-dev-only-secret-key-32ch!!'
)

export const JWT_EXPIRATION = '7d'
export const JWT_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds
