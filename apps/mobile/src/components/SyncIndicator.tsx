import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useSyncStore } from '@/store/sync'
import { colors } from '@/theme/colors'
import { borderRadius, fontSize, spacing } from '@/theme/spacing'

export function SyncIndicator() {
  const { status, pendingChanges, lastSyncAt, sync } = useSyncStore()

  const statusIcon = {
    idle: null,
    syncing: <ActivityIndicator size="small" color={colors.primary} />,
    success: <Text style={styles.checkIcon}>OK</Text>,
    error: <Text style={styles.errorIcon}>!</Text>,
  }[status]

  return (
    <TouchableOpacity style={styles.container} onPress={sync} disabled={status === 'syncing'}>
      <View style={styles.row}>
        {statusIcon}
        {pendingChanges > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingChanges}</Text>
          </View>
        )}
        <Text style={styles.label}>
          {status === 'syncing'
            ? 'Sincronizando...'
            : pendingChanges > 0
            ? `${pendingChanges} pendente(s)`
            : 'Sincronizado'}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  badge: {
    backgroundColor: colors.warning,
    borderRadius: borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  checkIcon: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  errorIcon: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
})
