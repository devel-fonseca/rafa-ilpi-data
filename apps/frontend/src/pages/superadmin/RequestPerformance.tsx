import { useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useRequestPerformanceMetrics } from '@/hooks/useSuperAdminMetrics'
import type {
  RequestPerformanceEndpointItem,
  RequestPerformanceFilters,
  RequestPerformanceSummary,
} from '@/api/superadmin.api'
import { formatDateTimeSafe } from '@/utils/dateHelpers'

const DEFAULT_WINDOW_MINUTES = 15
const DEFAULT_TOP = 20

function formatMs(value: number): string {
  const normalized = Math.abs(value) >= 100 ? Math.round(value) : Number(value.toFixed(2))
  return `${normalized} ms`
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

function normalizeTenantLabel(tenantId: string): string {
  const normalized = tenantId.trim().toLowerCase()
  if (!normalized || normalized === 'unknown') {
    return 'public/system'
  }
  return tenantId
}

function getEndpointHealthStatus(
  item: RequestPerformanceEndpointItem,
  thresholds: RequestPerformanceSummary['alerts']['thresholds'],
): { label: string; className: string } {
  const hasHigh5xx = item.errorRate5xx >= thresholds.error5xxRatePercent
  const hasHighP95 = item.p95 >= thresholds.p95Ms

  if (hasHigh5xx) {
    return { label: 'Crítico', className: 'bg-danger text-white' }
  }

  if (hasHighP95) {
    return { label: 'Atenção', className: 'bg-warning text-white' }
  }

  return { label: 'Saudável', className: 'bg-success text-white' }
}

function buildFilters(input: {
  windowMinutes: string
  top: string
  tenantId: string
  endpointContains: string
}): RequestPerformanceFilters {
  const parsedWindow = Number.parseInt(input.windowMinutes, 10)
  const parsedTop = Number.parseInt(input.top, 10)

  return {
    windowMinutes:
      Number.isFinite(parsedWindow) && parsedWindow > 0
        ? parsedWindow
        : DEFAULT_WINDOW_MINUTES,
    top:
      Number.isFinite(parsedTop) && parsedTop > 0
        ? Math.min(parsedTop, 100)
        : DEFAULT_TOP,
    tenantId: input.tenantId.trim() || undefined,
    endpointContains: input.endpointContains.trim() || undefined,
  }
}

export function RequestPerformancePage() {
  const [draftWindowMinutes, setDraftWindowMinutes] = useState(String(DEFAULT_WINDOW_MINUTES))
  const [draftTop, setDraftTop] = useState(String(DEFAULT_TOP))
  const [draftTenantId, setDraftTenantId] = useState('')
  const [draftEndpointContains, setDraftEndpointContains] = useState('')
  const [showOnlyEndpointBreaches, setShowOnlyEndpointBreaches] = useState(false)

  const [filters, setFilters] = useState<RequestPerformanceFilters>({
    windowMinutes: DEFAULT_WINDOW_MINUTES,
    top: DEFAULT_TOP,
  })

  const { data, isLoading, isError, error, refetch, isFetching } = useRequestPerformanceMetrics(filters)

  const hasExtraFilters = useMemo(() => {
    return Boolean(filters.tenantId || filters.endpointContains)
  }, [filters.endpointContains, filters.tenantId])

  const endpointRows = useMemo(() => {
    if (!data) return []
    if (!showOnlyEndpointBreaches) return data.byEndpoint

    return data.byEndpoint.filter((item) => {
      const p95Breached = item.p95 >= data.alerts.thresholds.p95Ms
      const rateBreached = item.errorRate5xx >= data.alerts.thresholds.error5xxRatePercent
      return p95Breached || rateBreached
    })
  }, [data, showOnlyEndpointBreaches])

  const handleApplyFilters = () => {
    setFilters(
      buildFilters({
        windowMinutes: draftWindowMinutes,
        top: draftTop,
        tenantId: draftTenantId,
        endpointContains: draftEndpointContains,
      }),
    )
  }

  const handleResetFilters = () => {
    setDraftWindowMinutes(String(DEFAULT_WINDOW_MINUTES))
    setDraftTop(String(DEFAULT_TOP))
    setDraftTenantId('')
    setDraftEndpointContains('')
    setFilters({
      windowMinutes: DEFAULT_WINDOW_MINUTES,
      top: DEFAULT_TOP,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Performance Operacional</h1>
        <p className="mt-1 text-slate-400">
          Visão de latência e erros por endpoint e por tenant para monitoramento da plataforma.
        </p>
      </div>

      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-500">Janela</label>
              <Select value={draftWindowMinutes} onValueChange={setDraftWindowMinutes}>
                <SelectTrigger className="border-slate-200 bg-white">
                  <SelectValue placeholder="Janela" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Últimos 5 minutos</SelectItem>
                  <SelectItem value="15">Últimos 15 minutos</SelectItem>
                  <SelectItem value="30">Últimos 30 minutos</SelectItem>
                  <SelectItem value="60">Última 1 hora</SelectItem>
                  <SelectItem value="180">Últimas 3 horas</SelectItem>
                  <SelectItem value="720">Últimas 12 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-500">Top itens</label>
              <Select value={draftTop} onValueChange={setDraftTop}>
                <SelectTrigger className="border-slate-200 bg-white">
                  <SelectValue placeholder="Top" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">Top 10</SelectItem>
                  <SelectItem value="20">Top 20</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                  <SelectItem value="100">Top 100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-500">Tenant ID (opcional)</label>
              <Input
                value={draftTenantId}
                onChange={(event) => setDraftTenantId(event.target.value)}
                placeholder="Filtrar por tenant específico"
                className="border-slate-200 bg-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-500">Endpoint contém</label>
              <Input
                value={draftEndpointContains}
                onChange={(event) => setDraftEndpointContains(event.target.value)}
                placeholder="Ex.: /api/rdc-indicators"
                className="border-slate-200 bg-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleApplyFilters} className="bg-primary hover:bg-primary/90">
              <Search className="mr-2 h-4 w-4" />
              Aplicar filtros
            </Button>
            <Button variant="outline" onClick={handleResetFilters} className="border-slate-200">
              Limpar filtros
            </Button>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              className="border-slate-200"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            {hasExtraFilters && (
              <Badge variant="outline" className="border-primary/30 text-primary">
                filtro avançado ativo
              </Badge>
            )}
            <div className="ml-auto flex items-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-3 py-2">
              <Switch
                id="show-only-endpoint-breaches"
                checked={showOnlyEndpointBreaches}
                onCheckedChange={setShowOnlyEndpointBreaches}
              />
              <Label
                htmlFor="show-only-endpoint-breaches"
                className="cursor-pointer text-sm text-slate-700"
              >
                Somente endpoints acima do limite
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {isError && (
        <Alert className="border-danger/30 bg-danger/95">
          <AlertTriangle className="h-4 w-4 text-danger" />
          <AlertDescription className="text-danger/20">
            Não foi possível carregar os dados de performance.
            {error instanceof Error && error.message ? ` ${error.message}` : ''}
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (
        data && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card className="border-slate-200 bg-white">
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-500">Eventos analisados</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{data.analyzedEvents}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Janela de {data.windowMinutes} min
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white">
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-500">Eventos em memória</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{data.retainedEvents}</p>
                  <p className="mt-1 text-xs text-slate-500">Buffer de observabilidade</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white">
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-500">p95 total</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {formatMs(data.totals.p95)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    p99 {formatMs(data.totals.p99)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white">
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-500">Taxa de erro 5xx</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {formatPercent(data.totals.errorRate5xx)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {data.totals.errors5xx} erros ({data.totals.count} req.)
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white">
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-500">Alertas de threshold</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {data.alerts.endpointP95Breaches.length + data.alerts.tenant5xxBreaches.length}
                  </p>
                  <div className="mt-2">
                    {data.alerts.hasAny ? (
                      <Badge className="bg-warning text-white">Atenção</Badge>
                    ) : (
                      <Badge className="bg-success text-white">Sem alertas</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-200 bg-white">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-600">
                    Relatório gerado em {formatDateTimeSafe(data.generatedAt)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <Badge variant="outline" className="border-slate-200 text-slate-700">
                    Limite p95: {formatMs(data.alerts.thresholds.p95Ms)}
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 text-slate-700">
                    Limite 5xx: {formatPercent(data.alerts.thresholds.error5xxRatePercent)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {data.alerts.hasAny && (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-warning/40 bg-warning/95">
                  <CardHeader>
                    <CardTitle className="text-sm text-warning">
                      Endpoints acima do p95 esperado
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data.alerts.endpointP95Breaches.length === 0 && (
                      <p className="text-sm text-warning/80">Nenhum endpoint acima do limite.</p>
                    )}
                    {data.alerts.endpointP95Breaches.map((breach) => (
                      <div
                        key={`${breach.endpoint}-${breach.count}`}
                        className="rounded-md border border-warning/30 bg-white px-3 py-2"
                      >
                        <p className="break-all text-sm font-medium text-slate-900">
                          {breach.endpoint}
                        </p>
                        <p className="text-xs text-slate-500">
                          p95 {formatMs(breach.p95)} • {breach.count} requisições
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-danger/30 bg-danger/95">
                  <CardHeader>
                    <CardTitle className="text-sm text-danger">
                      Tenants com taxa 5xx acima do limite
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data.alerts.tenant5xxBreaches.length === 0 && (
                      <p className="text-sm text-danger/60">Nenhum tenant acima do limite.</p>
                    )}
                    {data.alerts.tenant5xxBreaches.map((breach) => (
                      <div
                        key={`${breach.tenantId}-${breach.count}`}
                        className="rounded-md border border-danger/30 bg-white px-3 py-2"
                      >
                        <p className="break-all text-sm font-medium text-slate-900">
                          {normalizeTenantLabel(breach.tenantId)}
                        </p>
                        <p className="text-xs text-slate-500">
                          5xx {formatPercent(breach.errorRate5xx)} • {breach.count} requisições
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle className="text-slate-900">
                  Top Endpoints
                  {showOnlyEndpointBreaches ? ' acima do limite' : ''}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {endpointRows.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-100 p-4 text-sm text-slate-500">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {showOnlyEndpointBreaches
                      ? 'Nenhum endpoint acima dos thresholds para os filtros selecionados.'
                      : 'Sem eventos para os filtros selecionados.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="min-w-[1020px]">
                      <TableHeader>
                        <TableRow className="border-slate-200 hover:bg-slate-100/50">
                          <TableHead className="text-slate-500">Endpoint</TableHead>
                          <TableHead className="text-slate-500">Status</TableHead>
                          <TableHead className="text-right text-slate-500">Req.</TableHead>
                          <TableHead className="text-right text-slate-500">p50</TableHead>
                          <TableHead className="text-right text-slate-500">p95</TableHead>
                          <TableHead className="text-right text-slate-500">p99</TableHead>
                          <TableHead className="text-right text-slate-500">Média</TableHead>
                          <TableHead className="text-right text-slate-500">4xx</TableHead>
                          <TableHead className="text-right text-slate-500">5xx</TableHead>
                          <TableHead className="text-right text-slate-500">Tx 5xx</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {endpointRows.map((item) => {
                          const p95Breached = item.p95 >= data.alerts.thresholds.p95Ms
                          const rateBreached =
                            item.errorRate5xx >= data.alerts.thresholds.error5xxRatePercent
                          const health = getEndpointHealthStatus(
                            item,
                            data.alerts.thresholds,
                          )
                          return (
                            <TableRow
                              key={item.endpoint}
                              className="border-slate-200 hover:bg-slate-100/30"
                            >
                              <TableCell className="max-w-[420px] break-all text-slate-900">
                                {item.endpoint}
                              </TableCell>
                              <TableCell>
                                <Badge className={health.className}>{health.label}</Badge>
                              </TableCell>
                              <TableCell className="text-right text-slate-700">{item.count}</TableCell>
                              <TableCell className="text-right text-slate-700">{formatMs(item.p50)}</TableCell>
                              <TableCell className={`text-right ${p95Breached ? 'text-warning font-medium' : 'text-slate-700'}`}>
                                {formatMs(item.p95)}
                              </TableCell>
                              <TableCell className="text-right text-slate-700">{formatMs(item.p99)}</TableCell>
                              <TableCell className="text-right text-slate-700">{formatMs(item.avgMs)}</TableCell>
                              <TableCell className="text-right text-slate-700">{item.errors4xx}</TableCell>
                              <TableCell className="text-right text-slate-700">{item.errors5xx}</TableCell>
                              <TableCell className={`text-right ${rateBreached ? 'text-danger font-medium' : 'text-slate-700'}`}>
                                {formatPercent(item.errorRate5xx)}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle className="text-slate-900">Top Tenants</CardTitle>
              </CardHeader>
              <CardContent>
                {data.byTenant.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-100 p-4 text-sm text-slate-500">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Sem eventos para os filtros selecionados.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="min-w-[1020px]">
                      <TableHeader>
                        <TableRow className="border-slate-200 hover:bg-slate-100/50">
                          <TableHead className="text-slate-500">Tenant</TableHead>
                          <TableHead className="text-right text-slate-500">Req.</TableHead>
                          <TableHead className="text-right text-slate-500">p50</TableHead>
                          <TableHead className="text-right text-slate-500">p95</TableHead>
                          <TableHead className="text-right text-slate-500">p99</TableHead>
                          <TableHead className="text-right text-slate-500">Média</TableHead>
                          <TableHead className="text-right text-slate-500">4xx</TableHead>
                          <TableHead className="text-right text-slate-500">5xx</TableHead>
                          <TableHead className="text-right text-slate-500">Tx 5xx</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.byTenant.map((item) => {
                          const p95Breached = item.p95 >= data.alerts.thresholds.p95Ms
                          const rateBreached =
                            item.errorRate5xx >= data.alerts.thresholds.error5xxRatePercent
                          return (
                            <TableRow
                              key={item.tenantId}
                              className="border-slate-200 hover:bg-slate-100/30"
                            >
                              <TableCell className="max-w-[320px] break-all text-slate-900">
                                {normalizeTenantLabel(item.tenantId)}
                              </TableCell>
                              <TableCell className="text-right text-slate-700">{item.count}</TableCell>
                              <TableCell className="text-right text-slate-700">{formatMs(item.p50)}</TableCell>
                              <TableCell className={`text-right ${p95Breached ? 'text-warning font-medium' : 'text-slate-700'}`}>
                                {formatMs(item.p95)}
                              </TableCell>
                              <TableCell className="text-right text-slate-700">{formatMs(item.p99)}</TableCell>
                              <TableCell className="text-right text-slate-700">{formatMs(item.avgMs)}</TableCell>
                              <TableCell className="text-right text-slate-700">{item.errors4xx}</TableCell>
                              <TableCell className="text-right text-slate-700">{item.errors5xx}</TableCell>
                              <TableCell className={`text-right ${rateBreached ? 'text-danger font-medium' : 'text-slate-700'}`}>
                                {formatPercent(item.errorRate5xx)}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )
      )}
    </div>
  )
}
