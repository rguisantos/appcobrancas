'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/store/auth'
import { LoginView } from '@/components/views/login-view'
import { AppShell } from '@/components/layout/app-shell'
import { ErrorBoundary } from '@/components/shared/error-boundary'

export default function HomePage() {
  const { isAuthenticated, isLoading, checkAuth } = useAuth()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginView />
  }

  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  )
}
