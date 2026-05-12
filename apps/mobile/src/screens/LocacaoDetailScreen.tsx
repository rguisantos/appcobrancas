import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import { api } from '@/services/api'
import { Card } from '@/components/Card'
import { StatusBadge } from '@/components/StatusBadge'
import { LoadingScreen } from '@/components/LoadingScreen'
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { colors } from '@/theme/colors'
import { borderRadius, fontSize, spacing } from '@/theme/spacing'
import type { Locacao, Cobranca } from '@/types/models'

export function LocacaoDetailScreen() {
  const route = useRoute<any>()
  const navigation = useNavigation<any>()
  const { id } = route.params
  const [locacao, setLocacao] = useState<Locacao | null>(null)
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [loc, cobs] = await Promise.all([
        api.getLocacao(id),
        api.getCobrancas({ locacaoId: id, limit: '20' }),
      ])
      setLocacao(loc)
      setCobrancas(cobs.data)
    } catch (error) {
      console.error('Error fetching locacao:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading || !locacao) return <LoadingScreen />

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} />}
    >
      <View style={styles.header}>
        <Text style={styles.clienteName}>{locacao.clienteNome}</Text>
        <Text style={styles.produtoId}>{locacao.produtoIdentificador} - {locacao.produtoTipo}</Text>
        <StatusBadge status={locacao.status} />
      </View>

      <Card title="Dados da Locacao">
        <View style={styles.row}>
          <Text style={styles.label}>Forma de pagamento</Text>
          <Text style={styles.value}>{locacao.formaPagamento}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Periodicidade</Text>
          <Text style={styles.value}>{locacao.periodicidade || '-'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Data da locacao</Text>
          <Text style={styles.value}>{locacao.dataLocacao}</Text>
        </View>
        {locacao.dataFim && (
          <View style={styles.row}>
            <Text style={styles.label}>Data fim</Text>
            <Text style={styles.value}>{locacao.dataFim}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Relogio</Text>
          <Text style={styles.value}>{locacao.numeroRelogio}</Text>
        </View>
        {locacao.formaPagamento !== 'Periodo' && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Preco ficha</Text>
              <Text style={styles.value}>{formatarMoeda(locacao.precoFicha)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Percentual empresa</Text>
              <Text style={styles.value}>{locacao.percentualEmpresa}%</Text>
            </View>
          </>
        )}
        {locacao.valorFixo != null && (
          <View style={styles.row}>
            <Text style={styles.label}>Valor fixo</Text>
            <Text style={styles.value}>{formatarMoeda(locacao.valorFixo)}</Text>
          </View>
        )}
      </Card>

      <Card title={`Cobrancas (${cobrancas.length})`}>
        {cobrancas.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma cobranca</Text>
        ) : (
          cobrancas.map((cob) => (
            <TouchableOpacity
              key={cob.id}
              style={styles.listItem}
              onPress={() => navigation.navigate('CobrancaDetail', { id: cob.id })}
            >
              <View>
                <Text style={styles.listItemTitle}>{cob.dataInicio} a {cob.dataFim}</Text>
                <Text style={styles.meta}>{formatarMoeda(cob.totalClientePaga)}</Text>
              </View>
              <StatusBadge status={cob.status} size="sm" />
            </TouchableOpacity>
          ))
        )}
      </Card>

      <TouchableOpacity
        style={styles.newCobrancaBtn}
        onPress={() => navigation.navigate('CobrancaForm')}
      >
        <Text style={styles.newCobrancaBtnText}>+ Nova Cobranca</Text>
      </TouchableOpacity>
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
  clienteName: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  produtoId: { fontSize: fontSize.sm, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  label: { fontSize: fontSize.sm, color: colors.textSecondary },
  value: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  listItemTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  meta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', padding: spacing.md },
  newCobrancaBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  newCobrancaBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
})
