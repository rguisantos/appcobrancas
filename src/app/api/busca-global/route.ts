import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const q = searchParams.get('q') || ''

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ clientes: [], produtos: [], locacoes: [], cobrancas: [] })
  }

  const searchTerm = q.trim()

  const [clientes, produtos, locacoes, cobrancas] = await Promise.all([
    db.cliente.findMany({
      where: {
        deletedAt: null,
        OR: [
          { nomeExibicao: { contains: searchTerm } },
          { identificador: { contains: searchTerm } },
          { telefonePrincipal: { contains: searchTerm } },
          { email: { contains: searchTerm } },
        ],
      },
      take: 5,
      select: { id: true, nomeExibicao: true, identificador: true, telefonePrincipal: true, status: true },
    }),
    db.produto.findMany({
      where: {
        deletedAt: null,
        OR: [
          { identificador: { contains: searchTerm } },
          { tipoNome: { contains: searchTerm } },
          { descricaoNome: { contains: searchTerm } },
        ],
      },
      take: 5,
      select: { id: true, identificador: true, tipoNome: true, descricaoNome: true, statusProduto: true },
    }),
    db.locacao.findMany({
      where: {
        deletedAt: null,
        OR: [
          { clienteNome: { contains: searchTerm } },
          { produtoIdentificador: { contains: searchTerm } },
        ],
      },
      take: 5,
      select: { id: true, clienteNome: true, produtoIdentificador: true, status: true, dataLocacao: true },
    }),
    db.cobranca.findMany({
      where: {
        deletedAt: null,
        OR: [
          { clienteNome: { contains: searchTerm } },
          { produtoIdentificador: { contains: searchTerm } },
        ],
      },
      take: 5,
      select: { id: true, clienteNome: true, produtoIdentificador: true, status: true, totalClientePaga: true, dataInicio: true, dataFim: true },
    }),
  ])

  return NextResponse.json({ clientes, produtos, locacoes, cobrancas })
}
