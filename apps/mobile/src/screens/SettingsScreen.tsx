import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { useAuthStore } from '@/store/auth'
import { useSyncStore } from '@/store/sync'
import { Card } from '@/components/Card'
import { SyncIndicator } from '@/components/SyncIndicator'
import { colors } from '@/theme/colors'
import { borderRadius, fontSize, spacing } from '@/theme/spacing'

export function SettingsScreen() {
  const { user, device, logout } = useAuthStore()
  const { status, lastSyncAt, pendingChanges, sync } = useSyncStore()

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ])
  }

  const handleSync = () => {
    sync()
  }

  return (
    <View style={styles.container}>
      <Card title="Perfil">
        <View style={styles.row}>
          <Text style={styles.label}>Nome</Text>
          <Text style={styles.value}>{user?.nome || '-'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email || '-'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Permissao</Text>
          <Text style={styles.value}>{user?.tipoPermissao || '-'}</Text>
        </View>
      </Card>

      {device && (
        <Card title="Dispositivo">
          <View style={styles.row}>
            <Text style={styles.label}>Nome</Text>
            <Text style={styles.value}>{device.nome}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>ID</Text>
            <Text style={styles.value}>{device.id}</Text>
          </View>
        </Card>
      )}

      <Card title="Sincronizacao">
        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <SyncIndicator />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Ultimo sync</Text>
          <Text style={styles.value}>
            {lastSyncAt ? new Date(lastSyncAt).toLocaleString('pt-BR') : 'Nunca'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Pendentes</Text>
          <Text style={styles.value}>{pendingChanges}</Text>
        </View>
        <TouchableOpacity
          style={[styles.syncButton, status === 'syncing' && styles.syncDisabled]}
          onPress={handleSync}
          disabled={status === 'syncing'}
        >
          <Text style={styles.syncButtonText}>
            {status === 'syncing' ? 'Sincronizando...' : 'Sincronizar Agora'}
          </Text>
        </TouchableOpacity>
      </Card>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  label: { fontSize: fontSize.sm, color: colors.textSecondary },
  value: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  syncButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  syncDisabled: { opacity: 0.7 },
  syncButtonText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '700' },
  logoutButton: {
    backgroundColor: colors.danger,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
})
