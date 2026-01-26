import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePlan, usePlanStats } from '@/hooks/usePlans'
import {
  ArrowLeft,
  Users,
  Home,
  Calendar,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Star,
  Power,
} from 'lucide-react'

/**
 * PlanDetails Page
 *
 * Página de detalhes e analytics de um plano específico.
 * Exibe:
 * - Informações completas do plano
 * - Estatísticas de subscriptions
 * - Distribuição por status
 * - Métricas financeiras
 */

export function PlanDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: plan, isLoading: planLoading } = usePlan(id!)
  const { data: stats, isLoading: statsLoading } = usePlanStats(id!)

  const getPlanTypeColor = (type: string) => {
    const colors = {
      FREE: 'bg-gray-500/10 text-foreground/80 border-border/50',
      TRIAL: 'bg-primary/10 text-primary/80 border-primary/50',
      ESSENTIAL: 'bg-[#059669]/10 text-[#059669] border-[#059669]/50',
      PROFESSIONAL: 'bg-[#06b6d4]/10 text-[#06b6d4] border-[#06b6d4]/50',
      PREMIUM: 'bg-warning/10 text-warning/80 border-warning',
    }
    return colors[type as keyof typeof colors] || colors.ESSENTIAL
  }

  if (planLoading || statsLoading) {
    return (
      <div className="space-y-6 p-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <AlertTriangle className="h-16 w-16 text-warning" />
        <h2 className="text-2xl font-bold text-slate-900">Plano não encontrado</h2>
        <Button onClick={() => navigate('/superadmin/plans')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Planos
        </Button>
      </div>
    )
  }

  const price = plan.price ? parseFloat(plan.price) : 0
  const annualDiscount = plan.annualDiscountPercent ? parseFloat(plan.annualDiscountPercent) : 0
  const annualPrice = price * 12
  const annualPriceWithDiscount = annualPrice * (1 - annualDiscount / 100)

  // Calcular receita estimada (apenas subscriptions ativas)
  const estimatedMonthlyRevenue = (stats?.active || 0) * price
  const estimatedAnnualRevenue = estimatedMonthlyRevenue * 12

  // Calcular taxa de conversão de trial
  const trialConversionRate =
    stats && stats.trialing > 0 ? ((stats.active / (stats.active + stats.trialing)) * 100).toFixed(1) : '0.0'

  // Calcular taxa de churn
  const churnRate =
    stats && stats.total > 0 ? ((stats.canceled / stats.total) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/superadmin/plans')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">{plan.displayName}</h1>
              <Badge variant="outline" className={getPlanTypeColor(plan.type)}>
                {plan.type}
              </Badge>
              {plan.isPopular && (
                <Badge className="bg-warning text-warning-foreground">
                  <Star className="h-3 w-3 mr-1" fill="currentColor" />
                  Popular
                </Badge>
              )}
              {!plan.isActive && (
                <Badge variant="destructive">
                  <Power className="h-3 w-3 mr-1" />
                  Inativo
                </Badge>
              )}
            </div>
            <p className="text-slate-600 mt-1">
              Nome técnico: <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">{plan.name}</code>
            </p>
          </div>
        </div>
      </div>

      {/* Informações do Plano */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Preço */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Preço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {price > 0 ? `R$ ${price.toFixed(2)}` : 'Grátis'}
                </p>
                <p className="text-xs text-slate-500">por mês</p>
              </div>
              {price > 0 && annualDiscount > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold">Anual:</span> R$ {annualPriceWithDiscount.toFixed(2)}
                  </p>
                  <p className="text-xs text-emerald-600">
                    {annualDiscount}% de desconto (economiza R$ {(annualPrice - annualPriceWithDiscount).toFixed(2)})
                  </p>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  <span className="font-semibold">Ciclo:</span>{' '}
                  {plan.billingCycle === 'MONTHLY' ? 'Mensal' : 'Anual'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Limites */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Limites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span>Usuários</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{plan.maxUsers}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Home className="h-4 w-4 text-slate-400" />
                  <span>Residentes</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{plan.maxResidents}</span>
              </div>
              {plan.trialDays > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>Trial</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{plan.trialDays} dias</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Receita Estimada */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Receita Estimada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  R$ {estimatedMonthlyRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500">por mês</p>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">Anual:</span> R$ {estimatedAnnualRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500">
                  Baseado em {stats?.active || 0} {stats?.active === 1 ? 'subscription ativa' : 'subscriptions ativas'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas de Subscriptions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{stats?.total || 0}</p>
            <p className="text-xs text-slate-500 mt-1">Todas subscriptions</p>
          </CardContent>
        </Card>

        {/* Ativas */}
        <Card className="bg-white border-emerald-200 border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">{stats?.active || 0}</p>
            <p className="text-xs text-emerald-600 mt-1">
              {stats && stats.total > 0
                ? `${((stats.active / stats.total) * 100).toFixed(0)}% do total`
                : '0% do total'}
            </p>
          </CardContent>
        </Card>

        {/* Trial */}
        <Card className="bg-white border-primary-200 border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Em Trial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{stats?.trialing || 0}</p>
            <p className="text-xs text-primary mt-1">
              Conversão: {trialConversionRate}%
            </p>
          </CardContent>
        </Card>

        {/* Vencidas */}
        <Card className="bg-white border-warning-200 border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-warning flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-warning">{stats?.pastDue || 0}</p>
            <p className="text-xs text-warning mt-1">
              {stats && stats.total > 0
                ? `${((stats.pastDue / stats.total) * 100).toFixed(0)}% do total`
                : '0% do total'}
            </p>
          </CardContent>
        </Card>

        {/* Canceladas */}
        <Card className="bg-white border-red-200 border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Canceladas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{stats?.canceled || 0}</p>
            <p className="text-xs text-red-600 mt-1">
              Churn: {churnRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Taxa de Conversão</CardTitle>
            <CardDescription>De trial para subscription ativa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-4xl font-bold text-emerald-600">{trialConversionRate}%</p>
              </div>
              <div className="text-sm text-slate-600">
                <p>
                  {stats?.active || 0} ativas / {(stats?.active || 0) + (stats?.trialing || 0)} total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Taxa de Churn</CardTitle>
            <CardDescription>Subscriptions canceladas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-4xl font-bold text-red-600">{churnRate}%</p>
              </div>
              <div className="text-sm text-slate-600">
                <p>
                  {stats?.canceled || 0} canceladas / {stats?.total || 0} total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Receita por Sub</CardTitle>
            <CardDescription>Valor médio por subscription ativa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-4xl font-bold text-[#059669]">
                  R$ {price.toFixed(2)}
                </p>
              </div>
              <div className="text-sm text-slate-600">
                <p>por mês</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features do Plano */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle>Features Habilitadas</CardTitle>
          <CardDescription>
            Features disponíveis neste plano
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(plan.features as Record<string, boolean>)
              .filter(([, enabled]) => enabled)
              .map(([feature], idx) => (
                <Badge key={idx} variant="secondary" className="bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {feature}
                </Badge>
              ))}
            {Object.keys(plan.features as Record<string, boolean>).length === 0 && (
              <p className="text-sm text-slate-500">Nenhuma feature configurada</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
