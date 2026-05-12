import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { api } from '@/services/api'
import { Card } from '@/components/Card'
import { LoadingScreen } from '@/components/LoadingScreen'
import { calcularCobranca, calcularSaldoDevedor, formatarMoeda } from '@/lib/cobranca-calculos'
import { colors } from '@/theme/colors'
import { borderRadius, fontSize, spacing } from '@/theme/spacing'
import type { Locacao } from '@/types/models'

export function CobrancaFormScreen() {
  const navigation = useNavigation<any>()
  const [locacoes, setLocacoes] = useState<Locacao[]>([])
  const [selectedLocacao, setSelectedLocacao] = useState<Locacao | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [relogioAnterior, setRelogioAnterior] = useState('0')
  const [relogioAtual, setRelogioAtual] = useState('0')
  const [valorRecebido, setValorRecebido] = useState('0')
  const [observacao, setObservacao] = useState('')

  useEffect(() => {
    const loadLocacoes = async () => {
      try {
        const result = await api.getLocacoes({ limit: '100' })
        setLocacoes(result.data.filter((l: Locacao) => l.status === 'Ativa'))
      } catch (error) {
        console.error('Error loading locacoes:', error)
      } finally {
        setLoading(false)
      }
    }
    loadLocacoes()
  }, [])

  const selectLocacao = (loc: Locacao) => {
    setSelectedLocacao(loc)
    setRelogioAnterior(String(loc.ultimaLeituraRelogio || loc.numeroRelogio || 0))
  }

  // Calculate billing values
  const calcResult = selectedLocacao
    ? calcularCobranca({
        formaPagamento: selectedLocacao.formaPagamento as any,
        relogioAnterior: parseFloat(relogioAnterior) || 0,
        relogioAtual: parseFloat(relogioAtual) || 0,
        precoFicha: selectedLocacao.precoFicha,
        percentualEmpresa: selectedLocacao.percentualEmpresa,
        valorFixo: selectedLocacao.valorFixo || undefined,
      })
    : null

  const saldoResult = calcResult
    ? calcularSaldoDevedor(calcResult.totalClientePaga, parseFloat(valorRecebido) || 0)
    : null

  const handleSubmit = async () => {
    if (!selectedLocacao || !dataInicio || !dataFim) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatorios')
      return
    }

    setSubmitting(true)
    try {
      await api.createCobranca({
        locacaoId: selectedLocacao.id,
        dataInicio,
        dataFim,
        relogioAnterior: parseFloat(relogioAnterior) || 0,
        relogioAtual: parseFloat(relogioAtual) || 0,
        valorRecebido: parseFloat(valorRecebido) || 0,
        status: (parseFloat(valorRecebido) || 0) >= (calcResult?.totalClientePaga || 0)
          ? 'Pago'
          : (parseFloat(valorRecebido) || 0) > 0
          ? 'Parcial'
          : 'Pendente',
        observacao: observacao || undefined,
      })
      Alert.alert('Sucesso', 'Cobranca criada com sucesso')
      navigation.goBack()
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro ao criar cobranca')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Locacao selection */}
      {!selectedLocacao ? (
        <Card title="Selecionar Locacao">
          {locacoes.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma locacao ativa encontrada</Text>
          ) : (
            locacoes.map((loc) => (
              <TouchableOpacity
                key={loc.id}
                style={styles.locItem}
                onPress={() => selectLocacao(loc)}
              >
                <Text style={styles.locName}>{loc.clienteNome}</Text>
                <Text style={styles.locMeta}>
                  {loc.produtoIdentificador} - {loc.formaPagamento}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </Card>
      ) : (
        <>
          {/* Selected locacao info */}
          <Card title="Locacao Selecionada">
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cliente</Text>
              <Text style={styles.infoValue}>{selectedLocacao.clienteNome}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Produto</Text>
              <Text style={styles.infoValue}>{selectedLocacao.produtoIdentificador}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Forma</Text>
              <Text style={styles.infoValue}>{selectedLocacao.formaPagamento}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedLocacao(null)}>
              <Text style={styles.changeLink}>Trocar locacao</Text>
            </TouchableOpacity>
          </Card>

          {/* Dates */}
          <Card title="Periodo">
            <View style={styles.fieldRow}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Inicio (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={dataInicio}
                  onChangeText={setDataInicio}
                  placeholder="2025-01-01"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Fim (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={dataFim}
                  onChangeText={setDataFim}
                  placeholder="2025-01-31"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          </Card>

          {/* Relogio */}
          {selectedLocacao.formaPagamento !== 'Periodo' && (
            <Card title="Leitura do Relogio">
              <View style={styles.fieldRow}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Anterior</Text>
                  <TextInput
                    style={styles.input}
                    value={relogioAnterior}
                    onChangeText={setRelogioAnterior}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Atual</Text>
                  <TextInput
                    style={styles.input}
                    value={relogioAtual}
                    onChangeText={setRelogioAtual}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </Card>
          )}

          {/* Calculation result */}
          {calcResult && (
            <Card title="Calculo">
              {selectedLocacao.formaPagamento !== 'Periodo' && (
                <>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Fichas rodadas</Text>
                    <Text style={styles.calcValue}>{calcResult.fichasRodadas}</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Total bruto</Text>
                    <Text style={styles.calcValue}>{formatarMoeda(calcResult.totalBruto)}</Text>
                  </View>
                </>
              )}
              <View style={[styles.calcRow, styles.calcTotal]}>
                <Text style={styles.calcTotalLabel}>Total a pagar</Text>
                <Text style={styles.calcTotalValue}>
                  {formatarMoeda(calcResult.totalClientePaga)}
                </Text>
              </View>
            </Card>
          )}

          {/* Payment */}
          <Card title="Pagamento">
            <Text style={styles.fieldLabel}>Valor Recebido</Text>
            <TextInput
              style={styles.input}
              value={valorRecebido}
              onChangeText={setValorRecebido}
              keyboardType="numeric"
            />
            {saldoResult && saldoResult.saldoDevedorGerado > 0 && (
              <Text style={styles.debtText}>
                Saldo devedor: {formatarMoeda(saldoResult.saldoDevedorGerado)}
              </Text>
            )}
          </Card>

          {/* Obs */}
          <Card title="Observacao">
            <TextInput
              style={[styles.input, styles.textArea]}
              value={observacao}
              onChangeText={setObservacao}
              multiline
              numberOfLines={3}
              placeholder="Observacoes..."
              placeholderTextColor={colors.textMuted}
            />
          </Card>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Criar Cobranca</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', padding: spacing.md },
  locItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  locName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  locMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  infoLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  infoValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  changeLink: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600', marginTop: spacing.sm },
  fieldRow: { flexDirection: 'row', gap: spacing.sm },
  field: { flex: 1 },
  fieldLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  calcLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  calcValue: { fontSize: fontSize.sm, color: colors.text },
  calcTotal: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  calcTotalLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  calcTotalValue: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  debtText: { color: colors.danger, fontSize: fontSize.sm, fontWeight: '600', marginTop: spacing.sm },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
})
