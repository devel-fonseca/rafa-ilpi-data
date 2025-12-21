import { TrendingUp, Users, DollarSign, Target } from 'lucide-react'
import { MetricCard } from '@/components/superadmin/MetricCard'
import { RevenueChart } from '@/components/superadmin/RevenueChart'
import {
  useOverviewMetrics,
  useTrendsMetrics,
} from '@/hooks/useSuperAdminMetrics'
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

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
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(overview?.ltv || 0)}
          </span>
          <span className="text-sm text-slate-400">por cliente</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          LTV = MRR médio / (Churn Rate / 100)
        </p>
      </div>
    </div>
  )
}
