import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { locacaoSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'
import { writeSyncLog } from '@/lib/sync-log'
import { handleApiError } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const searchParams = request.nextUrl.searchParams
    const groupBy = searchParams.get('groupBy') || ''

    // Grouped by route > client
    if (groupBy === 'route') {
      const status = searchParams.get('status') || ''
      const clienteId = searchParams.get('clienteId') || ''
      const produtoId = searchParams.get('produtoId') || ''

      const where: Record<string, unknown> = {
        deletedAt: null,
      }

      if (status) where.status = status
      if (clienteId) where.clienteId = clienteId
      if (produtoId) where.produtoId = produtoId

      const [locacoes, total] = await Promise.all([
        db.locacao.findMany({
          where,
          include: { cliente: { include: { rota: true } }, produto: true },
          orderBy: { createdAt: 'desc' },
        }),
        db.locacao.count({ where }),
      ])

      // Group by rota, then by cliente
      const rotaMap = new Map<string, {
        rota: { id: string; descricao: string; cor: string }
        clientesMap: Map<string, { cliente: { id: string; nomeExibicao: string }; locacoes: typeof locacoes }>
      }>()

      for (const loc of locacoes) {
        const rota = loc.cliente.rota
        const rotaKey = rota?.id || '__sem_rota__'
        const rotaInfo = rota
          ? { id: rota.id, descricao: rota.descricao, cor: rota.cor }
          : { id: '__sem_rota__', descricao: 'Sem Rota', cor: '#6B7280' }

        if (!rotaMap.has(rotaKey)) {
          rotaMap.set(rotaKey, { rota: rotaInfo, clientesMap: new Map() })
        }

        const rotaEntry = rotaMap.get(rotaKey)!
        const clienteKey = loc.clienteId

        if (!rotaEntry.clientesMap.has(clienteKey)) {
          rotaEntry.clientesMap.set(clienteKey, {
            cliente: { id: loc.cliente.id, nomeExibicao: loc.cliente.nomeExibicao },
            locacoes: [],
          })
        }

        rotaEntry.clientesMap.get(clienteKey)!.locacoes.push(loc)
      }

      const data = Array.from(rotaMap.values()).map(({ rota, clientesMap }) => ({
        rota,
        clientes: Array.from(clientesMap.values()),
      }))

      return NextResponse.json({ data, total })
    }

    // Default: flat paginated list
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    const status = searchParams.get('status') || ''
    const clienteId = searchParams.get('clienteId') || ''
    const produtoId = searchParams.get('produtoId') || ''

    const where: Record<string, unknown> = {
      deletedAt: null,
    }

    if (status) where.status = status
    if (clienteId) where.clienteId = clienteId
    if (produtoId) where.produtoId = produtoId

    const [data, total] = await Promise.all([
      db.locacao.findMany({
        where,
        skip,
        take: limit,
        include: { cliente: true, produto: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.locacao.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Erro ao buscar locações:', error)
    return NextResponse.json({ error: 'Erro ao buscar locações' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await request.json()
    const data = locacaoSchema.parse(body)

    // Buscar dados do cliente e produto para popular campos denormalizados
    const [cliente, produto] = await Promise.all([
      db.cliente.findFirst({ where: { id: data.clienteId, deletedAt: null } }),
      db.produto.findFirst({ where: { id: data.produtoId, deletedAt: null } }),
    ])

    if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 400 })
    if (!produto) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 400 })

    const locacao = await db.locacao.create({
      data: {
        clienteId: data.clienteId,
        clienteNome: cliente.nomeExibicao,
        produtoId: data.produtoId,
        produtoIdentificador: produto.identificador,
        produtoTipo: produto.tipoNome,
        dataLocacao: data.dataLocacao,
        dataFim: data.dataFim,
        formaPagamento: data.formaPagamento,
        numeroRelogio: data.numeroRelogio,
        precoFicha: data.precoFicha,
        percentualEmpresa: data.percentualEmpresa,
        percentualCliente: data.percentualCliente,
        valorFixo: data.valorFixo,
        periodicidade: data.periodicidade,
        dataPrimeiraCobranca: data.dataPrimeiraCobranca,
        observacoes: data.observacoes,
        trocaPano: data.trocaPano,
      },
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'criar_locacao',
      entidade: 'locacao',
      entidadeId: locacao.id,
      entidadeNome: `${cliente.nomeExibicao} - ${produto.identificador}`,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    await writeSyncLog('locacao', locacao.id, 'create', locacao as unknown as Record<string, unknown>, new Date())

    return NextResponse.json(locacao, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, 'Erro ao criar locacao')
  }
}
