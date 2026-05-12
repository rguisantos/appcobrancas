import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '@/theme/colors'
import { borderRadius, fontSize, spacing } from '@/theme/spacing'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const statusColors: Record<string, { bg: string; text: string }> = {
  Pago: { bg: '#dcfce7', text: colors.statusPago },
  Pendente: { bg: '#fef9c3', text: colors.statusPendente },
  Atrasado: { bg: '#fee2e2', text: colors.statusAtrasado },
  Parcial: { bg: '#dbeafe', text: colors.statusParcial },
  Ativo: { bg: '#dcfce7', text: colors.success },
  Ativa: { bg: '#dcfce7', text: colors.success },
  Inativo: { bg: '#f1f5f9', text: colors.secondary },
  Inativa: { bg: '#f1f5f9', text: colors.secondary },
  EmAndamento: { bg: '#dbeafe', text: colors.info },
  Concluida: { bg: '#dcfce7', text: colors.success },
  Cancelada: { bg: '#fee2e2', text: colors.danger },
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colorScheme = statusColors[status] || { bg: '#f1f5f9', text: colors.secondary }
  const isSmall = size === 'sm'

  return (
    <View style={[styles.badge, { backgroundColor: colorScheme.bg }, isSmall && styles.badgeSm]}>
      <Text style={[styles.text, { color: colorScheme.text }, isSmall && styles.textSm]}>
        {status}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  textSm: {
    fontSize: fontSize.xs,
  },
})
