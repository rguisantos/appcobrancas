import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { handleApiError, safeLimit, safePage } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const searchParams = request.nextUrl.searchParams
  const page = safePage(searchParams.get('page'))
  const limit = safeLimit(searchParams.get('limit'))
  const skip = (page - 1) * limit
  const entidade = searchParams.get('entidade') || ''
  const acao = searchParams.get('acao') || ''
  const usuarioId = searchParams.get('usuarioId') || ''
  const dataInicio = searchParams.get('dataInicio') || ''
  const dataFim = searchParams.get('dataFim') || ''

  const where: Record<string, unknown> = {}

  if (entidade) where.entidade = entidade
  if (acao) where.acao = acao
  if (usuarioId) where.usuarioId = usuarioId

  // Non-admin users can only view their own logs (override any usuarioId filter)
  if (session.tipoPermissao !== 'Administrador') {
    where.usuarioId = session.userId
  }

  if (dataInicio || dataFim) {
    const createdAtFilter: Record<string, Date> = {}
    if (dataInicio) createdAtFilter.gte = new Date(dataInicio)
    if (dataFim) createdAtFilter.lte = new Date(dataFim + 'T23:59:59.999Z')
    where.createdAt = createdAtFilter
  }

  const [data, total] = await Promise.all([
    db.logAuditoria.findMany({
      where,
      skip,
      take: limit,
      include: { usuario: { select: { id: true, nome: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    db.logAuditoria.count({ where }),
  ])

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar logs de auditoria')
  }
}
