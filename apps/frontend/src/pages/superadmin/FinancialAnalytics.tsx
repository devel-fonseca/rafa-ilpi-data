import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useFinancialMetrics, useMrrBreakdown } from '@/hooks/useAnalytics'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trophy,
} from 'lucide-react'

/**
 * FinancialAnalytics Page
 *
 * Dashboard de analytics financeiros para SuperAdmin:
 * - Métricas consolidadas (invoices, revenue, conversão)
 * - Breakdown por método de pagamento
 * - MRR por billing type
 * - Top performing method
 */
export function FinancialAnalytics() {
  const { data: metrics, isLoading: isLoadingMetrics } = useFinancialMetrics()
  const { data: mrrData, isLoading: isLoadingMrr } = useMrrBreakdown()

  if (isLoadingMetrics || isLoadingMrr) {
    return (
      <div className="space-y-6 p-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  if (!metrics || !mrrData) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">Erro ao carregar métricas financeiras</p>
        </div>
      </div>
    )
  }

  const { overview, byPaymentMethod, topPerformingMethod } = metrics
  const overallConversionRate =
    overview.totalInvoices > 0 ? (overview.paidInvoices / overview.totalInvoices) * 100 : 0

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-purple-50">Analytics Financeiros</h1>
        <p className="text-purple-300 mt-2">
          Visão detalhada das métricas de pagamento e conversão
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card className="bg-gradient-to-br from-green-900 to-green-950 border-green-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-100">
              Receita Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-50">
              R$ {overview.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-green-300 mt-1">
              {overview.paidInvoices} faturas pagas
            </p>
          </CardContent>
        </Card>

        {/* Pending Revenue */}
        <Card className="bg-gradient-to-br from-yellow-900 to-yellow-950 border-yellow-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-100">
              Receita Pendente
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-50">
              R$ {overview.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-yellow-300 mt-1">
              {overview.pendingInvoices} faturas abertas
            </p>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="bg-gradient-to-br from-blue-900 to-blue-950 border-blue-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">
              Taxa de Conversão
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-50">
              {overallConversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-blue-300 mt-1">
              {overview.paidInvoices} / {overview.totalInvoices} faturas
            </p>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className="bg-gradient-to-br from-red-900 to-red-950 border-red-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-100">
              Faturas Vencidas
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-50">
              {overview.overdueInvoices}
            </div>
            <p className="text-xs text-red-300 mt-1">
              {overview.totalInvoices > 0
                ? ((overview.overdueInvoices / overview.totalInvoices) * 100).toFixed(1)
                : 0}% do total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* MRR Breakdown */}
      <Card className="bg-purple-950 border-purple-700">
        <CardHeader>
          <CardTitle className="text-purple-50">MRR por Método de Pagamento</CardTitle>
          <CardDescription className="text-purple-300">
            Receita Recorrente Mensal dividida por billing type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-3xl font-bold text-purple-50">
              R$ {mrrData.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              <span className="text-sm font-normal text-purple-300 ml-2">MRR Total</span>
            </div>

            <div className="space-y-3">
              {mrrData.byMethod.map((method) => (
                <div
                  key={method.billingType}
                  className="flex items-center justify-between p-3 bg-purple-900/50 rounded-lg border border-purple-800"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-purple-300" />
                    <div>
                      <p className="font-medium text-purple-50">
                        {method.billingType === 'UNDEFINED' ? 'Cliente Escolhe' : method.billingType}
                      </p>
                      <p className="text-sm text-purple-400">
                        R$ {method.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-purple-800 text-purple-100 border-purple-600">
                    {method.percentage.toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods Performance */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Performing Method */}
        <Card className="bg-gradient-to-br from-amber-900 to-amber-950 border-amber-700">
          <CardHeader>
            <CardTitle className="text-amber-50 flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Melhor Método
            </CardTitle>
            <CardDescription className="text-amber-300">
              Maior taxa de conversão
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-50">
              {topPerformingMethod.billingType === 'UNDEFINED'
                ? 'Cliente Escolhe'
                : topPerformingMethod.billingType}
            </div>
            <p className="text-amber-200 mt-2">
              {topPerformingMethod.conversionRate.toFixed(1)}% de conversão
            </p>
          </CardContent>
        </Card>

        {/* Methods Comparison */}
        <Card className="bg-purple-950 border-purple-700">
          <CardHeader>
            <CardTitle className="text-purple-50">Comparativo de Métodos</CardTitle>
            <CardDescription className="text-purple-300">
              Performance detalhada por billing type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {byPaymentMethod
                .sort((a, b) => b.conversionRate - a.conversionRate)
                .map((method) => (
                  <div
                    key={method.billingType}
                    className="flex items-center justify-between p-2 bg-purple-900/30 rounded border border-purple-800/50"
                  >
                    <div>
                      <p className="font-medium text-purple-50 text-sm">
                        {method.billingType === 'UNDEFINED' ? 'Cliente Escolhe' : method.billingType}
                      </p>
                      <p className="text-xs text-purple-400">
                        {method.paidInvoices}/{method.totalInvoices} pagas
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={method.conversionRate >= 80 ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {method.conversionRate.toFixed(1)}%
                      </Badge>
                      {method.conversionRate >= 80 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      ) : method.conversionRate >= 60 ? (
                        <TrendingUp className="h-4 w-4 text-yellow-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
