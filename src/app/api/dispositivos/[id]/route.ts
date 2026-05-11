import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { registrarAuditoria } from '@/lib/auditoria'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

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
}
