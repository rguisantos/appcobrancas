import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { api } from '@/services/api'
import { StatusBadge } from '@/components/StatusBadge'
import { EmptyState } from '@/components/EmptyState'
import { LoadingScreen } from '@/components/LoadingScreen'
import { colors } from '@/theme/colors'
import { borderRadius, fontSize, spacing } from '@/theme/spacing'
import type { Locacao } from '@/types/models'

export function LocacoesScreen() {
  const navigation = useNavigation<any>()
  const [locacoes, setLocacoes] = useState<Locacao[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const fetchLocacoes = useCallback(async (p = 1) => {
    try {
      setError(null)
      const result = await api.getLocacoes({ page: String(p), limit: '20' })
      if (p === 1) {
        setLocacoes(result.data)
      } else {
        setLocacoes((prev) => [...prev, ...result.data])
      }
      setTotalPages(result.totalPages)
    } catch (err) {
      console.error('Error fetching locacoes:', err)
      setError('Erro ao carregar locacoes')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchLocacoes() }, [fetchLocacoes])

  const onRefresh = () => {
    setRefreshing(true)
    setPage(1)
    fetchLocacoes(1)
  }

  const loadMore = () => {
    if (page < totalPages) {
      const next = page + 1
      setPage(next)
      fetchLocacoes(next)
    }
  }

  const renderLocacao = ({ item }: { item: Locacao }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('LocacaoDetail', { id: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.clienteName}>{item.clienteNome}</Text>
          <Text style={styles.produtoId}>{item.produtoIdentificador} - {item.produtoTipo}</Text>
        </View>
        <StatusBadge status={item.status} size="sm" />
      </View>
      <View style={styles.cardBody}>
        <View>
          <Text style={styles.label}>Forma</Text>
          <Text style={styles.value}>{item.formaPagamento}</Text>
        </View>
        <View>
          <Text style={styles.label}>Periodicidade</Text>
          <Text style={styles.value}>{item.periodicidade || '-'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.label}>Relogio</Text>
          <Text style={styles.value}>{item.numeroRelogio}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  if (loading) return <LoadingScreen />

  if (error && locacoes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); fetchLocacoes(1) }}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={locacoes}
        keyExtractor={(item) => item.id}
        renderItem={renderLocacao}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={<EmptyState title="Nenhuma locacao encontrada" />}
      />
    </View>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1 },
  clienteName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  produtoId: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  label: { fontSize: fontSize.xs, color: colors.textMuted },
  value: { fontSize: fontSize.sm, color: colors.text, marginTop: 2 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
})
