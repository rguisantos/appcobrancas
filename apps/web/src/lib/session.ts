import { createHash } from 'crypto'
import { db } from './db'

/** Hash a token for storage/lookup in the Sessao table. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Validates that a session still exists in the database.
 * Token is hashed before lookup since we store hashes, not raw tokens.
 * Call this from route handlers for sensitive operations.
 */
export async function validateSession(rawToken: string): Promise<boolean> {
  const tokenHash = hashToken(rawToken)
  const session = await db.sessao.findUnique({ where: { token: tokenHash } })
  if (!session) return false
  if (session.expiraEm < new Date()) {
    await db.sessao.delete({ where: { id: session.id } })
    return false
  }
  return true
}
