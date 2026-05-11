import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-jwt'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

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
    const totalPago = c.cobrancas.filter(cb => cb.status === 'Pago').reduce((s, cb) => s + cb.valorRecebido, 0)
    const totalPendente = c.cobrancas.filter(cb => cb.status === 'Pendente' || cb.status === 'Atrasado').reduce((s, cb) => s + cb.totalClientePaga, 0)
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
    console.error('Erro ao buscar relatório de clientes:', error)
    return NextResponse.json({ error: 'Erro ao buscar relatório de clientes' }, { status: 500 })
  }
}
