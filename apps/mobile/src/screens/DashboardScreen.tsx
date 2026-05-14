import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/auth'
import { Card } from '@/components/Card'
import { SyncIndicator } from '@/components/SyncIndicator'
import { LoadingScreen } from '@/components/LoadingScreen'
import { formatarMoeda } from '@/lib/cobranca-calculos'
import { colors } from '@/theme/colors'
import { borderRadius, fontSize, spacing } from '@/theme/spacing'

interface DashboardData {
  totalClientes: number
  totalProdutos: number
  totalLocacoes: number
  cobrancasPendentes: number
  cobrancasAtrasadas: number
  receitaMes: number
  receitaTotal: number
  saldoDevedor: number
}

export function DashboardScreen() {
  const navigation = useNavigation<any>()
  const { user } = useAuthStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null)
      const result = await api.getDashboard() as DashboardData
      setData(result)
    } catch (err) {
      console.error('Dashboard error:', err)
      setError('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const onRefresh = () => {
    setRefreshing(true)
    fetchDashboard()
  }

  if (loading) return <LoadingScreen />
  if (error || !data) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Dados não encontrados'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDashboard}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.userName}>{user?.nome || 'Usuario'}</Text>
        </View>
        <SyncIndicator />
      </View>

      {/* Quick stats */}
      <View style={styles.statsGrid}>
        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: '#dbeafe' }]}
          onPress={() => navigation.navigate('Clientes')}
        >
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {data?.totalClientes || 0}
          </Text>
          <Text style={styles.statLabel}>Clientes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: '#dcfce7' }]}
          onPress={() => navigation.navigate('Produtos')}
        >
          <Text style={[styles.statValue, { color: colors.success }]}>
            {data?.totalProdutos || 0}
          </Text>
          <Text style={styles.statLabel}>Produtos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: '#fef9c3' }]}
          onPress={() => navigation.navigate('Cobrancas')}
        >
          <Text style={[styles.statValue, { color: colors.warning }]}>
            {data?.cobrancasPendentes || 0}
          </Text>
          <Text style={styles.statLabel}>Pendentes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: '#fee2e2' }]}
          onPress={() => navigation.navigate('Cobrancas')}
        >
          <Text style={[styles.statValue, { color: colors.danger }]}>
            {data?.cobrancasAtrasadas || 0}
          </Text>
          <Text style={styles.statLabel}>Atrasadas</Text>
        </TouchableOpacity>
      </View>

      {/* Financial summary */}
      <Card title="Resumo Financeiro">
        <View style={styles.financeRow}>
          <Text style={styles.financeLabel}>Receita do Mes</Text>
          <Text style={[styles.financeValue, { color: colors.success }]}>
            {formatarMoeda(data?.receitaMes || 0)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.financeRow}>
          <Text style={styles.financeLabel}>Receita Total</Text>
          <Text style={styles.financeValue}>
            {formatarMoeda(data?.receitaTotal || 0)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.financeRow}>
          <Text style={styles.financeLabel}>Saldo Devedor</Text>
          <Text style={[styles.financeValue, { color: colors.danger }]}>
            {formatarMoeda(data?.saldoDevedor || 0)}
          </Text>
        </View>
      </Card>

      {/* Quick actions */}
      <Card title="Acoes Rapidas">
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('CobrancaForm')}
          >
            <Text style={styles.actionIcon}>+</Text>
            <Text style={styles.actionLabel}>Nova Cobranca</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ClienteForm')}
          >
            <Text style={styles.actionIcon}>+</Text>
            <Text style={styles.actionLabel}>Novo Cliente</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  userName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  financeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  financeValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionIcon: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  actionLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
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
