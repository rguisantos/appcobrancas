import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { StatusBar } from 'expo-status-bar'
import { useAuthStore } from '@/store/auth'
import { colors } from '@/theme/colors'

// Screens
import { LoginScreen } from '@/screens/LoginScreen'
import { DashboardScreen } from '@/screens/DashboardScreen'
import { ClientesScreen } from '@/screens/ClientesScreen'
import { ClienteDetailScreen } from '@/screens/ClienteDetailScreen'
import { ClienteFormScreen } from '@/screens/ClienteFormScreen'
import { ProdutosScreen } from '@/screens/ProdutosScreen'
import { CobrancasScreen } from '@/screens/CobrancasScreen'
import { CobrancaFormScreen } from '@/screens/CobrancaFormScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'

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
        options={{
          title: 'Inicio',
          tabBarLabel: 'Inicio',
        }}
      />
      <Tab.Screen
        name="Clientes"
        component={ClientesScreen}
        options={{
          title: 'Clientes',
          tabBarLabel: 'Clientes',
        }}
      />
      <Tab.Screen
        name="Cobrancas"
        component={CobrancasScreen}
        options={{
          title: 'Cobrancas',
          tabBarLabel: 'Cobrancas',
        }}
      />
      <Tab.Screen
        name="Produtos"
        component={ProdutosScreen}
        options={{
          title: 'Produtos',
          tabBarLabel: 'Produtos',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Config',
          tabBarLabel: 'Config',
        }}
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
        name="CobrancaForm"
        component={CobrancaFormScreen}
        options={{ title: 'Nova Cobranca' }}
      />
    </Stack.Navigator>
  )
}

export default function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {isAuthenticated ? <AuthenticatedStack /> : <LoginScreen />}
    </NavigationContainer>
  )
}
