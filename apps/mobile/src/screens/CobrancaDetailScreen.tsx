import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import { api } from '@/services/api'
import { Card } from '@/components/Card'
import { StatusBadge } from '@/components/StatusBadge'
import { LoadingScreen } from '@/components/LoadingScreen'
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { colors } from '@/theme/colors'
import { borderRadius, fontSize, spacing } from '@/theme/spacing'
import type { Cobranca } from '@/types/models'

export function CobrancaDetailScreen() {
  const route = useRoute<any>()
  const navigation = useNavigation<any>()
  const { id } = route.params

  const [cobranca, setCobranca] = useState<Cobranca | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const data = await api.getCobranca(id)
      setCobranca(data)
    } catch (error) {
      console.error('Error fetching cobranca:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading || !cobranca) return <LoadingScreen />

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} />}
    >
      <View style={styles.header}>
        <StatusBadge status={cobranca.status} />
        <Text style={styles.clienteName}>{cobranca.clienteNome}</Text>
        <Text style={styles.produtoId}>{cobranca.produtoIdentificador}</Text>
      </View>

      <Card title="Periodo">
        <View style={styles.row}>
          <Text style={styles.label}>Inicio</Text>
          <Text style={styles.value}>{cobranca.dataInicio}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Fim</Text>
          <Text style={styles.value}>{cobranca.dataFim}</Text>
        </View>
        {cobranca.dataVencimento && (
          <View style={styles.row}>
            <Text style={styles.label}>Vencimento</Text>
            <Text style={styles.value}>{cobranca.dataVencimento}</Text>
          </View>
        )}
        {cobranca.dataPagamento && (
          <View style={styles.row}>
            <Text style={styles.label}>Pagamento</Text>
            <Text style={[styles.value, { color: colors.success }]}>{cobranca.dataPagamento}</Text>
          </View>
        )}
      </Card>

      {cobranca.formaPagamento !== 'Periodo' && (
        <Card title="Leitura do Relogio">
          <View style={styles.row}>
            <Text style={styles.label}>Relogio anterior</Text>
            <Text style={styles.value}>{cobranca.relogioAnterior}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Relogio atual</Text>
            <Text style={styles.value}>{cobranca.relogioAtual}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fichas rodadas</Text>
            <Text style={[styles.value, { fontWeight: '700' }]}>{cobranca.fichasRodadas}</Text>
          </View>
        </Card>
      )}

      <Card title="Valores">
        {cobranca.formaPagamento !== 'Periodo' && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Valor da ficha</Text>
              <Text style={styles.value}>{formatarMoeda(cobranca.valorFicha)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Total bruto</Text>
              <Text style={styles.value}>{formatarMoeda(cobranca.totalBruto)}</Text>
            </View>
            {(cobranca.descontoPartidasQtd || cobranca.descontoPartidasValor || cobranca.descontoDinheiro) && (
              <View style={styles.row}>
                <Text style={styles.label}>Descontos</Text>
                <Text style={[styles.value, { color: colors.danger }]}>
                  -{formatarMoeda(
                    (cobranca.descontoPartidasValor || 0) + (cobranca.descontoDinheiro || 0)
                  )}
                </Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Subtotal</Text>
              <Text style={styles.value}>{formatarMoeda(cobranca.subtotalAposDescontos)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Percentual ({cobranca.percentualEmpresa}%)</Text>
              <Text style={styles.value}>{formatarMoeda(cobranca.valorPercentual)}</Text>
            </View>
          </>
        )}
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total a pagar</Text>
          <Text style={styles.totalValue}>{formatarMoeda(cobranca.totalClientePaga)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Valor recebido</Text>
          <Text style={[styles.value, { color: colors.success, fontWeight: '700' }]}>
            {formatarMoeda(cobranca.valorRecebido)}
          </Text>
        </View>
        {cobranca.saldoDevedorGerado > 0 && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.danger }]}>Saldo devedor</Text>
            <Text style={[styles.value, { color: colors.danger, fontWeight: '700' }]}>
              {formatarMoeda(cobranca.saldoDevedorGerado)}
            </Text>
          </View>
        )}
      </Card>

      <Card title="Informacoes">
        <View style={styles.row}>
          <Text style={styles.label}>Forma de pagamento</Text>
          <Text style={styles.value}>{cobranca.formaPagamento}</Text>
        </View>
        {cobranca.observacao && (
          <View style={styles.obsBox}>
            <Text style={styles.label}>Observacao</Text>
            <Text style={styles.obsText}>{cobranca.observacao}</Text>
          </View>
        )}
      </Card>

      <TouchableOpacity
        style={styles.clienteLink}
        onPress={() => navigation.navigate('ClienteDetail', { id: cobranca.clienteId })}
      >
        <Text style={styles.clienteLinkText}>Ver cliente: {cobranca.clienteNome}</Text>
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
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  label: { fontSize: fontSize.sm, color: colors.textSecondary },
  value: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  totalRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  totalLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primary },
  obsBox: { paddingVertical: spacing.sm },
  obsText: { fontSize: fontSize.sm, color: colors.text, marginTop: 4, lineHeight: 20 },
  clienteLink: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  clienteLinkText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
})
