'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { format, parseISO } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'

interface LogAuditoria {
  id: string
  usuarioId: string | null
  acao: string
  entidade: string
  entidadeId: string | null
  entidadeNome: string | null
  detalhes: string | null
  antes: string | null
  depois: string | null
  ip: string | null
  severidade: string
  origem: string
  usuario: {
    id: string
    nome: string
    email: string
  } | null
  createdAt: string
}

const acoesOptions = [
  'criar_usuario',
  'atualizar_usuario',
  'excluir_usuario',
  'login',
  'criar_rota',
  'atualizar_rota',
  'excluir_rota',
  'criar_cliente',
  'atualizar_cliente',
  'excluir_cliente',
  'criar_produto',
  'atualizar_produto',
  'excluir_produto',
  'criar_locacao',
  'atualizar_locacao',
  'excluir_locacao',
  'criar_cobranca',
  'atualizar_cobranca',
  'excluir_cobranca',
  'criar_meta',
  'atualizar_meta',
  'excluir_meta',
  'criar_dispositivo',
  'excluir_dispositivo',
  'criar_tipo_produto',
  'criar_descricao_produto',
  'criar_tamanho_produto',
  'criar_estabelecimento',
]

const entidadeOptions = [
  'usuario',
  'rota',
  'cliente',
  'produto',
  'locacao',
  'cobranca',
  'meta',
  'dispositivo',
  'tipo_produto',
  'descricao_produto',
  'tamanho_produto',
  'estabelecimento',
  'manutencao',
  'historico_relogio',
]

