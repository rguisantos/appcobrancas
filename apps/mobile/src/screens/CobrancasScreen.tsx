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
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { colors } from '@/theme/colors'
import { borderRadius, fontSize, spacing } from '@/theme/spacing'
import type { Cobranca } from '@/types/models'

type FilterStatus = 'all' | 'Pendente' | 'Atrasado' | 'Parcial' | 'Pago'

export function CobrancasScreen() {
  const navigation = useNavigation<any>()
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchCobrancas = useCallback(async (p = 1, status: FilterStatus = 'all') => {
    try {
      const params: Record<string, string> = { page: String(p), limit: '20' }
      if (status !== 'all') params.status = status
      const result = await api.getCobrancas(params)
      if (p === 1) {
        setCobrancas(result.data)
      } else {
        setCobrancas((prev) => [...prev, ...result.data])
      }
      setTotalPages(result.totalPages)
    } catch (error) {
      console.error('Error fetching cobrancas:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    setLoading(true)
    fetchCobrancas(1, filter)
  }, [fetchCobrancas, filter])

  const onRefresh = () => {
    setRefreshing(true)
    setPage(1)
    fetchCobrancas(1, filter)
  }

  const loadMore = () => {
    if (page < totalPages) {
      const next = page + 1
      setPage(next)
      fetchCobrancas(next, filter)
    }
  }

  const filters: { label: string; value: FilterStatus }[] = [
    { label: 'Todas', value: 'all' },
    { label: 'Pendentes', value: 'Pendente' },
    { label: 'Atrasadas', value: 'Atrasado' },
    { label: 'Parciais', value: 'Parcial' },
    { label: 'Pagas', value: 'Pago' },
  ]

  const renderCobranca = ({ item }: { item: Cobranca }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('CobrancaDetail', { id: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.clienteName}>{item.clienteNome}</Text>
          <Text style={styles.produtoId}>{item.produtoIdentificador}</Text>
        </View>
        <StatusBadge status={item.status} size="sm" />
      </View>
      <View style={styles.cardBody}>
        <View>
          <Text style={styles.label}>Periodo</Text>
          <Text style={styles.value}>{item.dataInicio} a {item.dataFim}</Text>
        </View>
        <View style={styles.amountCol}>
          <Text style={styles.label}>Total</Text>
          <Text style={styles.amount}>{formatarMoeda(item.totalClientePaga)}</Text>
        </View>
      </View>
      {item.saldoDevedorGerado > 0 && (
        <View style={styles.debtRow}>
          <Text style={styles.debtLabel}>Saldo devedor:</Text>
          <Text style={styles.debtValue}>{formatarMoeda(item.saldoDevedorGerado)}</Text>
        </View>
      )}
    </TouchableOpacity>
  )

  if (loading) return <LoadingScreen />

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <FlatList
        horizontal
        data={filters}
        keyExtractor={(item) => item.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[styles.filterTab, filter === f.value && styles.filterTabActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={cobrancas}
        keyExtractor={(item) => item.id}
        renderItem={renderCobranca}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <EmptyState title="Nenhuma cobranca encontrada" />
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CobrancaForm')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filterRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSecondary,
  },
  filterTabActive: { backgroundColor: colors.primary },
  filterText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: 80 },
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
  amountCol: { alignItems: 'flex-end' },
  amount: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginTop: 2 },
  debtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  debtLabel: { fontSize: fontSize.xs, color: colors.danger },
  debtValue: { fontSize: fontSize.sm, fontWeight: '700', color: colors.danger },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: -2 },
})
