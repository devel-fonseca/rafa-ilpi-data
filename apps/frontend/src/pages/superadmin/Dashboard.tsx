import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { MetricCard } from '@/components/superadmin/MetricCard'
import { RevenueChart } from '@/components/superadmin/RevenueChart'
import {
  useOverviewMetrics,
  useTrendsMetrics,
} from '@/hooks/useSuperAdminMetrics'
import { useOverdueMetrics } from '@/hooks/useOverdueMetrics'
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * SuperAdminDashboard
 *
 * Página principal do portal do Super Administrador.
 *
 * Métricas exibidas:
 * - MRR (Monthly Recurring Revenue) - Receita recorrente mensal
 * - ARR (Annual Recurring Revenue) - Receita recorrente anual
 * - Churn Rate - Taxa de cancelamento
 * - LTV (Lifetime Value) - Valor vitalício do cliente
 * - Gráfico de evolução de MRR dos últimos 12 meses
 */
export function SuperAdminDashboard() {
  const {
    data: overview,
    isLoading: isLoadingOverview,
    error: errorOverview,
  } = useOverviewMetrics()
  const {
    data: trends,
    isLoading: isLoadingTrends,
    error: errorTrends,
  } = useTrendsMetrics(12)
  const { data: overdueMetrics } = useOverdueMetrics()

  // Loading state
  if (isLoadingOverview || isLoadingTrends) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    )
  }

  // Error state
  if (errorOverview || errorTrends) {
    return (
      <div className="p-8">
        <Alert className="bg-red-900 border-red-800">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-200">
            Erro ao carregar métricas. Por favor, tente novamente.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Dashboard do Super Administrador
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Visão geral de métricas e tendências de negócio
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="MRR"
          value={overview?.mrr || 0}
          icon={DollarSign}
          description="Receita Recorrente Mensal"
          format="currency"
        />
        <MetricCard
          title="ARR"
          value={overview?.arr || 0}
          icon={TrendingUp}
          description="Receita Recorrente Anual"
          format="currency"
        />
        <MetricCard
          title="Churn Rate"
          value={overview?.churn || 0}
          icon={Target}
          description="Taxa de Cancelamento"
          format="percentage"
        />
        <MetricCard
          title="Total de Tenants"
          value={overview?.totalTenants || 0}
          icon={Users}
          description={`${overview?.activeTenants || 0} ativos`}
          format="number"
        />
      </div>

      {/* Overdue Alert Card */}
      {overdueMetrics && overdueMetrics.totalOverdueInvoices > 0 && (
        <Link to="/superadmin/overdue" className="block">
          <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 hover:border-red-300 transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-red-900">
                        Atenção: Inadimplência Detectada
                      </h3>
                      <p className="text-sm text-red-700">
                        Existem faturas vencidas que requerem ação
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-white/60 rounded-lg p-3 border border-red-100">
                      <p className="text-xs text-red-600 font-medium mb-1">
                        VALOR EM ATRASO
                      </p>
                      <p className="text-2xl font-bold text-red-900">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(overdueMetrics.totalOverdueAmount)}
                      </p>
                    </div>

                    <div className="bg-white/60 rounded-lg p-3 border border-red-100">
                      <p className="text-xs text-red-600 font-medium mb-1">
                        FATURAS VENCIDAS
                      </p>
                      <p className="text-2xl font-bold text-red-900">
                        {overdueMetrics.totalOverdueInvoices}
                      </p>
                    </div>

                    <div className="bg-white/60 rounded-lg p-3 border border-red-100">
                      <p className="text-xs text-red-600 font-medium mb-1">
                        TAXA DE INADIMPLÊNCIA
                      </p>
                      <p className="text-2xl font-bold text-red-900">
                        {overdueMetrics.overdueRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="default"
                  className="bg-red-600 hover:bg-red-700 text-white ml-4"
                >
                  Ver Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Revenue Chart */}
      <div className="grid gap-4">
        <RevenueChart
          data={trends?.data || []}
          title="Evolução de Receita (MRR) - Últimos 12 Meses"
          height={350}
        />
      </div>

      {/* Additional Info Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">
          Lifetime Value (LTV)
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900">
            {overview?.ltv !== null && overview?.ltv !== undefined
              ? new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(overview.ltv)
              : 'N/A'}
          </span>
          {overview?.ltv !== null && overview?.ltv !== undefined && (
            <span className="text-sm text-slate-400">por cliente</span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {overview?.ltv !== null && overview?.ltv !== undefined
            ? 'LTV = MRR médio / (Churn Rate / 100)'
            : 'Dados insuficientes (sem churn registrado)'}
        </p>
      </div>
    </div>
  )
}
