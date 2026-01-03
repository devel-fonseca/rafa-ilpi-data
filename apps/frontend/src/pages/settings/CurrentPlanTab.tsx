import { PlanStatusSection } from '@/components/admin/PlanStatusSection'
import { TrialAlert } from '@/components/billing/TrialAlert'
import { PaymentMethodSelector } from '@/components/billing/PaymentMethodSelector'
import { SubscriptionChangeHistory } from '@/components/billing/SubscriptionChangeHistory'
import { useMySubscription } from '@/hooks/useTenant'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function CurrentPlanTab() {
  const { data: subscriptionData, isLoading } = useMySubscription()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!subscriptionData) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Nenhuma subscription ativa encontrada
      </div>
    )
  }

  const { subscription } = subscriptionData
  const isTrialing = subscription.status === 'trialing'

  return (
    <div className="space-y-6">
      {/* Trial Alert (apenas se em trial) */}
      {isTrialing && <TrialAlert />}

      {/* Plano Atual */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Seu Plano Atual</h2>
        <PlanStatusSection showManageButton={false} />
      </div>

      {/* Método de Pagamento */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Método de Pagamento Preferido</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentMethodSelector />
        </CardContent>
      </Card>

      {/* Desconto Aplicado (se houver) */}
      {((subscription as any).discountPercent || (subscription as any).customPrice) && (
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-green-800 dark:text-green-300 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                  clipRule="evenodd"
                />
              </svg>
              Desconto Especial Aplicado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(subscription as any).discountPercent && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-700 dark:text-green-300">Desconto:</span>
                  <span className="text-sm font-bold text-green-800 dark:text-green-200">
                    {Number((subscription as any).discountPercent).toFixed(0)}% OFF
                  </span>
                </div>
              )}
              {(subscription as any).discountReason && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-700 dark:text-green-300">Motivo:</span>
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    {(subscription as any).discountReason}
                  </span>
                </div>
              )}
              {(subscription as any).customPrice && (
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-md">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>Preço customizado:</strong> R${' '}
                    {Number((subscription as any).customPrice).toFixed(2)}/mês
                  </p>
                  {(subscription as any).discountReason && (
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      {(subscription as any).discountReason}
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                Este desconto foi aplicado pela nossa equipe. Aproveite!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações de Renovação */}
      {subscription.currentPeriodEnd && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Próxima Renovação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Data de renovação:</span>
                <span className="text-sm font-medium text-foreground">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status:</span>
                <span className="text-sm font-medium text-foreground capitalize">
                  {subscription.status === 'active'
                    ? 'Ativo'
                    : subscription.status === 'trialing'
                    ? 'Em Trial'
                    : subscription.status}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Mudanças de Plano */}
      <SubscriptionChangeHistory />
    </div>
  )
}
