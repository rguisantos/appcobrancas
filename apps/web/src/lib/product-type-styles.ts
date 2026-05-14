/**
 * Shared product type styling configuration.
 * Single source of truth for all product type visual representations
 * (icons, gradients, colors, bar charts).
 *
 * Previously duplicated in: dashboard-view, produtos-view, locacoes-view.
 */

import {
  Table2,
  Gamepad2,
  Music,
  Wind,
  Cigarette,
  Coffee,
  Trophy,
  Box,
  Dices,
  Disc3,
  CircleDot,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface ProductTypeStyle {
  icon: LucideIcon
  gradient: string
  iconBg: string
  iconColor: string
  barColor: string
  label: string
}

const PRODUCT_TYPE_STYLES: Array<{ matches: string[]; style: ProductTypeStyle }> = [
  {
    matches: ['bilhar'],
    style: {
      icon: Table2,
      gradient: 'from-emerald-50 to-emerald-100/60 dark:from-emerald-950 dark:to-emerald-900/40',
      iconBg: 'bg-emerald-200 dark:bg-emerald-800',
      iconColor: 'text-emerald-700 dark:text-emerald-300',
      barColor: '#16a34a',
      label: 'Bilhar',
    },
  },
  {
    matches: ['pebolim'],
    style: {
      icon: Gamepad2,
      gradient: 'from-amber-50 to-amber-100/60 dark:from-amber-950 dark:to-amber-900/40',
      iconBg: 'bg-amber-200 dark:bg-amber-800',
      iconColor: 'text-amber-700 dark:text-amber-300',
      barColor: '#d97706',
      label: 'Pebolim',
    },
  },
  {
    matches: ['jukebox', 'música', 'musica'],
    style: {
      icon: Music,
      gradient: 'from-rose-50 to-rose-100/60 dark:from-rose-950 dark:to-rose-900/40',
      iconBg: 'bg-rose-200 dark:bg-rose-800',
      iconColor: 'text-rose-700 dark:text-rose-300',
      barColor: '#e11d48',
      label: 'Jukebox/Música',
    },
  },
  {
    matches: ['air hockey', 'hockey'],
    style: {
      icon: Wind,
      gradient: 'from-sky-50 to-sky-100/60 dark:from-sky-950 dark:to-sky-900/40',
      iconBg: 'bg-sky-200 dark:bg-sky-800',
      iconColor: 'text-sky-700 dark:text-sky-300',
      barColor: '#0284c7',
      label: 'Air Hockey',
    },
  },
  {
    matches: ['fumaça', 'fumaca', 'cigarro'],
    style: {
      icon: Cigarette,
      gradient: 'from-violet-50 to-violet-100/60 dark:from-violet-950 dark:to-violet-900/40',
      iconBg: 'bg-violet-200 dark:bg-violet-800',
      iconColor: 'text-violet-700 dark:text-violet-300',
      barColor: '#7c3aed',
      label: 'Máq. Fumaça',
    },
  },
  {
    matches: ['café', 'cafe'],
    style: {
      icon: Coffee,
      gradient: 'from-orange-50 to-orange-100/60 dark:from-orange-950 dark:to-orange-900/40',
      iconBg: 'bg-orange-200 dark:bg-orange-800',
      iconColor: 'text-orange-700 dark:text-orange-300',
      barColor: '#ea580c',
      label: 'Café',
    },
  },
  {
    matches: ['dart', 'dardo'],
    style: {
      icon: Trophy,
      gradient: 'from-teal-50 to-teal-100/60 dark:from-teal-950 dark:to-teal-900/40',
      iconBg: 'bg-teal-200 dark:bg-teal-800',
      iconColor: 'text-teal-700 dark:text-teal-300',
      barColor: '#0d9488',
      label: 'Dardo',
    },
  },
  {
    matches: ['box', 'caixa'],
    style: {
      icon: Box,
      gradient: 'from-slate-50 to-slate-100/60 dark:from-slate-950 dark:to-slate-900/40',
      iconBg: 'bg-slate-200 dark:bg-slate-700',
      iconColor: 'text-slate-700 dark:text-slate-300',
      barColor: '#475569',
      label: 'Box',
    },
  },
  {
    matches: ['pinball', 'fliperama'],
    style: {
      icon: Dices,
      gradient: 'from-pink-50 to-pink-100/60 dark:from-pink-950 dark:to-pink-900/40',
      iconBg: 'bg-pink-200 dark:bg-pink-800',
      iconColor: 'text-pink-700 dark:text-pink-300',
      barColor: '#db2777',
      label: 'Pinball',
    },
  },
  {
    matches: ['discoteca', 'disco', 'totem'],
    style: {
      icon: Disc3,
      gradient: 'from-fuchsia-50 to-fuchsia-100/60 dark:from-fuchsia-950 dark:to-fuchsia-900/40',
      iconBg: 'bg-fuchsia-200 dark:bg-fuchsia-800',
      iconColor: 'text-fuchsia-700 dark:text-fuchsia-300',
      barColor: '#c026d3',
      label: 'Discoteca',
    },
  },
]

const DEFAULT_STYLE: ProductTypeStyle = {
  icon: CircleDot,
  gradient: 'from-gray-50 to-gray-100/60 dark:from-gray-900 dark:to-gray-800/40',
  iconBg: 'bg-gray-200 dark:bg-gray-700',
  iconColor: 'text-gray-700 dark:text-gray-300',
  barColor: '#6b7280',
  label: 'Outro',
}

/**
 * Get the complete style configuration for a product type.
 * Matches case-insensitively against the product type name.
 */
export function getProductTypeStyle(tipoNome: string): ProductTypeStyle {
  const lowerName = tipoNome?.toLowerCase() || ''
  for (const entry of PRODUCT_TYPE_STYLES) {
    if (entry.matches.some(m => lowerName.includes(m))) {
      return entry.style
    }
  }
  return DEFAULT_STYLE
}

/**
 * Get just the icon component for a product type.
 * Useful when you only need the icon without gradient/color info.
 */
export function getProductTypeIcon(tipoNome: string): LucideIcon {
  return getProductTypeStyle(tipoNome).icon
}

/**
 * Get the icon + combined color class string for a product type.
 * Returns format like "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900"
 */
export function getProductTypeIconColor(tipoNome: string): string {
  const style = getProductTypeStyle(tipoNome)
  return style.iconColor + ' ' + style.iconBg
}

/**
 * Get the bar chart color for a product type.
 */
export function getProductTypeBarColor(tipoNome: string): string {
  return getProductTypeStyle(tipoNome).barColor
}
