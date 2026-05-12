import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { api } from '@/services/api'
import { StatusBadge } from '@/components/StatusBadge'
import { EmptyState } from '@/components/EmptyState'
import { LoadingScreen } from '@/components/LoadingScreen'
import { colors } from '@/theme/colors'
import { borderRadius, fontSize, spacing } from '@/theme/spacing'
import type { Produto } from '@/types/models'

export function ProdutosScreen() {
  const navigation = useNavigation<any>()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')

  const fetchProdutos = useCallback(async (s = '') => {
    try {
      const result = await api.getProdutos({ search: s, limit: '50' })
      setProdutos(result.data)
    } catch (error) {
      console.error('Error fetching produtos:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchProdutos(search)
  }, [fetchProdutos, search])

  const onRefresh = () => {
    setRefreshing(true)
    fetchProdutos(search)
  }

  const renderProduto = ({ item }: { item: Produto }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ProdutoDetail', { id: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.idBadge}>
          <Text style={styles.idText}>{item.identificador}</Text>
        </View>
        <StatusBadge status={item.statusProduto} size="sm" />
      </View>
      <Text style={styles.tipo}>{item.tipoNome}</Text>
      <Text style={styles.desc}>{item.descricaoNome} - {item.tamanhoNome}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>Relogio: {item.numeroRelogio}</Text>
        <Text style={styles.meta}>Conservacao: {item.conservacao}</Text>
      </View>
    </TouchableOpacity>
  )

  if (loading) return <LoadingScreen />

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar produtos..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={produtos}
        keyExtractor={(item) => item.id}
        renderItem={renderProduto}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<EmptyState title="Nenhum produto encontrado" />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchRow: { padding: spacing.md },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  list: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  idBadge: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  idText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  tipo: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginTop: spacing.sm },
  desc: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  meta: { fontSize: fontSize.xs, color: colors.textMuted },
})
