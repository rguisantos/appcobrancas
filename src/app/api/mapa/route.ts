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
          select: {
            id: true,
            produtoIdentificador: true,
            produtoTipo: true,
          },
        },
        cobrancas: {
          where: { deletedAt: null },
          select: {
            id: true,
            totalClientePaga: true,
            valorRecebido: true,
            status: true,
            produtoIdentificador: true,
            dataVencimento: true,
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

  const clientesComCoordenadas = clientes.filter(
    (c) => c.latitude != null && c.longitude != null
  ).length

  const totalRecebido = clientes.reduce((acc, c) => {
    return acc + c.cobrancas.filter((cb) => cb.status === 'Pago' || cb.status === 'Parcial').reduce((s, cb) => s + cb.valorRecebido, 0)
  }, 0)

  const totalPendente = clientes.reduce((acc, c) => {
    return acc + c.cobrancas.filter((cb) => cb.status === 'Pendente' || cb.status === 'Atrasado' || cb.status === 'Parcial').reduce((s, cb) => s + (cb.totalClientePaga - cb.valorRecebido), 0)
  }, 0)

  const clientesFormatados = clientes.map((c) => {
    const cobrancasPendentes = c.cobrancas.filter((cb) => cb.status === 'Pendente').length
    const cobrancasAtrasadas = c.cobrancas.filter((cb) => cb.status === 'Atrasado').length
    const cobrancasPagas = c.cobrancas.filter((cb) => cb.status === 'Pago').length
    const cobrancasParciais = c.cobrancas.filter((cb) => cb.status === 'Parcial').length
    const totalPendenteCliente = c.cobrancas
      .filter((cb) => cb.status === 'Pendente' || cb.status === 'Atrasado' || cb.status === 'Parcial')
      .reduce((s, cb) => s + (cb.totalClientePaga - cb.valorRecebido), 0)

    return {
      id: c.id,
      identificador: c.identificador,
      nomeExibicao: c.nomeExibicao,
      telefonePrincipal: c.telefonePrincipal,
      latitude: c.latitude,
      longitude: c.longitude,
      rotaId: c.rotaId,
      rota: c.rota,
      locacoesAtivas: c.locacoes.map((l) => l.produtoIdentificador),
      cobrancasResumo: {
        pendente: cobrancasPendentes,
        atrasado: cobrancasAtrasadas,
        pago: cobrancasPagas,
        parcial: cobrancasParciais,
      },
      totalRecebido: c.cobrancas.filter((cb) => cb.status === 'Pago' || cb.status === 'Parcial').reduce((s, cb) => s + cb.valorRecebido, 0),
      totalPendente: totalPendenteCliente,
      temAtrasado: cobrancasAtrasadas > 0,
    }
  })

  const rotasFormatadas = rotas.map((r) => ({
    id: r.id,
    descricao: r.descricao,
    cor: r.cor,
    totalClientes: r._count.clientes,
  }))

  // Separate clients with and without coordinates
  const clientesNoMapa = clientesFormatados.filter((c) => c.latitude != null && c.longitude != null)
  const clientesSemCoordenadas = clientesFormatados.filter((c) => c.latitude == null || c.longitude == null)

  return NextResponse.json({
    clientes: clientesNoMapa,
    clientesSemCoordenadas,
    rotas: rotasFormatadas,
    stats: {
      totalClientes: clientes.length,
      clientesComCoordenadas,
      totalRecebido,
      totalPendente,
    },
  })
}
