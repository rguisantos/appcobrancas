import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/rbac'
import { z } from 'zod/v4'
import { registrarAuditoria } from '@/lib/auditoria'
import { hashPassword } from '@/lib/hash'
import { handleApiError } from '@/lib/api-utils'

const dispositivoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  deviceKey: z.string().min(1, 'Chave do dispositivo é obrigatória'),
  senha: z.string().min(1, 'Senha é obrigatória'),
  ativo: z.boolean().default(false),
  usuarioId: z.string().optional(),
})

export async function GET() {
  const { authorized, response, session } = await requireAdmin()
  if (!authorized || !session) return response

  try {
  const data = await db.dispositivo.findMany({
    select: {
      id: true,
      nome: true,
      // deviceKey excluded — sensitive authentication credential
      ativo: true,
      usuarioId: true,
      ultimoSync: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar dispositivos')
  }
}

export async function POST(request: NextRequest) {
  const { authorized, response, session } = await requireAdmin()
  if (!authorized || !session) return response

  try {
    const body = await request.json()
    const data = dispositivoSchema.parse(body)
    const hashedSenha = await hashPassword(data.senha)
    const dispositivo = await db.dispositivo.create({
      data: {
        nome: data.nome,
        deviceKey: data.deviceKey,
        senha: hashedSenha,
        ativo: data.ativo,
        usuarioId: data.usuarioId,
      },
    })

    await registrarAuditoria({
      usuarioId: session.userId,
      acao: 'criar_dispositivo',
      entidade: 'dispositivo',
      entidadeId: dispositivo.id,
      entidadeNome: dispositivo.nome,
      depois: { ...data, senha: '[REDACTED]' } as Record<string, unknown>,
      severidade: 'seguranca',
    })

    const { senha: _senha, ...dispositivoSafe } = dispositivo
    return NextResponse.json(dispositivoSafe, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, 'Erro ao criar dispositivo')
  }
}
