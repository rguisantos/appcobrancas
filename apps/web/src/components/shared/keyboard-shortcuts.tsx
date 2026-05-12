'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Keyboard, Navigation, Zap, Settings2 } from 'lucide-react'

interface ShortcutItem {
  keys: string[]
  description: string
}

interface ShortcutCategory {
  title: string
  icon: React.ReactNode
  items: ShortcutItem[]
}

const shortcutCategories: ShortcutCategory[] = [
  {
    title: 'Navegação',
    icon: <Navigation className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
    items: [
      { keys: ['⌘', '1-9'], description: 'Navegar para item do menu' },
      { keys: ['⌘', 'K'], description: 'Busca global' },
      { keys: ['Esc'], description: 'Fechar / Voltar' },
    ],
  },
  {
    title: 'Ações',
    icon: <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
    items: [
      { keys: ['N'], description: 'Novo (contextual)' },
      { keys: ['E'], description: 'Exportar dados' },
      { keys: ['R'], description: 'Atualizar dados' },
      { keys: ['P'], description: 'Imprimir' },
    ],
  },
  {
    title: 'Sistema',
    icon: <Settings2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
    items: [
      { keys: ['D'], description: 'Ir para Dashboard' },
      { keys: ['?'], description: 'Atalhos de teclado' },
      { keys: ['T'], description: 'Alternar tema' },
    ],
  },
]

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false)

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  // Listen for '?' key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return
      }

      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }

      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-card rounded-xl border shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900 p-2">
                    <Keyboard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Atalhos de Teclado</h2>
                    <p className="text-xs text-muted-foreground">Pressione ? para abrir a qualquer momento</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="rounded-md p-1.5 hover:bg-muted transition-colors"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Shortcuts Grid */}
              <div className="px-6 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
                {shortcutCategories.map((category) => (
                  <div key={category.title}>
                    <div className="flex items-center gap-2 mb-3">
                      {category.icon}
                      <h3 className="text-sm font-semibold text-foreground">{category.title}</h3>
                    </div>
                    <div className="space-y-2">
                      {category.items.map((item) => (
                        <div
                          key={item.description}
                          className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <span className="text-sm text-muted-foreground">{item.description}</span>
                          <div className="flex items-center gap-1">
                            {item.keys.map((key, i) => (
                              <span key={i}>
                                <kbd className="pointer-events-none inline-flex h-6 min-w-[24px] select-none items-center justify-center rounded-md border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground shadow-sm">
                                  {key}
                                </kbd>
                                {i < item.keys.length - 1 && (
                                  <span className="mx-0.5 text-[10px] text-muted-foreground/50">+</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t bg-muted/30">
                <p className="text-[10px] text-muted-foreground text-center">
                  ⌘ = Command no Mac · Ctrl no Windows/Linux
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
