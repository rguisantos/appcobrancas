/**
 * Shared JWT configuration.
 * Used by both auth-jwt.ts (server-side) and middleware.ts (edge).
 *
 * CRITICAL: JWT_SECRET must ALWAYS be set. There is no fallback.
 * In development, create a .env file with a random secret.
 */

const secret = process.env.JWT_SECRET

if (!secret) {
  throw new Error(
    'JWT_SECRET environment variable is required. ' +
    'Set it to a random string of at least 32 characters. ' +
    'For local development, add it to your .env file.'
  )
}

if (secret.length < 32) {
  console.warn(
    'WARNING: JWT_SECRET is shorter than 32 characters. ' +
    'Consider using a longer secret for better security.'
  )
}

export const JWT_SECRET = new TextEncoder().encode(secret)

export const JWT_EXPIRATION = '7d'
export const JWT_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds
