import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { api } from '@/services/api'
import { StatusBadge } from '@/components/StatusBadge'
import { EmptyState } from '@/components/EmptyState'
import { LoadingScreen } from '@/components/LoadingScreen'
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { colors } from '@/theme/colors'
import { borderRadius, fontSize, spacing } from '@/theme/spacing'
import type { Manutencao } from '@/types/models'

export function ManutencoesScreen() {
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const result = await api.getManutencoes({ limit: '50' })
      setManutencoes(result.data)
    } catch (error) {
      console.error('Error fetching manutencoes:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const renderItem = ({ item }: { item: Manutencao }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.tipo}>{item.tipo}</Text>
          <Text style={styles.produtoId}>{item.produtoIdentificador || 'Produto'}</Text>
        </View>
        <StatusBadge status={item.status} size="sm" />
      </View>
      <Text style={styles.descricao}>{item.descricao}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.meta}>{item.dataInicio}{item.dataFim ? ` a ${item.dataFim}` : ''}</Text>
        {item.custo > 0 && <Text style={styles.custo}>{formatarMoeda(item.custo)}</Text>}
      </View>
    </View>
  )

  if (loading) return <LoadingScreen />

  return (
    <FlatList
      data={manutencoes}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} />}
      ListEmptyComponent={<EmptyState title="Nenhuma manutencao registrada" />}
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardInfo: { flex: 1 },
  tipo: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, textTransform: 'capitalize' },
  produtoId: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  descricao: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  meta: { fontSize: fontSize.xs, color: colors.textMuted },
  custo: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
})
