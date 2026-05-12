import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/auth'
import { colors } from '@/theme/colors'
import { borderRadius, fontSize, spacing } from '@/theme/spacing'

export function LoginScreen() {
  const [mode, setMode] = useState<'user' | 'device'>('user')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [deviceKey, setDeviceKey] = useState('')
  const [loading, setLoading] = useState(false)

  const { setAuth } = useAuthStore()

  const handleUserLogin = async () => {
    if (!email.trim() || !senha.trim()) {
      Alert.alert('Erro', 'Preencha email e senha')
      return
    }

    setLoading(true)
    try {
      const result = await api.userLogin(email.trim(), senha.trim())
      setAuth(
        {
          ...result.user,
          permissoesMobile: result.user.permissoesWeb as unknown as Record<string, boolean>,
        },
        null,
        result.token
      )
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha no login')
    } finally {
      setLoading(false)
    }
  }

  const handleDeviceLogin = async () => {
    if (!deviceKey.trim() || !senha.trim()) {
      Alert.alert('Erro', 'Preencha a chave do dispositivo e senha')
      return
    }

    setLoading(true)
    try {
      const result = await api.deviceLogin(deviceKey.trim(), senha.trim())
      setAuth(
        result.user
          ? {
              ...result.user,
              permissoesMobile: result.user.permissoesMobile || {},
            }
          : {
              id: `device:${result.device.id}`,
              nome: result.device.nome,
              email: '',
              tipoPermissao: 'AcessoControlado',
              permissoesMobile: {},
              rotasPermitidas: result.device.rotasPermitidas,
            },
        result.device,
        result.token
      )
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha no login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.logo}>App Cobrancas</Text>
          <Text style={styles.subtitle}>Sistema de Gestao</Text>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, mode === 'user' && styles.tabActive]}
            onPress={() => setMode('user')}
          >
            <Text style={[styles.tabText, mode === 'user' && styles.tabTextActive]}>
              Usuario
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'device' && styles.tabActive]}
            onPress={() => setMode('device')}
          >
            <Text style={[styles.tabText, mode === 'device' && styles.tabTextActive]}>
              Dispositivo
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {mode === 'user' ? (
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : (
            <TextInput
              style={styles.input}
              placeholder="Chave do Dispositivo"
              placeholderTextColor={colors.textMuted}
              value={deviceKey}
              onChangeText={setDeviceKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor={colors.textMuted}
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={mode === 'user' ? handleUserLogin : handleDeviceLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    fontSize: fontSize.title,
    fontWeight: '800',
    color: colors.textOnPrimary,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.xs,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  form: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: fontSize.md,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
  },
})
