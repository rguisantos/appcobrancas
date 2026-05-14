import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/rbac'
import { registrarAuditoria } from '@/lib/auditoria'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response, session } = await requireAdmin()
  if (!authorized || !session) return response

  try {
  const { id } = await params
  const existing = await db.dispositivo.findFirst({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Dispositivo não encontrado' }, { status: 404 })

  await db.dispositivo.delete({ where: { id } })

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: 'excluir_dispositivo',
    entidade: 'dispositivo',
    entidadeId: id,
    entidadeNome: existing.nome,
    antes: { ...existing, senha: '[REDACTED]' } as Record<string, unknown>,
    severidade: 'seguranca',
  })

  return NextResponse.json({ message: 'Dispositivo excluído com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir dispositivo:', error)
    return NextResponse.json({ error: 'Erro ao excluir dispositivo' }, { status: 500 })
  }
}
