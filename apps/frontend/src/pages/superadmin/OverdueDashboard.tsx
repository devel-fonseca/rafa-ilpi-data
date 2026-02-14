import { AlertTriangle, TrendingDown, Clock, Percent } from 'lucide-react'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useOverdueMetrics, useOverdueTenants, useOverdueTrends } from '@/hooks/useOverdueMetrics'
import { Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { OverdueTenantsTable } from '@/components/superadmin/OverdueTenantsTable'
import { OverdueTrendChart } from '@/components/superadmin/OverdueTrendChart'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePersistedState } from '@/hooks/usePersistedState'
import { useToast } from '@/components/ui/use-toast'
import { RotateCcw, Save } from 'lucide-react'

/**
 * OverdueDashboard
 *
 * Dashboard dedicado para gerenciamento de inadimplência.
 * Exibe métricas consolidadas, tendências temporais e lista de tenants inadimplentes.
 */
export function OverdueDashboard() {
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const [options, setOptions] = usePersistedState<{
    sortBy: 'amount' | 'days' | 'count'
    limit: number
    months: number
  }>('superadmin:overdue:options:v1', {
    sortBy: 'amount',
    limit: 50,
    months: 6,
  })
  const [savedView, setSavedView] = usePersistedState<typeof options | null>(
    'superadmin:overdue:saved-view:v1',
    null,
  )

  useEffect(() => {
    const sortBy = searchParams.get('sortBy')
    const limit = searchParams.get('limit')
    const months = searchParams.get('months')

    if (!sortBy && !limit && !months) return

    setOptions((prev) => ({
      sortBy:
        sortBy === 'amount' || sortBy === 'days' || sortBy === 'count'
          ? sortBy
          : prev.sortBy,
      limit: limit ? Math.max(10, Number(limit)) : prev.limit,
      months: months ? Math.max(3, Math.min(12, Number(months))) : prev.months,
    }))
  }, [searchParams, setOptions])

  const { data: metrics, isLoading: isLoadingMetrics, error: errorMetrics } = useOverdueMetrics()
  const { data: tenants, isLoading: isLoadingTenants } = useOverdueTenants({
    limit: options.limit,
    sortBy: options.sortBy,
  })
  const { data: trends, isLoading: isLoadingTrends } = useOverdueTrends({ months: options.months })

  const handleSaveView = () => {
    setSavedView(options)
    toast({ title: 'Visão salva', description: 'Configuração do dashboard salva.' })
  }

  const handleApplyView = () => {
    if (!savedView) return
    setOptions(savedView)
    toast({ title: 'Visão aplicada', description: 'Configuração salva aplicada.' })
  }

  const handleResetView = () => {
    setOptions({ sortBy: 'amount', limit: 50, months: 6 })
  }

  // Loading state
  if (isLoadingMetrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    )
  }

  // Error state
  if (errorMetrics) {
    return (
      <div className="p-8">
        <Alert className="bg-danger/90 border-danger/80">
          <AlertCircle className="h-4 w-4 text-danger/40" />
          <AlertDescription className="text-danger/20">
            Erro ao carregar dados de inadimplência. Por favor, tente novamente.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Sem dados de overdue
  if (!metrics || metrics.totalOverdueInvoices === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard de Inadimplência</h1>
          <p className="text-slate-400 mt-1">Monitore faturas vencidas e tendências de inadimplência</p>
        </div>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-success/30">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-success/10 rounded-full">
                <AlertTriangle className="h-12 w-12 text-success" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-success/95 mb-2">
              Tudo em Dia! 🎉
            </h3>
            <p className="text-success/80">
              Não há faturas vencidas no momento. Excelente trabalho!
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard de Inadimplência</h1>
        <p className="text-slate-400 mt-1">Monitore faturas vencidas e tendências de inadimplência</p>
      </div>

      <Card className="bg-white border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-3">
              <Select
                value={options.sortBy}
                onValueChange={(value: 'amount' | 'days' | 'count') =>
                  setOptions((prev) => ({ ...prev, sortBy: value }))
                }
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Ordenação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Ordenar por valor em atraso</SelectItem>
                  <SelectItem value="days">Ordenar por dias de atraso</SelectItem>
                  <SelectItem value="count">Ordenar por qtd. faturas</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={String(options.limit)}
                onValueChange={(value) =>
                  setOptions((prev) => ({ ...prev, limit: Number(value) }))
                }
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Limite" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">Top 20</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                  <SelectItem value="100">Top 100</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={String(options.months)}
                onValueChange={(value) =>
                  setOptions((prev) => ({ ...prev, months: Number(value) }))
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Período tendência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Tendência 3 meses</SelectItem>
                  <SelectItem value="6">Tendência 6 meses</SelectItem>
                  <SelectItem value="12">Tendência 12 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSaveView}>
                <Save className="h-4 w-4 mr-2" />
                Salvar visão
              </Button>
              <Button variant="outline" size="sm" onClick={handleApplyView} disabled={!savedView}>
                Aplicar visão
              </Button>
              <Button variant="ghost" size="sm" onClick={handleResetView}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Resetar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Receita em Atraso */}
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-danger/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-danger/90 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Receita em Atraso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-danger/90">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(metrics.totalOverdueAmount)}
            </div>
            <p className="text-xs text-danger/80 mt-2">
              {metrics.totalOverdueInvoices} {metrics.totalOverdueInvoices === 1 ? 'fatura vencida' : 'faturas vencidas'}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Aging Breakdown */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Aging Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">0-30 dias</span>
                <span className="text-sm font-semibold text-severity-warning">
                  R$ {(metrics.aging['0-30'].amount / 1000).toFixed(1)}k ({metrics.aging['0-30'].count})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">30-60 dias</span>
                <span className="text-sm font-semibold text-danger">
                  R$ {(metrics.aging['30-60'].amount / 1000).toFixed(1)}k ({metrics.aging['30-60'].count})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">60+ dias</span>
                <span className="text-sm font-semibold text-danger/90">
                  R$ {(metrics.aging['60+'].amount / 1000).toFixed(1)}k ({metrics.aging['60+'].count})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Taxa de Inadimplência */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Taxa de Inadimplência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {metrics.overdueRate.toFixed(1)}%
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Média de {metrics.averageDaysOverdue.toFixed(0)} dias de atraso
            </p>
            <div className="mt-3">
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-danger/60 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(metrics.overdueRate, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Tendência */}
      {!isLoadingTrends && trends && trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">
              Evolução da Inadimplência - Últimos {options.months} Meses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OverdueTrendChart data={trends} />
          </CardContent>
        </Card>
      )}

      {/* Tabela de Tenants Inadimplentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Tenants Inadimplentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTenants ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : tenants && tenants.length > 0 ? (
            <OverdueTenantsTable tenants={tenants} />
          ) : (
            <div className="text-center py-8 text-slate-400">
              Nenhum tenant inadimplente encontrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
