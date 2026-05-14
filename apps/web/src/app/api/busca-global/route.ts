import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { handleApiError } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
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
          { nomeExibicao: { contains: searchTerm, mode: 'insensitive' } },
          { identificador: { contains: searchTerm, mode: 'insensitive' } },
          { telefonePrincipal: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: { id: true, nomeExibicao: true, identificador: true, telefonePrincipal: true, status: true },
    }),
    db.produto.findMany({
      where: {
        deletedAt: null,
        OR: [
          { identificador: { contains: searchTerm, mode: 'insensitive' } },
          { tipoNome: { contains: searchTerm, mode: 'insensitive' } },
          { descricaoNome: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: { id: true, identificador: true, tipoNome: true, descricaoNome: true, statusProduto: true },
    }),
    db.locacao.findMany({
      where: {
        deletedAt: null,
        OR: [
          { clienteNome: { contains: searchTerm, mode: 'insensitive' } },
          { produtoIdentificador: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: { id: true, clienteNome: true, produtoIdentificador: true, status: true, dataLocacao: true },
    }),
    db.cobranca.findMany({
      where: {
        deletedAt: null,
        OR: [
          { clienteNome: { contains: searchTerm, mode: 'insensitive' } },
          { produtoIdentificador: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: { id: true, clienteNome: true, produtoIdentificador: true, status: true, totalClientePaga: true, dataInicio: true, dataFim: true },
    }),
  ])

  return NextResponse.json({ clientes, produtos, locacoes, cobrancas })
  } catch (error) {
    return handleApiError(error, 'Erro na busca global')
  }
}
