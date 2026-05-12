import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native'
import { api } from '@/services/api'
import { EmptyState } from '@/components/EmptyState'
import { LoadingScreen } from '@/components/LoadingScreen'
import { colors } from '@/theme/colors'
import { borderRadius, fontSize, spacing } from '@/theme/spacing'

interface Notificacao {
  id: string
  tipo: string
  titulo: string
  mensagem: string
  lida: boolean
  link: string | null
  createdAt: string
}

export function NotificacoesScreen() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const result = await api.request<{ data: Notificacao[]; total: number }>('/api/notificacoes')
      setNotificacoes(result.data)
    } catch (error) {
      console.error('Error fetching notificacoes:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const markAsRead = async (id: string) => {
    try {
      await api.request(`/api/notificacoes/${id}`, { method: 'PUT', body: { lida: true } })
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const renderItem = ({ item }: { item: Notificacao }) => (
    <TouchableOpacity
      style={[styles.card, !item.lida && styles.cardUnread]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.tipoBadge}>
          <Text style={styles.tipoText}>{item.tipo}</Text>
        </View>
        {!item.lida && <View style={styles.unreadDot} />}
      </View>
      <Text style={styles.titulo}>{item.titulo}</Text>
      <Text style={styles.mensagem}>{item.mensagem}</Text>
      <Text style={styles.data}>
        {new Date(item.createdAt).toLocaleString('pt-BR')}
      </Text>
    </TouchableOpacity>
  )

  if (loading) return <LoadingScreen />

  return (
    <FlatList
      data={notificacoes}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} />}
      ListEmptyComponent={<EmptyState title="Nenhuma notificacao" description="Voce esta em dia!" />}
      style={styles.container}
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: '#f0f9ff',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tipoBadge: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  tipoText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textSecondary },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  titulo: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginTop: spacing.sm },
  mensagem: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 20 },
  data: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.sm },
})
