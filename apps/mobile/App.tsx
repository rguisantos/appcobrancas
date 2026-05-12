import React, { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { StatusBar } from 'expo-status-bar'
import { useAuthStore } from '@/store/auth'
import { restoreAuth } from '@/lib/auth-persistence'
import { colors } from '@/theme/colors'

// Screens
import { LoginScreen } from '@/screens/LoginScreen'
import { DashboardScreen } from '@/screens/DashboardScreen'
import { ClientesScreen } from '@/screens/ClientesScreen'
import { ClienteDetailScreen } from '@/screens/ClienteDetailScreen'
import { ClienteFormScreen } from '@/screens/ClienteFormScreen'
import { ProdutosScreen } from '@/screens/ProdutosScreen'
import { ProdutoDetailScreen } from '@/screens/ProdutoDetailScreen'
import { LocacoesScreen } from '@/screens/LocacoesScreen'
import { LocacaoDetailScreen } from '@/screens/LocacaoDetailScreen'
import { CobrancasScreen } from '@/screens/CobrancasScreen'
import { CobrancaDetailScreen } from '@/screens/CobrancaDetailScreen'
import { CobrancaFormScreen } from '@/screens/CobrancaFormScreen'
import { ManutencoesScreen } from '@/screens/ManutencoesScreen'
import { NotificacoesScreen } from '@/screens/NotificacoesScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { LoadingScreen } from '@/components/LoadingScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Inicio', tabBarLabel: 'Inicio' }}
      />
      <Tab.Screen
        name="Clientes"
        component={ClientesScreen}
        options={{ title: 'Clientes', tabBarLabel: 'Clientes' }}
      />
      <Tab.Screen
        name="Cobrancas"
        component={CobrancasScreen}
        options={{ title: 'Cobrancas', tabBarLabel: 'Cobrancas' }}
      />
      <Tab.Screen
        name="Produtos"
        component={ProdutosScreen}
        options={{ title: 'Produtos', tabBarLabel: 'Produtos' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Config', tabBarLabel: 'Config' }}
      />
    </Tab.Navigator>
  )
}

function AuthenticatedStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="HomeTabs"
        component={HomeTabs}
        options={{ headerShown: false }}
      />
      {/* Detail screens */}
      <Stack.Screen
        name="ClienteDetail"
        component={ClienteDetailScreen}
        options={{ title: 'Detalhe do Cliente' }}
      />
      <Stack.Screen
        name="ClienteForm"
        component={ClienteFormScreen}
        options={{ title: 'Novo Cliente' }}
      />
      <Stack.Screen
        name="CobrancaDetail"
        component={CobrancaDetailScreen}
        options={{ title: 'Detalhe da Cobranca' }}
      />
      <Stack.Screen
        name="CobrancaForm"
        component={CobrancaFormScreen}
        options={{ title: 'Nova Cobranca' }}
      />
      <Stack.Screen
        name="ProdutoDetail"
        component={ProdutoDetailScreen}
        options={{ title: 'Detalhe do Produto' }}
      />
      <Stack.Screen
        name="Locacoes"
        component={LocacoesScreen}
        options={{ title: 'Locacoes' }}
      />
      <Stack.Screen
        name="LocacaoDetail"
        component={LocacaoDetailScreen}
        options={{ title: 'Detalhe da Locacao' }}
      />
      <Stack.Screen
        name="Manutencoes"
        component={ManutencoesScreen}
        options={{ title: 'Manutencoes' }}
      />
      <Stack.Screen
        name="Notificacoes"
        component={NotificacoesScreen}
        options={{ title: 'Notificacoes' }}
      />
    </Stack.Navigator>
  )
}

export default function App() {
  const { isAuthenticated, isLoading } = useAuthStore()

  // Restore persisted auth on app launch
  useEffect(() => {
    restoreAuth()
  }, [])

  if (isLoading) {
    return <LoadingScreen message="Iniciando..." />
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {isAuthenticated ? <AuthenticatedStack /> : <LoginScreen />}
    </NavigationContainer>
  )
}
