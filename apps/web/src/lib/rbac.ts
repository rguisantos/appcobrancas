import { getAuthSession } from './auth-jwt'
import { NextResponse } from 'next/server'

type Permission = 'Administrador' | 'Secretario' | 'AcessoControlado'

const MUTATION_ROLES: Permission[] = ['Administrador', 'Secretario']
const ADMIN_ONLY: Permission[] = ['Administrador']

/** Check if the current user has the required permission level */
export async function requireRole(roles: Permission[]) {
  const session = await getAuthSession()
  if (!session) return { authorized: false, response: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }

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
