import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { requireMutationRole } from '@/lib/rbac'
import { cobrancaSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'
import { calcularCobranca, calcularSaldoDevedor } from '@/lib/cobranca-calculos'
import { writeSyncLog } from '@/lib/sync-log'
import { handleApiError, safeLimit, safePage } from '@/lib/api-utils'
import { toNumber } from '@/lib/decimal'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const searchParams = request.nextUrl.searchParams
    const groupBy = searchParams.get('groupBy') || ''

    // Helper to build where clause from search params
    const buildWhere = () => {
      const statusParam = searchParams.get('status') || ''
      const clienteId = searchParams.get('clienteId') || ''
      const locacaoId = searchParams.get('locacaoId') || ''
      const periodoInicio = searchParams.get('periodoInicio') || ''
      const periodoFim = searchParams.get('periodoFim') || ''

      const where: Record<string, unknown> = {
        deletedAt: null,
      }

      if (statusParam) {
        const statuses = statusParam.split(',')
        if (statuses.length === 1) {
          where.status = statuses[0]
        } else {
          where.status = { in: statuses }
        }
      }
      if (clienteId) where.clienteId = clienteId
      if (locacaoId) where.locacaoId = locacaoId

      if (periodoInicio && periodoFim) {
        where.AND = [
          { dataInicio: { gte: periodoInicio } },
          { dataFim: { lte: periodoFim } },
        ]
      }

      return where
    }

    // Grouped by route > client > locação
    if (groupBy === 'route') {
      const where = buildWhere()
      // Apply a reasonable limit to grouped views to prevent OOM
      const groupLimit = safeLimit(searchParams.get('limit'), 500)

      const [cobrancas, total] = await Promise.all([
        db.cobranca.findMany({
          where,
          include: { locacao: true, cliente: { include: { rota: true } }, produto: true },
          orderBy: { createdAt: 'desc' },
          take: groupLimit,
        }),
        db.cobranca.count({ where }),
      ])

      // Group by rota, then by cliente, then by locação
      const rotaMap = new Map<string, {
        rota: { id: string; descricao: string; cor: string }
        clientesMap: Map<string, {
          cliente: { id: string; nomeExibicao: string }
          locacoesMap: Map<string, {
            locacaoId: string
            produtoIdentificador: string
            cobrancas: typeof cobrancas
          }>
        }>
      }>()

      for (const cob of cobrancas) {
        const rota = cob.cliente.rota
        const rotaKey = rota?.id || '__sem_rota__'
        const rotaInfo = rota
          ? { id: rota.id, descricao: rota.descricao, cor: rota.cor }
          : { id: '__sem_rota__', descricao: 'Sem Rota', cor: '#6B7280' }

        if (!rotaMap.has(rotaKey)) {
          rotaMap.set(rotaKey, { rota: rotaInfo, clientesMap: new Map() })
        }

        const rotaEntry = rotaMap.get(rotaKey)!
        const clienteKey = cob.clienteId

        if (!rotaEntry.clientesMap.has(clienteKey)) {
          rotaEntry.clientesMap.set(clienteKey, {
            cliente: { id: cob.cliente.id, nomeExibicao: cob.cliente.nomeExibicao },
            locacoesMap: new Map(),
          })
        }

        const clienteEntry = rotaEntry.clientesMap.get(clienteKey)!
        const locKey = cob.locacaoId

        if (!clienteEntry.locacoesMap.has(locKey)) {
          clienteEntry.locacoesMap.set(locKey, {
            locacaoId: cob.locacaoId,
            produtoIdentificador: cob.produtoIdentificador,
            cobrancas: [],
          })
        }

        clienteEntry.locacoesMap.get(locKey)!.cobrancas.push(cob)
      }

      const data = Array.from(rotaMap.values()).map(({ rota, clientesMap }) => ({
        rota,
        clientes: Array.from(clientesMap.values()).map(({ cliente, locacoesMap }) => ({
          cliente,
          locacoes: Array.from(locacoesMap.values()),
        })),
      }))

      return NextResponse.json({ data, total })
    }

    // Default: flat paginated list
    const page = safePage(searchParams.get('page'))
    const limit = safeLimit(searchParams.get('limit'))
    const skip = (page - 1) * limit
    const where = buildWhere()

    const [data, total] = await Promise.all([
      db.cobranca.findMany({
        where,
        skip,
        take: limit,
        include: { locacao: true, cliente: true, produto: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.cobranca.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Erro ao buscar cobranças:', error)
    return NextResponse.json({ error: 'Erro ao buscar cobranças' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  try {
    const body = await request.json()
    const data = cobrancaSchema.parse(body)

    // Buscar locação para obter dados financeiros
    const locacao = await db.locacao.findFirst({
      where: { id: data.locacaoId, deletedAt: null },
    })

    if (!locacao) return NextResponse.json({ error: 'Locação não encontrada' }, { status: 400 })

    // Buscar dados do cliente e produto
    const [cliente, produto] = await Promise.all([
      db.cliente.findFirst({ where: { id: locacao.clienteId, deletedAt: null } }),
      db.produto.findFirst({ where: { id: locacao.produtoId, deletedAt: null } }),
    ])

    if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 400 })
    if (!produto) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 400 })

    // Calcular valores da cobrança
    const calcResult = calcularCobranca({
      formaPagamento: locacao.formaPagamento as 'Periodo' | 'PercentualPagar' | 'PercentualReceber',
      relogioAnterior: data.relogioAnterior,
      relogioAtual: data.relogioAtual,
      precoFicha: toNumber(locacao.precoFicha),
      percentualEmpresa: toNumber(locacao.percentualEmpresa),
      valorFixo: locacao.valorFixo != null ? toNumber(locacao.valorFixo) : undefined,
      descontoPartidasQtd: data.descontoPartidasQtd,
      descontoPartidasValor: data.descontoPartidasValor,
      descontoDinheiro: data.descontoDinheiro,
    })

    // Calcular saldo devedor
    const { saldoDevedorGerado } = calcularSaldoDevedor(calcResult.totalClientePaga, data.valorRecebido)

    // Data de vencimento = dataFim
    const dataVencimento = new Date(data.dataFim)

    // Se status é Pago ou Parcial, dataPagamento = now
    const dataPagamento = (data.status === 'Pago' || data.status === 'Parcial')
      ? new Date()
      : null

    const cobranca = await db.cobranca.create({
      data: {
        locacaoId: data.locacaoId,
        clienteId: locacao.clienteId,
        clienteNome: cliente.nomeExibicao,
        produtoId: locacao.produtoId,
        produtoIdentificador: locacao.produtoIdentificador,
        dataInicio: new Date(data.dataInicio),
        dataFim: new Date(data.dataFim),
        dataPagamento,
        dataVencimento,
        relogioAnterior: data.relogioAnterior,
        relogioAtual: data.relogioAtual,
        fichasRodadas: calcResult.fichasRodadas,
        valorFicha: locacao.precoFicha,
        totalBruto: calcResult.totalBruto,
        descontoPartidasQtd: data.descontoPartidasQtd,
        descontoPartidasValor: data.descontoPartidasValor,
        descontoDinheiro: data.descontoDinheiro,
        percentualEmpresa: locacao.percentualEmpresa,
        subtotalAposDescontos: calcResult.subtotalAposDescontos,
        valorPercentual: calcResult.valorPercentual,
        totalClientePaga: calcResult.totalClientePaga,
        valorRecebido: data.valorRecebido,
        saldoDevedorGerado,
        status: data.status,
        formaPagamento: locacao.formaPagamento,
        observacao: data.observacao,
      },
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'criar_cobranca',
      entidade: 'cobranca',
      entidadeId: cobranca.id,
      entidadeNome: `${cliente.nomeExibicao} - ${data.dataInicio}/${data.dataFim}`,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    await writeSyncLog('cobranca', cobranca.id, 'create', cobranca as unknown as Record<string, unknown>, new Date())

    return NextResponse.json(cobranca, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, 'Erro ao criar cobranca')
  }
}
