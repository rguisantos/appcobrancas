import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-jwt'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const produtos = await db.produto.findMany({
    where: { deletedAt: null },
    include: {
      locacoes: { where: { deletedAt: null } },
      tipo: true,
    },
  })

  const data = produtos.map(p => {
    const locacaoAtiva = p.locacoes.find(l => l.status === 'Ativa')
    return {
      id: p.id,
      identificador: p.identificador,
      tipoNome: p.tipoNome,
      descricaoNome: p.descricaoNome,
      statusProduto: p.statusProduto,
      conservacao: p.conservacao,
      locado: !!locacaoAtiva,
      clienteNome: locacaoAtiva?.clienteNome || null,
      totalLocacoes: p.locacoes.length,
    }
  })

  const porTipo: Record<string, number> = {}
  data.forEach(p => { porTipo[p.tipoNome] = (porTipo[p.tipoNome] || 0) + 1 })

  return NextResponse.json({
    data,
    porTipo,
    totalProdutos: data.length,
    totalLocados: data.filter(p => p.locado).length,
    totalDisponiveis: data.filter(p => !p.locado && p.statusProduto === 'Ativo').length,
    totalManutencao: data.filter(p => p.statusProduto === 'Manutenção').length,
  })
}
