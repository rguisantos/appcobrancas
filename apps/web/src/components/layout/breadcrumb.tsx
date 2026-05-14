'use client'

import { useNavigation, type ViewType } from '@/lib/store/navigation'
import { viewLabels } from '@/lib/view-labels'
import { ChevronRight } from 'lucide-react'

const viewParents: Record<string, string> = {
  'cliente-novo': 'clientes',
  'cliente-detalhe': 'clientes',
  'cliente-editar': 'clientes',
  'produto-novo': 'produtos',
  'produto-detalhe': 'produtos',
  'produto-editar': 'produtos',
  'locacao-nova': 'locacoes',
  'locacao-detalhe': 'locacoes',
  'locacao-editar': 'locacoes',
  'cobranca-nova': 'cobrancas',
  'cobranca-detalhe': 'cobrancas',
  'cobranca-editar': 'cobrancas',
  'manutencao-nova': 'manutencoes',
  'relogio-novo': 'relogios',
  'admin-usuario-novo': 'admin-usuarios',
  'admin-usuario-editar': 'admin-usuarios',
  'admin-rota-nova': 'admin-rotas',
  'admin-rota-editar': 'admin-rotas',
  'admin-meta-nova': 'admin-metas',
}

export function Breadcrumb() {
  const { currentView, navigate } = useNavigation()

  const items: Array<{ label: string; view: ViewType | null }> = [
    { label: 'Início', view: 'dashboard' },
  ]

  const parent = viewParents[currentView]
  if (parent) {
    items.push({ label: viewLabels[parent as ViewType] || parent, view: parent as ViewType })
  }

  if (currentView !== 'dashboard') {
    items.push({ label: viewLabels[currentView] || currentView, view: null })
  }

  if (items.length <= 1) return null

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
          {item.view ? (
            <button
              onClick={() => navigate(item.view!)}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
