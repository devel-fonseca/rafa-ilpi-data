import { AlertTriangle, TrendingDown, Clock, Percent } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useOverdueMetrics, useOverdueTenants, useOverdueTrends } from '@/hooks/useOverdueMetrics'
import { Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { OverdueTenantsTable } from '@/components/superadmin/OverdueTenantsTable'
import { OverdueTrendChart } from '@/components/superadmin/OverdueTrendChart'

/**
 * OverdueDashboard
 *
 * Dashboard dedicado para gerenciamento de inadimplência.
 * Exibe métricas consolidadas, tendências temporais e lista de tenants inadimplentes.
 */
export function OverdueDashboard() {
  const { data: metrics, isLoading: isLoadingMetrics, error: errorMetrics } = useOverdueMetrics()
  const { data: tenants, isLoading: isLoadingTenants } = useOverdueTenants({ limit: 50, sortBy: 'amount' })
  const { data: trends, isLoading: isLoadingTrends } = useOverdueTrends({ months: 6 })

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
              Evolução da Inadimplência - Últimos 6 Meses
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
