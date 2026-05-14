/**
 * Shared date formatting utilities.
 * Previously duplicated across: cobrancas-view, cobranca-detalhe-view,
 * manutencoes-view, admin-auditoria-view, perfil-view, dashboard-view,
 * cliente-detalhe-view.
 */

import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Format an ISO date string to dd/MM/yyyy.
 * Returns the fallback string (default: '—') for null/undefined/empty values.
 */
export function formatDate(
  dateStr: string | null | undefined,
  fallback: string = '—'
): string {
  if (!dateStr) return fallback
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy')
  } catch {
    return dateStr
  }
}

/**
 * Format an ISO date string with time: dd/MM/yyyy HH:mm.
 */
export function formatDateTime(
  dateStr: string | null | undefined,
  fallback: string = '—'
): string {
  if (!dateStr) return fallback
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy HH:mm')
  } catch {
    return dateStr
  }
}

/**
 * Get a relative time string like "há 3 dias", "há 2 horas".
 */
export function getRelativeTime(
  date: string | Date | null | undefined,
  fallback: string = '—'
): string {
  if (!date) return fallback
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: ptBR })
  } catch {
    return fallback
  }
}

/**
 * Format a month key (yyyy-MM) to a more readable format (MMM yyyy).
 */
export function formatMonthKey(
  monthKey: string,
  fallback: string = monthKey
): string {
  try {
    const [year, month] = monthKey.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, 1)
    return format(date, 'MMM yyyy', { locale: ptBR })
  } catch {
    return fallback
  }
}
