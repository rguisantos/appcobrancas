import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-jwt'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/decimal'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
  const rotas = await db.rota.findMany({
    where: { deletedAt: null },
    include: {
      clientes: { where: { deletedAt: null } },
    },
  })

  const data = await Promise.all(rotas.map(async r => {
    const cobrancas = await db.cobranca.findMany({
      where: { deletedAt: null, cliente: { rotaId: r.id } },
    })

    return {
      id: r.id,
      descricao: r.descricao,
      cor: r.cor,
      regiao: r.regiao,
      totalClientes: r.clientes.length,
      totalCobrancas: cobrancas.length,
      totalRecebido: cobrancas.filter(c => c.status === 'Pago' || c.status === 'Parcial').reduce((s, c) => s + toNumber(c.valorRecebido), 0),
      totalPendente: cobrancas.filter(c => c.status === 'Pendente' || c.status === 'Atrasado').reduce((s, c) => s + toNumber(c.totalClientePaga), 0),
    }
  }))

  return NextResponse.json({ data })
  } catch (error) {
    console.error('Erro ao buscar relatório de rotas:', error)
    return NextResponse.json({ error: 'Erro ao buscar relatório de rotas' }, { status: 500 })
  }
}
