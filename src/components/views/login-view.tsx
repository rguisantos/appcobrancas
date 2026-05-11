'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Loader2, BarChart3, Package, DollarSign, MapPin, Mail, Lock, Shield, Zap, ArrowRight } from 'lucide-react'

const features = [
  {
    icon: BarChart3,
    title: 'Gestão de Clientes',
    description: 'Cadastro completo com busca automática de CEP e histórico financeiro.',
  },
  {
    icon: Package,
    title: 'Controle de Produtos',
    description: 'Gerencie mesas, equipamentos e manutenções em um só lugar.',
  },
  {
    icon: DollarSign,
    title: 'Cobranças Automáticas',
    description: 'Cálculo inteligente de cobranças com descontos e relatórios.',
  },
  {
    icon: MapPin,
    title: 'Mapa de Rotas',
    description: 'Visualize clientes no mapa e otimize suas rotas de cobrança.',
  },
]

export function LoginView() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const success = await login(email, senha)
      if (!success) {
        setError('Email ou senha inválidos. Verifique suas credenciais.')
      }
    } catch {
      setError('Erro ao fazer login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700">
        {/* Decorative elements */}
        <div className="absolute inset-0">
          {/* Large decorative circles */}
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
          <div className="absolute top-1/3 -right-16 w-72 h-72 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 left-1/4 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.02]" />
          
          {/* Dot pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
              backgroundSize: '32px 32px',
            }}
          />

          {/* Decorative lines */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="0" x2="100%" y2="100%" stroke="white" strokeWidth="1" />
            <line x1="100%" y1="0" x2="0" y2="100%" stroke="white" strokeWidth="1" />
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="white" strokeWidth="0.5" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="white" strokeWidth="0.5" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Top: Branding */}
          <div className="animate-login-slide-up">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                <span className="text-2xl font-bold text-white">C</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">App Cobranças</h1>
                <p className="text-emerald-100/80 text-sm">Sistema de Gestão de Cobranças</p>
              </div>
            </div>
          </div>

          {/* Middle: Features */}
          <div className="space-y-6 animate-login-slide-up-delay">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                Gerencie suas cobranças<br />com eficiência
              </h2>
              <p className="text-emerald-100/70 text-base leading-relaxed max-w-md">
                Uma plataforma completa para controle de clientes, cobranças e relatórios financeiros. Simplifique sua operação.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 max-w-md">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="flex items-start gap-4 rounded-xl bg-white/10 backdrop-blur-sm p-4 ring-1 ring-white/10 transition-all duration-300 hover:bg-white/15 hover:ring-white/20"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white leading-tight">{feature.title}</p>
                    <p className="text-xs text-emerald-100/70 mt-1 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: Trust badges */}
          <div className="flex items-center gap-6 text-emerald-100/50 text-xs animate-login-slide-up-delay-2">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              <span>Dados seguros</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              <span>Alta performance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" />
              <span>Fácil de usar</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Full width on mobile */}
      <div className="flex-1 flex flex-col min-h-screen bg-background">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
          <div className="w-full max-w-md page-enter">
            {/* Mobile-only branding */}
            <div className="lg:hidden text-center mb-8">
              <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400/10">
                <span className="text-2xl font-bold text-white">C</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">App Cobranças</h1>
              <p className="text-muted-foreground mt-1 text-sm">Sistema de Gestão de Cobranças</p>
            </div>

            {/* Login card */}
            <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Entrar</h2>
                <p className="text-muted-foreground mt-1.5 text-sm">
                  Insira suas credenciais para acessar o sistema
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="animate-shake">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="h-11 pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senha" className="text-sm font-medium">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      id="senha"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      required
                      disabled={loading}
                      className="h-11 pl-10 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <div className="flex justify-end">
                    <a
                      href="#"
                      className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                    >
                      Esqueceu sua senha?
                    </a>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 transition-all duration-200"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      Entrar
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3 text-muted-foreground">ou</span>
                </div>
              </div>

              {/* Demo credentials */}
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Credenciais de demonstração:</p>
                <div className="flex flex-col gap-1.5 text-xs text-muted-foreground/80">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="font-mono">admin@locacao.com</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-3 w-3 shrink-0" />
                    <span className="font-mono">admin123</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <p className="mt-8 text-center text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} App Cobranças &mdash; Sistema de Gestão. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes login-slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        .animate-login-slide-up {
          animation: login-slide-up 0.7s ease-out both;
        }
        .animate-login-slide-up-delay {
          animation: login-slide-up 0.7s ease-out 0.15s both;
        }
        .animate-login-slide-up-delay-2 {
          animation: login-slide-up 0.7s ease-out 0.3s both;
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  )
}
