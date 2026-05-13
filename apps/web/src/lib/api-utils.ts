import { NextResponse } from 'next/server'

/** Default max page size to prevent DoS via unbounded queries. */
const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 20

/**
 * Safely parse and bound a pagination limit from query params.
 * Ensures the value is between 1 and max (default: MAX_PAGE_SIZE).
 */
export function safeLimit(raw: string | null, max?: number): number {
  const upperBound = max ?? MAX_PAGE_SIZE
  const parsed = parseInt(raw || String(DEFAULT_PAGE_SIZE), 10)
  if (Number.isNaN(parsed) || parsed < 1) return DEFAULT_PAGE_SIZE
  return Math.min(parsed, upperBound)
}

/**
 * Safely parse a page number from query params (1-based).
 */
export function safePage(raw: string | null): number {
  const parsed = parseInt(raw || '1', 10)
  if (Number.isNaN(parsed) || parsed < 1) return 1
  return parsed
}

/**
 * Handles API errors consistently across all routes.
 * Detects Zod validation errors, Prisma errors, and generic errors.
 * Sanitizes error details to avoid leaking internal schema info.
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  // Zod v4 validation error — return simplified field errors, not raw issues
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> }
    const fieldErrors = zodError.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))
    return NextResponse.json(
      { error: 'Dados inválidos', details: fieldErrors },
      { status: 400 }
    )
  }

  // Prisma unique constraint violation
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: { target?: string[] } }
    if (prismaError.code === 'P2002') {
      const fields = prismaError.meta?.target?.join(', ') || 'campo'
      return NextResponse.json(
        { error: `Registro duplicado: ${fields} já existe` },
        { status: 409 }
      )
    }
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'Registro não encontrado' },
        { status: 404 }
      )
    }
  }

  console.error(`${context}:`, error)
  return NextResponse.json(
    { error: 'Erro interno do servidor' },
    { status: 500 }
  )
}
