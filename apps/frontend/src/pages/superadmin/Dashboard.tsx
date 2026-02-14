import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  ShieldAlert,
  Clock3,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { MetricCard } from '@/components/superadmin/MetricCard'
import { RevenueChart } from '@/components/superadmin/RevenueChart'
import {
  useOverviewMetrics,
  useTrendsMetrics,
  useTenantMetrics,
} from '@/hooks/useSuperAdminMetrics'
import { useOverdueMetrics } from '@/hooks/useOverdueMetrics'
import { useTenants } from '@/hooks/useSuperAdmin'
import { useQuery } from '@tanstack/react-query'
import { getUnreadCount } from '@/api/alerts.api'
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { addDays } from 'date-fns'
import { getCurrentDate } from '@/utils/dateHelpers'

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
  const { data: tenantMetrics } = useTenantMetrics()
  const { data: trialTenants } = useTenants({ status: 'TRIAL', limit: 200 })
  const { data: criticalBillingFailures } = useQuery({
    queryKey: ['superadmin', 'alerts', 'unread-count', 'payment-failed-critical'],
    queryFn: () => getUnreadCount({ type: 'PAYMENT_FAILED', severity: 'CRITICAL' }),
    staleTime: 1000 * 60 * 2,
  })

  const today = getCurrentDate()
  const next7Days = addDays(new Date(`${today}T00:00:00`), 7)
  const next7DateStr = next7Days.toISOString().slice(0, 10)
  const trialExpiringIn7Days =
    trialTenants?.data?.reduce((acc, tenant) => {
      const trialSubscription = tenant.subscriptions.find((sub) => sub.status === 'trialing')
      if (!trialSubscription?.trialEndDate) return acc
      const trialEnd = String(trialSubscription.trialEndDate).slice(0, 10)
      return trialEnd >= today && trialEnd <= next7DateStr ? acc + 1 : acc
    }, 0) || 0

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
        <Alert className="bg-danger/90 border-danger/80">
          <AlertCircle className="h-4 w-4 text-danger/40" />
          <AlertDescription className="text-danger/20">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/superadmin/invoices?status=OPEN&onlyOverdue=true" className="block">
          <Card className="border border-slate-200 hover:border-danger/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Faturas Vencidas</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {overdueMetrics?.totalOverdueInvoices || 0}
                  </p>
                </div>
                <CreditCard className="h-5 w-5 text-danger" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/superadmin/tenants?status=TRIAL" className="block">
          <Card className="border border-slate-200 hover:border-primary/60 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Trials vencendo em 7 dias</p>
                  <p className="text-2xl font-bold text-slate-900">{trialExpiringIn7Days}</p>
                </div>
                <Clock3 className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/superadmin/alerts?type=PAYMENT_FAILED&severity=CRITICAL" className="block">
          <Card className="border border-slate-200 hover:border-danger/40 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Falhas de cobrança</p>
                  <p className="text-2xl font-bold text-slate-900">{criticalBillingFailures || 0}</p>
                </div>
                <AlertTriangle className="h-5 w-5 text-danger" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/superadmin/tenants?status=SUSPENDED" className="block">
          <Card className="border border-slate-200 hover:border-warning/60 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Tenants suspensos</p>
                  <p className="text-2xl font-bold text-slate-900">{tenantMetrics?.suspended || 0}</p>
                </div>
                <ShieldAlert className="h-5 w-5 text-warning" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Overdue Alert Card */}
      {overdueMetrics && overdueMetrics.totalOverdueInvoices > 0 && (
        <Link to="/superadmin/overdue" className="block">
          <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-danger/30 hover:border-danger/30 transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-danger/10 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-danger" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-danger/90">
                        Atenção: Inadimplência Detectada
                      </h3>
                      <p className="text-sm text-danger/80">
                        Existem faturas vencidas que requerem ação
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-white/60 rounded-lg p-3 border border-danger/10">
                      <p className="text-xs text-danger font-medium mb-1">
                        VALOR EM ATRASO
                      </p>
                      <p className="text-2xl font-bold text-danger/90">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(overdueMetrics.totalOverdueAmount)}
                      </p>
                    </div>

                    <div className="bg-white/60 rounded-lg p-3 border border-danger/10">
                      <p className="text-xs text-danger font-medium mb-1">
                        FATURAS VENCIDAS
                      </p>
                      <p className="text-2xl font-bold text-danger/90">
                        {overdueMetrics.totalOverdueInvoices}
                      </p>
                    </div>

                    <div className="bg-white/60 rounded-lg p-3 border border-danger/10">
                      <p className="text-xs text-danger font-medium mb-1">
                        TAXA DE INADIMPLÊNCIA
                      </p>
                      <p className="text-2xl font-bold text-danger/90">
                        {overdueMetrics.overdueRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="default"
                  className="bg-danger/60 hover:bg-danger/70 text-white ml-4"
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
