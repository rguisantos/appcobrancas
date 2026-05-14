import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { toNumber } from '@/lib/decimal'
import { handleApiError } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const { searchParams } = new URL(request.url)
  const rotaId = searchParams.get('rotaId') || undefined

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const whereCliente: Record<string, unknown> = {
    deletedAt: null,
    status: 'Ativo',
  }

  if (rotaId) {
    whereCliente.rotaId = rotaId
  }

  const [clientes, rotas] = await Promise.all([
    db.cliente.findMany({
      where: whereCliente,
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
            cobrancas: {
              where: { deletedAt: null },
              select: {
                id: true,
                status: true,
                totalClientePaga: true,
                valorRecebido: true,
                dataVencimento: true,
                dataFim: true,
              },
              orderBy: { dataFim: 'desc' },
              take: 1,
            },
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
            dataFim: true,
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
    return acc + c.cobrancas.filter((cb) => cb.status === 'Pago' || cb.status === 'Parcial').reduce((s, cb) => s + toNumber(cb.valorRecebido), 0)
  }, 0)

  const totalPendente = clientes.reduce((acc, c) => {
    return acc + c.cobrancas.filter((cb) => cb.status === 'Pendente' || cb.status === 'Atrasado' || cb.status === 'Parcial').reduce((s, cb) => s + (toNumber(cb.totalClientePaga) - toNumber(cb.valorRecebido)), 0)
  }, 0)

  const clientesFormatados = clientes.map((c) => {
    const cobrancasPendentes = c.cobrancas.filter((cb) => cb.status === 'Pendente').length
    const cobrancasAtrasadas = c.cobrancas.filter((cb) => cb.status === 'Atrasado').length
    const cobrancasPagas = c.cobrancas.filter((cb) => cb.status === 'Pago').length
    const cobrancasParciais = c.cobrancas.filter((cb) => cb.status === 'Parcial').length
    const totalPendenteCliente = c.cobrancas
      .filter((cb) => cb.status === 'Pendente' || cb.status === 'Atrasado' || cb.status === 'Parcial')
      .reduce((s, cb) => s + (toNumber(cb.totalClientePaga) - toNumber(cb.valorRecebido)), 0)

    // Determine pendenteCobranca: client has active locações but no cobrança for the current month
    const pendenteCobranca = c.locacoes.length > 0 && !c.cobrancas.some(cb => {
      const dataFim = new Date(cb.dataFim)
      return dataFim.getMonth() === currentMonth && dataFim.getFullYear() === currentYear
    })

    // Build detailed locações info with last cobrança
    const locacoesDetalhes = c.locacoes.map((l) => {
      const lastCobranca = l.cobrancas[0] || null
      return {
        id: l.id,
        produtoIdentificador: l.produtoIdentificador,
        produtoTipo: l.produtoTipo,
        ultimaCobranca: lastCobranca
          ? {
              id: lastCobranca.id,
              status: lastCobranca.status,
              totalClientePaga: toNumber(lastCobranca.totalClientePaga),
              valorRecebido: toNumber(lastCobranca.valorRecebido),
              saldoDevedor: toNumber(lastCobranca.totalClientePaga) - toNumber(lastCobranca.valorRecebido),
              dataVencimento: lastCobranca.dataVencimento,
              dataFim: lastCobranca.dataFim,
            }
          : null,
      }
    })

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
      locacoesDetalhes,
      cobrancasResumo: {
        pendente: cobrancasPendentes,
        atrasado: cobrancasAtrasadas,
        pago: cobrancasPagas,
        parcial: cobrancasParciais,
      },
      totalRecebido: c.cobrancas.filter((cb) => cb.status === 'Pago' || cb.status === 'Parcial').reduce((s, cb) => s + toNumber(cb.valorRecebido), 0),
      totalPendente: totalPendenteCliente,
      temAtrasado: cobrancasAtrasadas > 0,
      pendenteCobranca,
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
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar dados do mapa')
  }
}
