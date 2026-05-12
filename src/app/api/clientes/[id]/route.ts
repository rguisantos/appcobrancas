import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { clienteSchema } from '@/lib/validations'
import { registrarAuditoria } from '@/lib/auditoria'
import { generateUniqueIdentifier } from '@/lib/auto-identifier'

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
    console.error('Erro ao buscar cliente:', error)
    return NextResponse.json({ error: 'Erro ao buscar cliente' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

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
      data: { ...data, version: { increment: 1 } },
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

    return NextResponse.json(cliente)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar cliente' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

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
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar cliente' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

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

  return NextResponse.json({ message: 'Cliente excluído com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir cliente:', error)
    return NextResponse.json({ error: 'Erro ao excluir cliente' }, { status: 500 })
  }
}
