import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const rotaId = request.nextUrl.searchParams.get('rotaId')
  if (!rotaId) {
    return NextResponse.json({ error: 'rotaId é obrigatório' }, { status: 400 })
  }

  // Verify route exists
  const rota = await db.rota.findFirst({ where: { id: rotaId, deletedAt: null } })
  if (!rota) {
    return NextResponse.json({ error: 'Rota não encontrada' }, { status: 404 })
  }

  // Fetch all clients on this route that have pending cobranças
  const clientes = await db.cliente.findMany({
    where: {
      rotaId,
      deletedAt: null,
      cobrancas: {
        some: {
          status: { in: ['Pendente', 'Atrasado', 'Parcial'] },
          deletedAt: null,
        },
      },
    },
    include: {
      cobrancas: {
        where: {
          status: { in: ['Pendente', 'Atrasado', 'Parcial'] },
          deletedAt: null,
        },
        select: {
          id: true,
          status: true,
          totalClientePaga: true,
          valorRecebido: true,
          dataVencimento: true,
        },
      },
    },
  })

  // Build client info with priority calculation
  type CobrancaInfo = {
    id: string
    status: string
    totalClientePaga: number
    valorRecebido: number
    dataVencimento: string | null
  }

  const clientInfos = clientes.map((cliente) => {
    const cobrancasAtrasadas = cliente.cobrancas.filter((c: CobrancaInfo) => c.status === 'Atrasado')
    const cobrancasPendentes = cliente.cobrancas.filter((c: CobrancaInfo) => c.status === 'Pendente')
    const cobrancasParciais = cliente.cobrancas.filter((c: CobrancaInfo) => c.status === 'Parcial')

    // Priority: atrasadas=1 (highest), pendentes=2, parciais=3
    let prioridade = 3
    let motivo = 'Cobranças parciais pendentes'

    if (cobrancasAtrasadas.length > 0) {
      prioridade = 1
      motivo = `${cobrancasAtrasadas.length} cobrança${cobrancasAtrasadas.length > 1 ? 's' : ''} atrasada${cobrancasAtrasadas.length > 1 ? 's' : ''}`
    } else if (cobrancasPendentes.length > 0) {
      prioridade = 2
      motivo = `${cobrancasPendentes.length} cobrança${cobrancasPendentes.length > 1 ? 's' : ''} pendente${cobrancasPendentes.length > 1 ? 's' : ''}`
    }

    return {
      clienteId: cliente.id,
      nomeExibicao: cliente.nomeExibicao,
      identificador: cliente.identificador,
      latitude: cliente.latitude,
      longitude: cliente.longitude,
      prioridade,
      motivo,
      cobrancasPendentes: cobrancasPendentes.length + cobrancasParciais.length,
      cobrancasAtrasadas: cobrancasAtrasadas.length,
    }
  })

  // Sort by priority first, then by geographic proximity (nearest-neighbor) or alphabetical
  clientInfos.sort((a, b) => a.prioridade - b.prioridade)

  const hasCoordinates = clientInfos.some((c) => c.latitude !== null && c.longitude !== null)

  if (hasCoordinates) {
    // Group by priority, then sort each group by nearest-neighbor
    const groups: Record<number, typeof clientInfos> = {}
    for (const client of clientInfos) {
      if (!groups[client.prioridade]) groups[client.prioridade] = []
      groups[client.prioridade].push(client)
    }

    const sortedResult: typeof clientInfos = []

    for (const priority of [1, 2, 3]) {
      const group = groups[priority] || []
      if (group.length === 0) continue

      // Nearest-neighbor starting from first in group
      const visited = new Set<string>()
      let current = group[0]
      visited.add(current.clienteId)
      sortedResult.push(current)

      while (visited.size < group.length) {
        let nearest: (typeof clientInfos)[0] | null = null
        let minDist = Infinity

        for (const candidate of group) {
          if (visited.has(candidate.clienteId)) continue

          const lat1 = current.latitude ?? 0
          const lon1 = current.longitude ?? 0
          const lat2 = candidate.latitude ?? 0
          const lon2 = candidate.longitude ?? 0

          const dist = Math.sqrt(
            Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2)
          )

          if (dist < minDist) {
            minDist = dist
            nearest = candidate
          }
        }

        if (nearest) {
          visited.add(nearest.clienteId)
          sortedResult.push(nearest)
          current = nearest
        } else {
          break
        }
      }
    }

    return NextResponse.json(
      sortedResult.map(({ latitude: _lat, longitude: _lon, ...rest }) => rest)
    )
  } else {
    // Alphabetical sort within each priority group
    const groups: Record<number, typeof clientInfos> = {}
    for (const client of clientInfos) {
      if (!groups[client.prioridade]) groups[client.prioridade] = []
      groups[client.prioridade].push(client)
    }

    const sortedResult: typeof clientInfos = []
    for (const priority of [1, 2, 3]) {
      const group = groups[priority] || []
      group.sort((a, b) => a.nomeExibicao.localeCompare(b.nomeExibicao))
      sortedResult.push(...group)
    }

    return NextResponse.json(
      sortedResult.map(({ latitude: _lat, longitude: _lon, ...rest }) => rest)
    )
  }
}