const severidadeColors: Record<string, string> = {
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  aviso: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  critico: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  seguranca: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const severidadeLabels: Record<string, string> = {
  info: 'Info',
  aviso: 'Aviso',
  critico: 'Crítico',
  seguranca: 'Segurança',
}

const origemColors: Record<string, string> = {
  web: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  mobile: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  sistema: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  cron: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

const origemLabels: Record<string, string> = {
  web: 'Web',
  mobile: 'Mobile',
  sistema: 'Sistema',
  cron: 'Cron',
}

export function AdminAuditoriaView() {
  // Data state
  const [logs, setLogs] = useState<LogAuditoria[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filter state
  const [page, setPage] = useState(1)
  const [acaoFilter, setAcaoFilter] = useState<string>('all')
  const [entidadeFilter, setEntidadeFilter] = useState<string>('all')
  const [severidadeFilter, setSeveridadeFilter] = useState<string>('all')
  const [origemFilter, setOrigemFilter] = useState<string>('all')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const limit = 20

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (acaoFilter && acaoFilter !== 'all') params.set('acao', acaoFilter)
      if (entidadeFilter && entidadeFilter !== 'all') params.set('entidade', entidadeFilter)
      if (severidadeFilter && severidadeFilter !== 'all') params.set('severidade', severidadeFilter)
      if (origemFilter && origemFilter !== 'all') params.set('origem', origemFilter)
      if (dataInicio) params.set('dataInicio', dataInicio)
      if (dataFim) params.set('dataFim', dataFim)

      const res = await fetch(`/api/auditoria?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.data || [])
        setTotal(data.total || 0)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao buscar logs')
      }
    } catch {
      toast.error('Erro ao buscar logs de auditoria')
    } finally {
      setLoading(false)
    }
  }, [page, acaoFilter, entidadeFilter, severidadeFilter, origemFilter, dataInicio, dataFim])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const totalPages = Math.ceil(total / limit)

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy HH:mm:ss')
    } catch {
      return dateStr
    }
  }

  const formatJson = (jsonStr: string | null): string => {
    if (!jsonStr) return ''
    try {
      return JSON.stringify(JSON.parse(jsonStr), null, 2)
    } catch {
      return jsonStr
    }
  }

  const getDiffFields = (antesStr: string | null, depoisStr: string | null) => {
    if (!antesStr || !depoisStr) return []
    try {
      const antes = JSON.parse(antesStr) as Record<string, unknown>
      const depois = JSON.parse(depoisStr) as Record<string, unknown>
      const allKeys = new Set([...Object.keys(antes), ...Object.keys(depois)])
      const changes: Array<{ key: string; before: string; after: string }> = []
      allKeys.forEach((key) => {
        const b = antes[key]
        const a = depois[key]
        if (JSON.stringify(b) !== JSON.stringify(a)) {
          changes.push({
            key,
            before: typeof b === 'object' ? JSON.stringify(b) : String(b ?? '—'),
            after: typeof a === 'object' ? JSON.stringify(a) : String(a ?? '—'),
          })
        }
      })
      return changes
    } catch {
      return []
    }
  }

  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Auditoria</h1>
        <p className="text-muted-foreground text-sm">
          {total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
            <Select value={acaoFilter} onValueChange={handleFilterChange(setAcaoFilter)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {acoesOptions.map((a) => (
                  <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entidadeFilter} onValueChange={handleFilterChange(setEntidadeFilter)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as entidades</SelectItem>
                {entidadeOptions.map((e) => (
                  <SelectItem key={e} value={e}>{e.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={severidadeFilter} onValueChange={handleFilterChange(setSeveridadeFilter)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="aviso">Aviso</SelectItem>
                <SelectItem value="critico">Crítico</SelectItem>
                <SelectItem value="seguranca">Segurança</SelectItem>
              </SelectContent>
            </Select>

            <Select value={origemFilter} onValueChange={handleFilterChange(setOrigemFilter)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="sistema">Sistema</SelectItem>
                <SelectItem value="cron">Cron</SelectItem>
              </SelectContent>
            </Select>

            <div className="space-y-1">
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => { setDataInicio(e.target.value); setPage(1) }}
                placeholder="Data início"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => { setDataFim(e.target.value); setPage(1) }}
                placeholder="Data fim"
                className="h-9 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton />
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">Nenhum log encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tente ajustar os filtros de busca
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead className="hidden lg:table-cell">Nome</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead className="hidden md:table-cell">Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, idx) => {
                  const isExpanded = expandedId === log.id
                  const changes = getDiffFields(log.antes, log.depois)
                  return (
                    <TableRow
                      key={log.id}
                      className={`cursor-pointer hover:bg-muted/50 transition-colors ${idx % 2 === 1 ? 'bg-muted/10' : ''} ${log.severidade === 'critico' || log.severidade === 'seguranca' ? 'border-l-4 border-l-red-400' : log.severidade === 'aviso' ? 'border-l-4 border-l-yellow-400' : ''}`}
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.usuario?.nome || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs border-0 bg-muted">
                          {log.acao.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.entidade.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[150px] truncate">
                        {log.entidadeNome || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs border-0 ${severidadeColors[log.severidade] || 'bg-gray-100 text-gray-800'}`}
                        >
                          {severidadeLabels[log.severidade] || log.severidade}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge
                          variant="outline"
                          className={`text-xs border-0 ${origemColors[log.origem] || 'bg-gray-100 text-gray-800'}`}
                        >
                          {origemLabels[log.origem] || log.origem}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Expanded Detail Section */}
      {expandedId && (() => {
        const log = logs.find((l) => l.id === expandedId)
        if (!log) return null
        const changes = getDiffFields(log.antes, log.depois)
        return (
          <Card className="shadow-sm border-primary/20">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Detalhes do Log</h3>
                <Button variant="ghost" size="sm" onClick={() => setExpandedId(null)}>
                  Fechar
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">ID:</span>
                  <p className="font-mono text-xs mt-0.5">{log.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">IP:</span>
                  <p className="font-mono text-xs mt-0.5">{log.ip || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Entidade ID:</span>
                  <p className="font-mono text-xs mt-0.5">{log.entidadeId || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Usuário:</span>
                  <p className="text-xs mt-0.5">{log.usuario?.nome || '—'} ({log.usuario?.email || '—'})</p>
                </div>
              </div>

              {log.detalhes && (
                <div>
                  <span className="text-sm text-muted-foreground">Detalhes:</span>
                  <pre className="text-xs bg-muted p-3 rounded-md mt-1 font-mono overflow-x-auto whitespace-pre-wrap">
                    {formatJson(log.detalhes)}
                  </pre>
                </div>
              )}

              {changes.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Alterações:</span>
                  <div className="mt-2 space-y-2">
                    {changes.map((c) => (
                      <div key={c.key} className="grid grid-cols-[120px_1fr_1fr] gap-2 text-xs border rounded-md p-2">
                        <span className="font-medium">{c.key}</span>
                        <div className="bg-red-50 dark:bg-red-950 p-1.5 rounded font-mono">
                          <span className="text-red-600 dark:text-red-400 text-[10px] block mb-0.5">ANTES</span>
                          {c.before}
                        </div>
                        <div className="bg-green-50 dark:bg-green-950 p-1.5 rounded font-mono">
                          <span className="text-green-600 dark:text-green-400 text-[10px] block mb-0.5">DEPOIS</span>
                          {c.after}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {log.antes && !log.depois && (
                <div>
                  <span className="text-sm text-muted-foreground">Dados (antes):</span>
                  <pre className="text-xs bg-muted p-3 rounded-md mt-1 font-mono overflow-x-auto whitespace-pre-wrap max-h-64">
                    {formatJson(log.antes)}
                  </pre>
                </div>
              )}

              {log.depois && !log.antes && (
                <div>
                  <span className="text-sm text-muted-foreground">Dados (depois):</span>
                  <pre className="text-xs bg-muted p-3 rounded-md mt-1 font-mono overflow-x-auto whitespace-pre-wrap max-h-64">
                    {formatJson(log.depois)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages} ({total} registros)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: 8 }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
