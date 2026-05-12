import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'
import { z } from 'zod/v4'
import { registrarAuditoria } from '@/lib/auditoria'

const dispositivoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  deviceKey: z.string().min(1, 'Chave do dispositivo é obrigatória'),
  senha: z.string().min(1, 'Senha é obrigatória'),
  ativo: z.boolean().default(false),
  usuarioId: z.string().optional(),
})

export async function GET() {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
  const data = await db.dispositivo.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao buscar dispositivos:', error)
    return NextResponse.json({ error: 'Erro ao buscar dispositivos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await request.json()
    const data = dispositivoSchema.parse(body)
    const dispositivo = await db.dispositivo.create({ data })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'criar_dispositivo',
      entidade: 'dispositivo',
      entidadeId: dispositivo.id,
      entidadeNome: dispositivo.nome,
      depois: { ...data, senha: '[REDACTED]' } as Record<string, unknown>,
      severidade: 'seguranca',
    })

    return NextResponse.json(dispositivo, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao criar dispositivo' }, { status: 500 })
  }
}
