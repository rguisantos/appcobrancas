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
import type { Cliente } from '@/types/models'

export function ClientesScreen() {
  const navigation = useNavigation<any>()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchClientes = useCallback(async (p = 1, s = '') => {
    try {
      const result = await api.getClientes({
        page: String(p),
        limit: '20',
        search: s,
      })
      if (p === 1) {
        setClientes(result.data)
      } else {
        setClientes((prev) => [...prev, ...result.data])
      }
      setTotalPages(result.totalPages)
    } catch (error) {
      console.error('Error fetching clientes:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchClientes(1, search)
  }, [fetchClientes, search])

  const onRefresh = () => {
    setRefreshing(true)
    setPage(1)
    fetchClientes(1, search)
  }

  const loadMore = () => {
    if (page < totalPages) {
      const next = page + 1
      setPage(next)
      fetchClientes(next, search)
    }
  }

  const renderCliente = ({ item }: { item: Cliente }) => (
    <TouchableOpacity
      style={styles.clienteCard}
      onPress={() => navigation.navigate('ClienteDetail', { id: item.id })}
    >
      <View style={styles.clienteHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.nomeExibicao.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.clienteInfo}>
          <Text style={styles.clienteName}>{item.nomeExibicao}</Text>
          <Text style={styles.clienteId}>{item.identificador}</Text>
        </View>
        <StatusBadge status={item.status} size="sm" />
      </View>
      <View style={styles.clienteMeta}>
        <Text style={styles.metaText}>{item.telefonePrincipal}</Text>
        {item.cidade && (
          <Text style={styles.metaText}>
            {item.cidade}/{item.estado}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )

  if (loading) return <LoadingScreen />

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar clientes..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('ClienteForm')}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={clientes}
        keyExtractor={(item) => item.id}
        renderItem={renderCliente}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <EmptyState
            title="Nenhum cliente encontrado"
            description="Adicione um novo cliente para comecar"
          />
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  clienteCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clienteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  clienteInfo: {
    flex: 1,
  },
  clienteName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  clienteId: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  clienteMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
})
