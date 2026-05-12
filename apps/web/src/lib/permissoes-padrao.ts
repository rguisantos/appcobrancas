export const PERMISSOES_WEB_DEFAULT = {
  clientes: true,
  produtos: true,
  rotas: true,
  locacaoRelocacaoEstoque: true,
  cobrancas: true,
  manutencoes: true,
  relogios: true,
  relatorios: true,
  dashboard: true,
  agenda: true,
  mapa: true,
  adminCadastros: false,
  adminUsuarios: false,
  adminDispositivos: false,
  adminSincronizacao: false,
  adminAuditoria: false,
}

export const PERMISSOES_WEB_ADMIN = {
  clientes: true,
  produtos: true,
  rotas: true,
  locacaoRelocacaoEstoque: true,
  cobrancas: true,
  manutencoes: true,
  relogios: true,
  relatorios: true,
  dashboard: true,
  agenda: true,
  mapa: true,
  adminCadastros: true,
  adminUsuarios: true,
  adminDispositivos: true,
  adminSincronizacao: true,
  adminAuditoria: true,
}

export const PERMISSOES_WEB_SECRETARIO = {
  clientes: true,
  produtos: true,
  rotas: true,
  locacaoRelocacaoEstoque: true,
  cobrancas: true,
  manutencoes: true,
  relogios: true,
  relatorios: true,
  dashboard: true,
  agenda: true,
  mapa: true,
  adminCadastros: true,
  adminUsuarios: false,
  adminDispositivos: false,
  adminSincronizacao: false,
  adminAuditoria: false,
}

export const PERMISSOES_MOBILE_DEFAULT = {
  clientes: true,
  produtos: true,
  alteracaoRelogio: true,
  locacaoRelocacaoEstoque: true,
  cobrancasFaturas: true,
  manutencoes: true,
  relatorios: true,
  sincronizacao: true,
}

export function getPermissoesByTipo(tipo: string) {
  switch (tipo) {
    case 'Administrador':
      return {
        web: PERMISSOES_WEB_ADMIN,
        mobile: PERMISSOES_MOBILE_DEFAULT,
      }
    case 'Secretario':
      return {
        web: PERMISSOES_WEB_SECRETARIO,
        mobile: PERMISSOES_MOBILE_DEFAULT,
      }
    default:
      return {
        web: PERMISSOES_WEB_DEFAULT,
        mobile: PERMISSOES_MOBILE_DEFAULT,
      }
  }
}
