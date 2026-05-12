import React, { useState } from 'react'
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
import { colors } from '@/theme/colors'
import { borderRadius, fontSize, spacing } from '@/theme/spacing'

export function ClienteFormScreen() {
  const navigation = useNavigation<any>()
  const [submitting, setSubmitting] = useState(false)

  const [nomeExibicao, setNomeExibicao] = useState('')
  const [telefonePrincipal, setTelefonePrincipal] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [cep, setCep] = useState('')
  const [logradouro, setLogradouro] = useState('')
  const [numero, setNumero] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')

  const handleSubmit = async () => {
    if (!nomeExibicao.trim() || !telefonePrincipal.trim()) {
      Alert.alert('Erro', 'Nome e telefone sao obrigatorios')
      return
    }

    setSubmitting(true)
    try {
      await api.createCliente({
        nomeExibicao: nomeExibicao.trim(),
        telefonePrincipal: telefonePrincipal.trim(),
        email: email.trim() || undefined,
        cpf: cpf.trim() || undefined,
        cep: cep.trim(),
        logradouro: logradouro.trim(),
        numero: numero.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        estado: estado.trim(),
      } as any)
      Alert.alert('Sucesso', 'Cliente criado com sucesso')
      navigation.goBack()
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro ao criar cliente')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card title="Dados Basicos">
        <View style={styles.field}>
          <Text style={styles.label}>Nome *</Text>
          <TextInput
            style={styles.input}
            value={nomeExibicao}
            onChangeText={setNomeExibicao}
            placeholder="Nome do cliente"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Telefone *</Text>
          <TextInput
            style={styles.input}
            value={telefonePrincipal}
            onChangeText={setTelefonePrincipal}
            placeholder="(00) 00000-0000"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="email@exemplo.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>CPF</Text>
          <TextInput
            style={styles.input}
            value={cpf}
            onChangeText={setCpf}
            placeholder="000.000.000-00"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
        </View>
      </Card>

      <Card title="Endereco">
        <View style={styles.field}>
          <Text style={styles.label}>CEP</Text>
          <TextInput
            style={styles.input}
            value={cep}
            onChangeText={setCep}
            placeholder="00000-000"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.fieldRow}>
          <View style={[styles.field, { flex: 2 }]}>
            <Text style={styles.label}>Rua</Text>
            <TextInput
              style={styles.input}
              value={logradouro}
              onChangeText={setLogradouro}
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Numero</Text>
            <TextInput
              style={styles.input}
              value={numero}
              onChangeText={setNumero}
              keyboardType="numeric"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Bairro</Text>
          <TextInput
            style={styles.input}
            value={bairro}
            onChangeText={setBairro}
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={styles.fieldRow}>
          <View style={[styles.field, { flex: 2 }]}>
            <Text style={styles.label}>Cidade</Text>
            <TextInput
              style={styles.input}
              value={cidade}
              onChangeText={setCidade}
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>UF</Text>
            <TextInput
              style={styles.input}
              value={estado}
              onChangeText={setEstado}
              autoCapitalize="characters"
              maxLength={2}
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
      </Card>

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Criar Cliente</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  field: { marginBottom: spacing.sm },
  fieldRow: { flexDirection: 'row', gap: spacing.sm },
  label: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 4 },
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
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
})
