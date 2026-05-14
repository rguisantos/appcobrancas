import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import { api } from '@/services/api'
import { Card } from '@/components/Card'
import { StatusBadge } from '@/components/StatusBadge'
import { LoadingScreen } from '@/components/LoadingScreen'
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { colors } from '@/theme/colors'
import { borderRadius, fontSize, spacing } from '@/theme/spacing'
import type { Cliente, Cobranca, Locacao } from '@/types/models'

export function ClienteDetailScreen() {
  const route = useRoute<any>()
  const navigation = useNavigation<any>()
  const { id } = route.params

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [locacoes, setLocacoes] = useState<Locacao[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const [clienteData, cobrancasData, locacoesData] = await Promise.all([
        api.getCliente(id),
        api.getCobrancas({ clienteId: id, limit: '10' }),
        api.getLocacoes({ clienteId: id }),
      ])
      setCliente(clienteData)
      setCobrancas(cobrancasData.data)
      setLocacoes(locacoesData.data)
    } catch (err) {
      console.error('Error fetching cliente detail:', err)
      setError('Erro ao carregar dados do cliente')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) return <LoadingScreen />
  if (error || !cliente) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Dados não encontrados'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const callPhone = () => {
    if (cliente.telefonePrincipal) {
      Linking.openURL(`tel:${cliente.telefonePrincipal}`)
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {cliente.nomeExibicao.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{cliente.nomeExibicao}</Text>
        <Text style={styles.identifier}>{cliente.identificador}</Text>
        <StatusBadge status={cliente.status} />
      </View>

      {/* Contact */}
      <Card title="Contato">
        <TouchableOpacity onPress={callPhone} style={styles.infoRow}>
          <Text style={styles.infoLabel}>Telefone</Text>
          <Text style={[styles.infoValue, { color: colors.primary }]}>
            {cliente.telefonePrincipal}
          </Text>
        </TouchableOpacity>
        {cliente.email && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{cliente.email}</Text>
          </View>
        )}
      </Card>

      {/* Address */}
      {cliente.logradouro && (
        <Card title="Endereco">
          <Text style={styles.infoValue}>
            {cliente.logradouro}, {cliente.numero}
            {cliente.complemento ? ` - ${cliente.complemento}` : ''}
          </Text>
          <Text style={styles.infoValue}>
            {cliente.bairro} - {cliente.cidade}/{cliente.estado}
          </Text>
          {cliente.cep && <Text style={styles.metaText}>CEP: {cliente.cep}</Text>}
        </Card>
      )}

      {/* Active rentals */}
      <Card title={`Locacoes (${locacoes.length})`}>
        {locacoes.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma locacao ativa</Text>
        ) : (
          locacoes.map((loc) => (
            <TouchableOpacity
              key={loc.id}
              style={styles.listItem}
              onPress={() => navigation.navigate('LocacaoDetail', { id: loc.id })}
            >
              <View>
                <Text style={styles.listItemTitle}>{loc.produtoIdentificador}</Text>
                <Text style={styles.metaText}>{loc.produtoTipo} - {loc.formaPagamento}</Text>
              </View>
              <StatusBadge status={loc.status} size="sm" />
            </TouchableOpacity>
          ))
        )}
      </Card>

      {/* Recent cobrancas */}
      <Card title={`Cobrancas Recentes`}>
        {cobrancas.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma cobranca encontrada</Text>
        ) : (
          cobrancas.map((cob) => (
            <TouchableOpacity
              key={cob.id}
              style={styles.listItem}
              onPress={() => navigation.navigate('CobrancaDetail', { id: cob.id })}
            >
              <View>
                <Text style={styles.listItemTitle}>
                  {cob.produtoIdentificador} - {cob.dataInicio}
                </Text>
                <Text style={styles.metaText}>
                  {formatarMoeda(cob.totalClientePaga)}
                </Text>
              </View>
              <StatusBadge status={cob.status} size="sm" />
            </TouchableOpacity>
          ))
        )}
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: fontSize.xxl, fontWeight: '700' },
  name: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  identifier: { fontSize: fontSize.sm, color: colors.textMuted },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  infoValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  metaText: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  listItemTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.danger,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
})
