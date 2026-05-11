import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  if (session.tipoPermissao !== 'Administrador') {
    return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
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
}
