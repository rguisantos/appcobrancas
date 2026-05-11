'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusConfig: Record<string, { label: string; className: string }> = {
  // Cobrança statuses
  Pago: {
    label: 'Pago',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  Pendente: {
    label: 'Pendente',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  Parcial: {
    label: 'Parcial',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  },
  Atrasado: {
    label: 'Atrasado',
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
  // Locação statuses
  Ativa: {
    label: 'Ativa',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  Encerrada: {
    label: 'Encerrada',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  },
  // Cliente statuses
  Ativo: {
    label: 'Ativo',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  Inativo: {
    label: 'Inativo',
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
  // Produto statuses
  Manutenção: {
    label: 'Manutenção',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  },
  // Manutenção statuses
  EmAndamento: {
    label: 'Em Andamento',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  },
  Concluida: {
    label: 'Concluída',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  Cancelada: {
    label: 'Cancelada',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  },
  // Meta statuses
  ativa: {
    label: 'Ativa',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  concluida: {
    label: 'Concluída',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
}

export function StatusBadge({ status, className, size }: { status: string; className?: string; size?: 'default' | 'pill' }) {
  const config = statusConfig[status]

  if (!config) {
    return (
      <Badge variant="outline" className={cn('text-xs', className)}>
        {status}
      </Badge>
    )
  }

  if (size === 'pill') {
    const dotColors: Record<string, string> = {
      Pago: 'bg-green-500',
      Pendente: 'bg-yellow-500',
      Parcial: 'bg-orange-500',
      Atrasado: 'bg-red-500',
      Ativa: 'bg-green-500',
      Encerrada: 'bg-gray-400',
      Ativo: 'bg-green-500',
      Inativo: 'bg-red-500',
      'Manutenção': 'bg-purple-500',
      EmAndamento: 'bg-orange-500',
      Concluida: 'bg-green-500',
      Cancelada: 'bg-gray-400',
      ativa: 'bg-green-500',
      concluida: 'bg-blue-500',
    }
    return (
      <span className={cn('status-badge border-0', config.className, className)}>
        <span className={cn('h-1.5 w-1.5 rounded-full', dotColors[status] || 'bg-gray-400')} />
        {config.label}
      </span>
    )
  }

  return (
    <Badge variant="outline" className={cn('text-xs border-0', config.className, className)}>
      {config.label}
    </Badge>
  )
}
