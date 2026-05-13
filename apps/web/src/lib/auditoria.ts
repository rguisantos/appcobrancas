import { db } from './db'
import { Prisma } from '@prisma/client'

type Severidade = 'info' | 'aviso' | 'critico' | 'seguranca'
type Origem = 'web' | 'mobile' | 'sistema' | 'cron'

interface AuditoriaInput {
  usuarioId?: string
  acao: string
  entidade: string
  entidadeId?: string
  entidadeNome?: string
  detalhes?: Record<string, unknown>
  antes?: Record<string, unknown>
  depois?: Record<string, unknown>
  ip?: string
  severidade?: Severidade
  origem?: Origem
}

export async function registrarAuditoria(input: AuditoriaInput) {
  try {
    await db.logAuditoria.create({
      data: {
        usuarioId: input.usuarioId,
        acao: input.acao,
        entidade: input.entidade,
        entidadeId: input.entidadeId,
        entidadeNome: input.entidadeNome,
        detalhes: input.detalhes ? (input.detalhes as Prisma.InputJsonValue) : Prisma.JsonNull,
        antes: input.antes ? (input.antes as Prisma.InputJsonValue) : Prisma.JsonNull,
        depois: input.depois ? (input.depois as Prisma.InputJsonValue) : Prisma.JsonNull,
        ip: input.ip,
        severidade: input.severidade || 'info',
        origem: input.origem || 'web',
      },
    })
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error)
  }
}
