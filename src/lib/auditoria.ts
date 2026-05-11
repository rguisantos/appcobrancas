import { db } from './db'

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
        detalhes: input.detalhes ? JSON.stringify(input.detalhes) : null,
        antes: input.antes ? JSON.stringify(input.antes) : null,
        depois: input.depois ? JSON.stringify(input.depois) : null,
        ip: input.ip,
        severidade: input.severidade || 'info',
        origem: input.origem || 'web',
      },
    })
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error)
  }
}
