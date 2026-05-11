import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'

export async function GET() {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const [clientes, rotas] = await Promise.all([
    db.cliente.findMany({
      where: {
        deletedAt: null,
        status: 'Ativo',
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        identificador: true,
        nomeExibicao: true,
        telefonePrincipal: true,
        latitude: true,
        longitude: true,
        rotaId: true,
        rota: { select: { id: true, descricao: true, cor: true } },
        locacoes: {
          where: { deletedAt: null, status: 'Ativa' },
          select: { id: true },
        },
        cobrancas: {
          where: { deletedAt: null },
          select: {
            totalClientePaga: true,
            valorRecebido: true,
            status: true,
          },
        },
      },
    }),
    db.rota.findMany({
      where: { deletedAt: null, status: 'Ativo' },
      select: {
        id: true,
        descricao: true,
        cor: true,
        _count: { select: { clientes: { where: { deletedAt: null, status: 'Ativo' } } } },
      },
      orderBy: { ordem: 'asc' },
    }),
  ])

  const totalClientes = clientes.length
  const clientesComCoordenadas = clientes.filter(
    (c) => c.latitude != null && c.longitude != null
  ).length

  const totalRecebido = clientes.reduce((acc, c) => {
    return acc + c.cobrancas.filter((cb) => cb.status === 'Pago' || cb.status === 'Parcial').reduce((s, cb) => s + cb.valorRecebido, 0)
  }, 0)

  const totalPendente = clientes.reduce((acc, c) => {
    return acc + c.cobrancas.filter((cb) => cb.status === 'Pendente' || cb.status === 'Atrasado' || cb.status === 'Parcial').reduce((s, cb) => s + (cb.totalClientePaga - cb.valorRecebido), 0)
  }, 0)

  const clientesFormatados = clientes.map((c) => ({
    id: c.id,
    identificador: c.identificador,
    nomeExibicao: c.nomeExibicao,
    telefonePrincipal: c.telefonePrincipal,
    latitude: c.latitude,
    longitude: c.longitude,
    rotaId: c.rotaId,
    rota: c.rota,
    locacoesAtivas: c.locacoes.length,
    totalRecebido: c.cobrancas.filter((cb) => cb.status === 'Pago' || cb.status === 'Parcial').reduce((s, cb) => s + cb.valorRecebido, 0),
    totalPendente: c.cobrancas.filter((cb) => cb.status === 'Pendente' || cb.status === 'Atrasado' || cb.status === 'Parcial').reduce((s, cb) => s + (cb.totalClientePaga - cb.valorRecebido), 0),
  }))

  const rotasFormatadas = rotas.map((r) => ({
    id: r.id,
    descricao: r.descricao,
    cor: r.cor,
    totalClientes: r._count.clientes,
  }))

  return NextResponse.json({
    clientes: clientesFormatados,
    rotas: rotasFormatadas,
    stats: {
      totalClientes,
      clientesComCoordenadas,
      totalRecebido,
      totalPendente,
    },
  })
}
