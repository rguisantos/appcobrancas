import { getAuthSession } from './auth-jwt'
import { validateSession } from './session'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

type Permission = 'Administrador' | 'Secretario' | 'AcessoControlado'

const MUTATION_ROLES: Permission[] = ['Administrador', 'Secretario']
const ADMIN_ONLY: Permission[] = ['Administrador']

/**
 * Check if the current user has the required permission level.
 * Also validates that the session still exists in the database (not revoked).
 */
export async function requireRole(roles: Permission[]) {
  const session = await getAuthSession()
  if (!session) return { authorized: false, response: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }

  // Validate session against database — rejects revoked tokens
  const requestHeaders = await headers()
  const rawToken = requestHeaders.get('x-raw-token')
  if (rawToken) {
    const isValid = await validateSession(rawToken)
    if (!isValid) {
      return { authorized: false, response: NextResponse.json({ error: 'Sessão expirada ou revogada' }, { status: 401 }) }
    }
  }

  if (!roles.includes(session.tipoPermissao as Permission)) {
    return { authorized: false, response: NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 }) }
  }

  return { authorized: true, session }
}

/** Shorthand for mutation operations (create, update, delete) */
export async function requireMutationRole() {
  return requireRole(MUTATION_ROLES)
}

/** Shorthand for admin-only operations */
export async function requireAdmin() {
  return requireRole(ADMIN_ONLY)
}
