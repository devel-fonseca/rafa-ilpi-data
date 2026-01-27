import { useState, useEffect } from 'react'
import { useMySubscription } from '@/hooks/useTenant'
import { useTenantInvoices } from '@/hooks/useBilling'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, TrendingUp, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFeatures } from '@/hooks/useFeatures'

interface PlanStatusSectionProps {
  showManageButton?: boolean // Se true, mostra botão "Gerenciar Plano" (para dashboard)
}

export function PlanStatusSection({ showManageButton = true }: PlanStatusSectionProps) {
  const navigate = useNavigate()
  const { data: subscriptionData, isLoading } = useMySubscription()
  const { data: invoicesData } = useTenantInvoices({ status: 'OPEN', limit: 1 })
  const { hasCustomizations, maxUsers, maxResidents } = useFeatures()

  // Estado para controlar se os alerts foram fechados
  const [trialAlertDismissed, setTrialAlertDismissed] = useState(false)
  const [limitAlertDismissed, setLimitAlertDismissed] = useState(false)

  // Carregar estado do localStorage ao montar
  useEffect(() => {
    const trialDismissed = localStorage.getItem('trial-expired-alert-dismissed')
    if (trialDismissed === 'true') {
      setTrialAlertDismissed(true)
    }

    const limitDismissed = localStorage.getItem('plan-limit-alert-dismissed')
    if (limitDismissed === 'true') {
      setLimitAlertDismissed(true)
    }
  }, [])

  // Função para fechar o alert de trial/fatura
  const dismissTrialAlert = () => {
    setTrialAlertDismissed(true)
    localStorage.setItem('trial-expired-alert-dismissed', 'true')
  }

  // Função para fechar o alert de limite
  const dismissLimitAlert = () => {
    setLimitAlertDismissed(true)
    localStorage.setItem('plan-limit-alert-dismissed', 'true')
  }

  if (isLoading) {
    return (
      <div className="p-4 bg-info/10 rounded-lg border border-info/20 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!subscriptionData) {
    return null
  }

  const { plan, usage, subscription, tenantStatus } = subscriptionData

  // Análise contextual de fatura
  const trialEndDate = subscription.trialEndDate ? new Date(subscription.trialEndDate) : null
  const today = new Date()
  const pendingInvoice = invoicesData?.data?.[0] || null

  // Calcular estado da fatura baseado em vencimento
  const getInvoiceState = () => {
    if (!pendingInvoice) return null

    const dueDate = new Date(pendingInvoice.dueDate)
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Fatura vencida há mais de 7 dias (grace period expirado)
    if (diffDays < -7) {
      return { level: 'critical', message: 'Ação necessária', description: 'O pagamento está em aberto há mais de 7 dias. O acesso poderá ser limitado se não houver regularização.' }
    }

    // Fatura vencida (1-7 dias)
    if (diffDays < 0) {
      const daysOverdue = Math.abs(diffDays)
      return { level: 'warning', message: 'Pagamento em atraso', description: `Sua assinatura permanece ativa, mas há uma fatura vencida há ${daysOverdue} ${daysOverdue === 1 ? 'dia' : 'dias'}. Regularize para evitar suspensão.` }
    }

    // Fatura vence hoje
    if (diffDays === 0) {
      return { level: 'info', message: 'Fatura vence hoje', description: 'Sua fatura vence hoje. Evite interrupções mantendo o pagamento em dia.' }
    }

    // Fatura vence amanhã
    if (diffDays === 1) {
      return { level: 'info', message: 'Atenção ao pagamento', description: 'Sua fatura vence amanhã. Evite interrupções mantendo o pagamento em dia.' }
    }

    // Trial acabou de expirar (primeira fatura, dentro do prazo)
    const justEndedTrial = trialEndDate && trialEndDate < today && subscription.status === 'active' && diffDays > 1
    if (justEndedTrial) {
      const dueDateFormatted = dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      return { level: 'success', message: 'Bem-vindo ao plano ativo', description: `Seu período de teste foi concluído e sua assinatura está ativa. A primeira fatura vence em ${dueDateFormatted}.` }
    }

    // Fatura normal dentro do prazo (sem mensagem)
    return null
  }

  const invoiceState = getInvoiceState()

  // Calcular dias restantes do trial
  const getDaysRemaining = (): number | null => {
    if (subscription.status !== 'trialing' || !subscription.trialEndDate) {
      return null
    }
    const trialEnd = new Date(subscription.trialEndDate)
    const diffTime = trialEnd.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  const daysRemaining = getDaysRemaining()

  // Formatar nome do plano
  const formatPlanName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
  }

  // Formatar status para exibição
  const getStatusLabel = () => {
    if (subscription.status === 'trialing') {
      return `Trial (${daysRemaining !== null ? `${daysRemaining} dias restantes` : ''})`
    }
    if (tenantStatus === 'ACTIVE') return 'Ativo'
    if (tenantStatus === 'TRIAL') return 'Trial'
    return tenantStatus
  }

  // Usar limites customizados se disponíveis, caso contrário usar limites do plano
  const effectiveMaxUsers = maxUsers ?? plan.maxUsers
  const effectiveMaxResidents = maxResidents ?? plan.maxResidents

  // Calcular percentuais de uso com limites efetivos
  const userPercentage = effectiveMaxUsers > 0 ? (usage.activeUsers / effectiveMaxUsers) * 100 : 0
  const residentPercentage = effectiveMaxResidents > 0 ? (usage.activeResidents / effectiveMaxResidents) * 100 : 0

  // Verificar se está próximo dos limites (>=80%) ou atingiu (100%)
  const userLimitStatus = userPercentage >= 100 ? 'critical' : userPercentage >= 80 ? 'warning' : 'normal'
  const residentLimitStatus = residentPercentage >= 100 ? 'critical' : residentPercentage >= 80 ? 'warning' : 'normal'

  // Verificar se algum limite está crítico ou próximo
  const hasWarning = userLimitStatus !== 'normal' || residentLimitStatus !== 'normal'
  const hasCritical = userLimitStatus === 'critical' || residentLimitStatus === 'critical'

  // Definir cores do card baseado no status (otimizado para dark mode)
  const cardBg = hasCritical
    ? 'bg-destructive/20 dark:bg-destructive/15'
    : hasWarning
    ? 'bg-warning/20 dark:bg-warning/15'
    : 'bg-muted/50 dark:bg-muted/30'

  const cardBorder = hasCritical
    ? 'border-destructive/50 dark:border-destructive/40'
    : hasWarning
    ? 'border-warning/50 dark:border-warning/40'
    : 'border-border'

  return (
    <div className={cn('p-4 rounded-lg border', cardBg, cardBorder)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* Cabeçalho do Plano */}
          <div className="flex items-center gap-2">
            {hasCritical && (
              <div className="flex items-center justify-center w-8 h-8 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
            )}
            {!hasCritical && hasWarning && (
              <div className="flex items-center justify-center w-8 h-8 bg-warning/10 rounded-full">
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-1">
                Plano Atual:{' '}
                <span className="font-bold">{formatPlanName(plan.name)}</span>
                {hasCustomizations && (
                  <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" title="Plano customizado com limites aprimorados" />
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Status: <span className="font-medium">{getStatusLabel()}</span>
              </p>
            </div>
          </div>

          {/* Métricas de Uso */}
          <div className="grid grid-cols-2 gap-4">
            {/* Usuários */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Usuários</span>
                <span className={cn(
                  'font-semibold',
                  userLimitStatus === 'critical' && 'text-destructive',
                  userLimitStatus === 'warning' && 'text-warning',
                  userLimitStatus === 'normal' && 'text-foreground'
                )}>
                  {usage.activeUsers}/{effectiveMaxUsers === -1 ? '∞' : effectiveMaxUsers}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    userLimitStatus === 'critical' && 'bg-destructive',
                    userLimitStatus === 'warning' && 'bg-warning',
                    userLimitStatus === 'normal' && 'bg-primary'
                  )}
                  style={{ width: `${Math.min(userPercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Residentes */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Residentes</span>
                <span className={cn(
                  'font-semibold',
                  residentLimitStatus === 'critical' && 'text-destructive',
                  residentLimitStatus === 'warning' && 'text-warning',
                  residentLimitStatus === 'normal' && 'text-foreground'
                )}>
                  {usage.activeResidents}/{effectiveMaxResidents === -1 ? '∞' : effectiveMaxResidents}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    residentLimitStatus === 'critical' && 'bg-destructive',
                    residentLimitStatus === 'warning' && 'bg-warning',
                    residentLimitStatus === 'normal' && 'bg-primary'
                  )}
                  style={{ width: `${Math.min(residentPercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Alerta Contextual de Fatura */}
          {invoiceState && !trialAlertDismissed && (
            <div className={cn(
              'flex items-start gap-2 p-3 rounded-lg text-sm relative',
              invoiceState.level === 'critical' && 'bg-danger/5 dark:bg-danger/95/20 border border-danger/30 dark:border-danger/80',
              invoiceState.level === 'warning' && 'bg-warning/5 dark:bg-warning/95/20 border border-warning/30 dark:border-warning/80',
              invoiceState.level === 'info' && 'bg-primary/5 dark:bg-primary/95/20 border border-primary/30 dark:border-primary/80',
              invoiceState.level === 'success' && 'bg-success/5 dark:bg-success/95/20 border border-success/30 dark:border-success/80'
            )}>
              <AlertTriangle className={cn(
                'h-4 w-4 mt-0.5 flex-shrink-0',
                invoiceState.level === 'critical' && 'text-danger dark:text-danger/40',
                invoiceState.level === 'warning' && 'text-warning dark:text-warning/40',
                invoiceState.level === 'info' && 'text-primary dark:text-primary/40',
                invoiceState.level === 'success' && 'text-success dark:text-success/40'
              )} />
              <div className="flex-1 pr-6">
                <p className={cn(
                  'font-semibold',
                  invoiceState.level === 'critical' && 'text-danger/90 dark:text-red-100',
                  invoiceState.level === 'warning' && 'text-warning/95 dark:text-warning/10',
                  invoiceState.level === 'info' && 'text-primary/95 dark:text-primary/10',
                  invoiceState.level === 'success' && 'text-success/95 dark:text-success/10'
                )}>
                  {invoiceState.message}
                </p>
                <p className={cn(
                  'text-sm mt-1',
                  invoiceState.level === 'critical' && 'text-danger/90 dark:text-danger/20',
                  invoiceState.level === 'warning' && 'text-warning/90 dark:text-warning/20',
                  invoiceState.level === 'info' && 'text-primary/90 dark:text-blue-200',
                  invoiceState.level === 'success' && 'text-success/90 dark:text-success/20'
                )}>
                  {invoiceState.description}
                </p>
                {(invoiceState.level === 'critical' || invoiceState.level === 'warning') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => navigate('/dashboard/settings/billing?tab=invoices')}
                  >
                    {invoiceState.level === 'critical' ? 'Gerenciar plano' : 'Regularizar pagamento'}
                  </Button>
                )}
                {invoiceState.level === 'success' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => navigate('/dashboard/settings/billing?tab=invoices')}
                  >
                    Visualizar fatura
                  </Button>
                )}
              </div>
              <button
                onClick={dismissTrialAlert}
                className={cn(
                  'absolute top-2 right-2 p-1 rounded transition-colors',
                  invoiceState.level === 'critical' && 'hover:bg-danger/10 dark:hover:bg-danger/90/50',
                  invoiceState.level === 'warning' && 'hover:bg-warning/10 dark:hover:bg-warning/90/50',
                  invoiceState.level === 'info' && 'hover:bg-primary/10 dark:hover:bg-primary/90/50',
                  invoiceState.level === 'success' && 'hover:bg-success/10 dark:hover:bg-success/90/50'
                )}
                aria-label="Fechar alerta"
              >
                <X className={cn(
                  'h-4 w-4',
                  invoiceState.level === 'critical' && 'text-danger dark:text-danger/40',
                  invoiceState.level === 'warning' && 'text-warning dark:text-warning/40',
                  invoiceState.level === 'info' && 'text-primary dark:text-primary/40',
                  invoiceState.level === 'success' && 'text-success dark:text-success/40'
                )} />
              </button>
            </div>
          )}

          {/* Alerta de Limite */}
          {hasWarning && !limitAlertDismissed && (
            <div className={cn(
              'flex items-start gap-2 p-3 rounded-lg text-sm relative',
              hasCritical
                ? 'bg-destructive/15 dark:bg-destructive/10 border border-destructive/30 dark:border-destructive/20'
                : 'bg-warning/15 dark:bg-warning/10 border border-warning/30 dark:border-warning/20'
            )}>
              <TrendingUp className={cn(
                'h-4 w-4 mt-0.5 flex-shrink-0',
                hasCritical ? 'text-destructive' : 'text-warning'
              )} />
              <p className="text-foreground flex-1 pr-6">
                {hasCritical ? (
                  <><strong>Limite atingido!</strong> Faça upgrade do plano para continuar adicionando recursos.</>
                ) : (
                  <><strong>Próximo do limite.</strong> Considere fazer upgrade do plano para evitar interrupções.</>
                )}
              </p>
              <button
                onClick={dismissLimitAlert}
                className={cn(
                  'absolute top-2 right-2 p-1 rounded transition-colors',
                  hasCritical
                    ? 'hover:bg-destructive/20 dark:hover:bg-destructive/30'
                    : 'hover:bg-warning/20 dark:hover:bg-warning/30'
                )}
                aria-label="Fechar alerta de limite"
              >
                <X className={cn(
                  'h-4 w-4',
                  hasCritical ? 'text-destructive' : 'text-warning'
                )} />
              </button>
            </div>
          )}
        </div>

        {/* Botão de Ação (apenas se showManageButton = true) */}
        {showManageButton && (
          <Button
            variant={hasCritical ? 'default' : 'outline'}
            size="sm"
            className={cn(
              hasCritical && 'bg-primary hover:bg-primary/90',
              !hasCritical && 'border-border hover:bg-muted'
            )}
            onClick={() => navigate('/dashboard/settings/billing')}
          >
            {hasCritical ? 'Fazer Upgrade' : 'Gerenciar Plano'}
          </Button>
        )}
      </div>
    </div>
  )
}
