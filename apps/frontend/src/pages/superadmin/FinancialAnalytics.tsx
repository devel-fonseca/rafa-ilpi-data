import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { normalizeUTCDate } from '@/utils/dateHelpers'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Calendar,
  X,
} from 'lucide-react'

/**
 * FinancialAnalytics Page
 *
 * Dashboard de analytics financeiros para SuperAdmin:
 * - Métricas consolidadas (invoices, revenue, conversão)
 * - Breakdown por método de pagamento
 * - MRR por billing type
 * - Top performing method
 * - Filtros de período (startDate, endDate)
 */
export function FinancialAnalytics() {
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Passar filtros para o hook
  // Usar normalizeUTCDate para evitar timezone shift em datas civis
  const filters = {
    startDate: startDate ? normalizeUTCDate(startDate).toISOString() : undefined,
    endDate: endDate ? normalizeUTCDate(endDate).toISOString() : undefined,
  }

  const { data: metrics, isLoading: isLoadingMetrics } = useFinancialMetrics(filters)
  const { data: mrrData, isLoading: isLoadingMrr } = useMrrBreakdown()

  const handleClearFilters = () => {
    setStartDate('')
    setEndDate('')
  }

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
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
          <p className="text-danger/90">Erro ao carregar métricas financeiras</p>
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
        <h1 className="text-3xl font-bold text-slate-900">Analytics Financeiros</h1>
        <p className="text-slate-400 mt-2">
          Visão detalhada das métricas de pagamento e conversão
        </p>
      </div>

      {/* Date Range Filters */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-900 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Filtros de Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="startDate" className="text-slate-600 text-sm mb-2 block">
                Data Inicial
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border-slate-200 text-slate-900"
              />
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="endDate" className="text-slate-600 text-sm mb-2 block">
                Data Final
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border-slate-200 text-slate-900"
              />
            </div>

            {(startDate || endDate) && (
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
          </div>

          {(startDate || endDate) && (
            <p className="text-xs text-slate-500 mt-3">
              {startDate && endDate
                ? `Exibindo dados de ${normalizeUTCDate(startDate).toLocaleDateString('pt-BR')} até ${normalizeUTCDate(endDate).toLocaleDateString('pt-BR')}`
                : startDate
                  ? `Exibindo dados a partir de ${normalizeUTCDate(startDate).toLocaleDateString('pt-BR')}`
                  : `Exibindo dados até ${normalizeUTCDate(endDate).toLocaleDateString('pt-BR')}`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card className="bg-white border-l-4 border-l-[#059669] border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Receita Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-[#059669]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              R$ {overview.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {overview.paidInvoices} faturas pagas
            </p>
          </CardContent>
        </Card>

        {/* Pending Revenue */}
        <Card className="bg-white border-l-4 border-l-yellow-500 border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Receita Pendente
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              R$ {overview.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {overview.pendingInvoices} faturas abertas
            </p>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="bg-white border-l-4 border-l-blue-500 border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Taxa de Conversão
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {overallConversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {overview.paidInvoices} / {overview.totalInvoices} faturas
            </p>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className="bg-white border-l-4 border-l-red-500 border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Faturas Vencidas
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-danger" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {overview.overdueInvoices}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {overview.totalInvoices > 0
                ? ((overview.overdueInvoices / overview.totalInvoices) * 100).toFixed(1)
                : 0}% do total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* MRR Breakdown */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">MRR por Método de Pagamento</CardTitle>
          <CardDescription className="text-slate-400">
            Receita Recorrente Mensal dividida por billing type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-3xl font-bold text-slate-900">
              R$ {mrrData.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              <span className="text-sm font-normal text-slate-400 ml-2">MRR Total</span>
            </div>

            <div className="space-y-3">
              {mrrData.byMethod.map((method) => (
                <div
                  key={method.billingType}
                  className="flex items-center justify-between p-3 bg-slate-100 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-900">
                        {method.billingType === 'UNDEFINED' ? 'Cliente Escolhe' : method.billingType}
                      </p>
                      <p className="text-sm text-slate-500">
                        R$ {method.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-white text-slate-900 border-slate-300">
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
        <Card className="bg-white border-l-4 border-l-[#059669] border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[#059669]" />
              Melhor Método
            </CardTitle>
            <CardDescription className="text-slate-500">
              Maior taxa de conversão
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {topPerformingMethod.billingType === 'UNDEFINED'
                ? 'Cliente Escolhe'
                : topPerformingMethod.billingType}
            </div>
            <p className="text-[#059669] font-medium mt-2">
              {topPerformingMethod.conversionRate.toFixed(1)}% de conversão
            </p>
          </CardContent>
        </Card>

        {/* Methods Comparison */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Comparativo de Métodos</CardTitle>
            <CardDescription className="text-slate-400">
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
                    className="flex items-center justify-between p-2 bg-slate-100 rounded border border-slate-200"
                  >
                    <div>
                      <p className="font-medium text-slate-900 text-sm">
                        {method.billingType === 'UNDEFINED' ? 'Cliente Escolhe' : method.billingType}
                      </p>
                      <p className="text-xs text-slate-500">
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
                        <CheckCircle2 className="h-4 w-4 text-success/40" />
                      ) : method.conversionRate >= 60 ? (
                        <TrendingUp className="h-4 w-4 text-warning/40" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-danger/40" />
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
