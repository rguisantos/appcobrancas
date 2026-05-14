import { NextRequest, NextResponse } from 'next/server'
import { requireMutationRole } from '@/lib/rbac'
import { handleApiError } from '@/lib/api-utils'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  try {
  // Single aggregate query instead of N+1 — group cobranças by rota
  const rotaStats = await db.$queryRaw<Array<{
    id: string
    descricao: string
    cor: string
    regiao: string | null
    totalClientes: bigint
    totalCobrancas: bigint
    totalRecebido: number
    totalPendente: number
  }>>`
    SELECT
      r.id,
      r.descricao,
      r.cor,
      r.regiao,
      COUNT(DISTINCT c2.id) AS "totalClientes",
      COUNT(cb.id) AS "totalCobrancas",
      COALESCE(SUM(CASE WHEN cb.status IN ('Pago', 'Parcial') THEN cb."valorRecebido" ELSE 0 END), 0) AS "totalRecebido",
      COALESCE(SUM(CASE WHEN cb.status IN ('Pendente', 'Atrasado') THEN cb."totalClientePaga" ELSE 0 END), 0) AS "totalPendente"
    FROM rotas r
    LEFT JOIN clientes c2 ON c2."rotaId" = r.id AND c2."deletedAt" IS NULL
    LEFT JOIN cobrancas cb ON cb."clienteId" = c2.id AND cb."deletedAt" IS NULL
    WHERE r."deletedAt" IS NULL
    GROUP BY r.id, r.descricao, r.cor, r.regiao
    ORDER BY r.descricao
  `

  const data = rotaStats.map(r => ({
    id: r.id,
    descricao: r.descricao,
    cor: r.cor,
    regiao: r.regiao,
    totalClientes: Number(r.totalClientes),
    totalCobrancas: Number(r.totalCobrancas),
    totalRecebido: Number(r.totalRecebido),
    totalPendente: Number(r.totalPendente),
  }))

  return NextResponse.json({ data })
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar relatório de rotas')
  }
}
