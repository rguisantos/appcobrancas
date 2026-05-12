import { NextResponse } from 'next/server'

/**
 * Handles API errors consistently across all routes.
 * Detects Zod validation errors, Prisma errors, and generic errors.
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  // Zod v4 validation error
  if (error && typeof error === 'object' && 'issues' in error) {
    return NextResponse.json(
      { error: 'Dados invalidos', details: (error as { issues: unknown }).issues },
      { status: 400 }
    )
  }

  // Prisma unique constraint violation
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: { target?: string[] } }
    if (prismaError.code === 'P2002') {
      const fields = prismaError.meta?.target?.join(', ') || 'campo'
      return NextResponse.json(
        { error: `Registro duplicado: ${fields} ja existe` },
        { status: 409 }
      )
    }
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'Registro nao encontrado' },
        { status: 404 }
      )
    }
  }

  console.error(`${context}:`, error)
  return NextResponse.json(
    { error: `Erro: ${context}` },
    { status: 500 }
  )
}
