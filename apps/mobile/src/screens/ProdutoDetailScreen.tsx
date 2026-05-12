import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { api } from '@/services/api'
import { Card } from '@/components/Card'
import { StatusBadge } from '@/components/StatusBadge'
import { LoadingScreen } from '@/components/LoadingScreen'
import { colors } from '@/theme/colors'
import { borderRadius, fontSize, spacing } from '@/theme/spacing'
import type { Produto, Manutencao, HistoricoRelogio } from '@/types/models'

export function ProdutoDetailScreen() {
  const route = useRoute<any>()
  const { id } = route.params
  const [produto, setProduto] = useState<Produto | null>(null)
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [historico, setHistorico] = useState<HistoricoRelogio[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [prod, mData, hData] = await Promise.all([
        api.getProduto(id),
        api.getManutencoes({ produtoId: id }),
        api.getHistoricoRelogio({ produtoId: id }),
      ])
      setProduto(prod)
      setManutencoes(mData.data)
      setHistorico(hData.data)
    } catch (error) {
      console.error('Error fetching produto:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading || !produto) return <LoadingScreen />

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} />}
    >
      <View style={styles.header}>
        <View style={styles.idBadge}>
          <Text style={styles.idText}>{produto.identificador}</Text>
        </View>
        <Text style={styles.tipo}>{produto.tipoNome}</Text>
        <Text style={styles.desc}>{produto.descricaoNome} - {produto.tamanhoNome}</Text>
        <StatusBadge status={produto.statusProduto} />
      </View>

      <Card title="Detalhes">
        <View style={styles.row}>
          <Text style={styles.label}>Relogio</Text>
          <Text style={styles.value}>{produto.numeroRelogio}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Conservacao</Text>
          <Text style={styles.value}>{produto.conservacao}</Text>
        </View>
        {produto.codigoCH && (
          <View style={styles.row}>
            <Text style={styles.label}>Codigo CH</Text>
            <Text style={styles.value}>{produto.codigoCH}</Text>
          </View>
        )}
        {produto.codigoABLF && (
          <View style={styles.row}>
            <Text style={styles.label}>Codigo ABLF</Text>
            <Text style={styles.value}>{produto.codigoABLF}</Text>
          </View>
        )}
        {produto.estabelecimento && (
          <View style={styles.row}>
            <Text style={styles.label}>Estabelecimento</Text>
            <Text style={styles.value}>{produto.estabelecimento}</Text>
          </View>
        )}
        {produto.observacao && (
          <View style={styles.obsBox}>
            <Text style={styles.label}>Observacao</Text>
            <Text style={styles.obsText}>{produto.observacao}</Text>
          </View>
        )}
      </Card>

      <Card title={`Manutencoes (${manutencoes.length})`}>
        {manutencoes.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma manutencao registrada</Text>
        ) : (
          manutencoes.map((m) => (
            <View key={m.id} style={styles.listItem}>
              <View>
                <Text style={styles.listItemTitle}>{m.tipo} - {m.descricao}</Text>
                <Text style={styles.meta}>{m.dataInicio}{m.dataFim ? ` a ${m.dataFim}` : ''}</Text>
              </View>
              <StatusBadge status={m.status} size="sm" />
            </View>
          ))
        )}
      </Card>

      <Card title={`Historico Relogio (${historico.length})`}>
        {historico.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum historico</Text>
        ) : (
          historico.map((h) => (
            <View key={h.id} style={styles.listItem}>
              <Text style={styles.listItemTitle}>
                {h.relogioAnterior} → {h.relogioNovo}
              </Text>
              <Text style={styles.meta}>{h.motivo || 'Sem motivo'}</Text>
            </View>
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
  idBadge: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  idText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primary },
  tipo: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  desc: { fontSize: fontSize.sm, color: colors.textSecondary },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  label: { fontSize: fontSize.sm, color: colors.textSecondary },
  value: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  obsBox: { paddingVertical: spacing.sm },
  obsText: { fontSize: fontSize.sm, color: colors.text, marginTop: 4 },
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
})
