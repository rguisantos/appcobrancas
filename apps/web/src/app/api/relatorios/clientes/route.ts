import { NextRequest, NextResponse } from 'next/server'
import { requireMutationRole } from '@/lib/rbac'
import { handleApiError } from '@/lib/api-utils'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/decimal'

export async function GET(request: NextRequest) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  try {
  const clientes = await db.cliente.findMany({
    where: { deletedAt: null },
    include: {
      locacoes: { where: { deletedAt: null, status: 'Ativa' } },
      cobrancas: { where: { deletedAt: null } },
      rota: true,
    },
  })

  const data = clientes.map(c => {
    const totalPago = c.cobrancas.filter(cb => cb.status === 'Pago').reduce((s, cb) => s + toNumber(cb.valorRecebido), 0)
    const totalPendente = c.cobrancas.filter(cb => cb.status === 'Pendente' || cb.status === 'Atrasado').reduce((s, cb) => s + toNumber(cb.totalClientePaga), 0)
    return {
      id: c.id,
      nomeExibicao: c.nomeExibicao,
      identificador: c.identificador,
      cidade: c.cidade,
      estado: c.estado,
      status: c.status,
      rotaNome: c.rota?.descricao || 'Sem rota',
      locacoesAtivas: c.locacoes.length,
      totalCobrancas: c.cobrancas.length,
      totalPago,
      totalPendente,
    }
  })

  return NextResponse.json({ data })
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar relatório de clientes')
  }
}
