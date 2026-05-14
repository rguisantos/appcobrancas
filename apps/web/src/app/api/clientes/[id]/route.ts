import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getAuthSession } from '@/lib/auth-jwt'
import { requireMutationRole, requireAdmin } from '@/lib/rbac'
import { clienteSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'
import { generateUniqueIdentifier } from '@/lib/auto-identifier'
import { writeSyncLog } from '@/lib/sync-log'
import { handleApiError } from '@/lib/api-utils'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const { id } = await params
  const cliente = await db.cliente.findFirst({
    where: { id, deletedAt: null },
    include: { rota: true, locacoes: { where: { deletedAt: null } }, cobrancas: { where: { deletedAt: null } } },
  })

  if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
  return NextResponse.json(cliente)
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar cliente')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  const { id } = await params
  const existing = await db.cliente.findFirst({ where: { id, deletedAt: null } })
  if (!existing) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  try {
    const body = await request.json()
    const data = clienteSchema.parse(body)

    // Preserve existing identifier - don't allow changing it
    // If identifier was somehow cleared, keep the original
    if (!data.identificador || data.identificador.trim() === '') {
      data.identificador = existing.identificador
    } else if (data.identificador !== existing.identificador) {
      // If they're trying to change it, keep the original
      data.identificador = existing.identificador
    }

    const antes = existing as Record<string, unknown>

    const cliente = await db.cliente.update({
      where: { id },
      data: {
        ...data,
        contatos: data.contatos ? (data.contatos as unknown as Prisma.InputJsonValue) : undefined,
        version: { increment: 1 },
      },
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'atualizar_cliente',
      entidade: 'cliente',
      entidadeId: cliente.id,
      entidadeNome: cliente.nomeExibicao,
      antes,
      depois: data as Record<string, unknown>,
      severidade: 'info',
    })

    await writeSyncLog('cliente', cliente.id, 'update', cliente as unknown as Record<string, unknown>, new Date())

    return NextResponse.json(cliente)
  } catch (error: unknown) {
    return handleApiError(error, 'Erro ao atualizar cliente')
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireMutationRole()
  if (!authorized || !session) return response

  const { id } = await params
  const existing = await db.cliente.findFirst({ where: { id, deletedAt: null } })
  if (!existing) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  try {
    const body = await request.json()
    const allowedFields = ['status']
    const updateData: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (body[key] !== undefined) updateData[key] = body[key]
    }

    // Validate status value against allowed enum
    if (updateData.status !== undefined && !['Ativo', 'Inativo'].includes(updateData.status as string)) {
      return NextResponse.json({ error: 'status deve ser "Ativo" ou "Inativo"' }, { status: 400 })
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
    }

    const antes = existing as Record<string, unknown>
    const cliente = await db.cliente.update({
      where: { id },
      data: { ...updateData, version: { increment: 1 } },
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'atualizar_cliente',
      entidade: 'cliente',
      entidadeId: cliente.id,
      entidadeNome: cliente.nomeExibicao,
      antes,
      depois: updateData as Record<string, unknown>,
      severidade: 'info',
    })

    return NextResponse.json(cliente)
  } catch (error) {
    return handleApiError(error, 'Erro ao atualizar cliente')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireAdmin()
  if (!authorized || !session) return response

  try {
  const { id } = await params
  const existing = await db.cliente.findFirst({ where: { id, deletedAt: null } })
  if (!existing) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  const cliente = await db.cliente.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: 'excluir_cliente',
    entidade: 'cliente',
    entidadeId: cliente.id,
    entidadeNome: cliente.nomeExibicao,
    antes: existing as Record<string, unknown>,
    severidade: 'aviso',
  })

  await writeSyncLog('cliente', cliente.id, 'delete', null, new Date())

  return NextResponse.json({ message: 'Cliente excluído com sucesso' })
  } catch (error) {
    return handleApiError(error, 'Erro ao excluir cliente')
  }
}
