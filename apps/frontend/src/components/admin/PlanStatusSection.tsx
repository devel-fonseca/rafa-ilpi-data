import { useMySubscription } from '@/hooks/useTenant'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export function PlanStatusSection() {
  const navigate = useNavigate()
  const { data: subscriptionData, isLoading } = useMySubscription()

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

  // Calcular dias restantes do trial
  const getDaysRemaining = (): number | null => {
    if (subscription.status !== 'trialing' || !subscription.trialEndDate) {
      return null
    }
    const today = new Date()
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

  // Verificar se está próximo dos limites (>80%)
  const isNearUserLimit = usage.activeUsers / plan.maxUsers > 0.8
  const isNearResidentLimit = usage.activeResidents / plan.maxResidents > 0.8

  return (
    <div className="p-4 bg-info/10 rounded-lg border border-info/20">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Plano Atual:{' '}
            <span className="font-bold">{formatPlanName(plan.name)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Status:{' '}
            <span className="font-medium">{getStatusLabel()}</span>
            {' • '}
            <span className={isNearUserLimit ? 'text-warning font-semibold' : ''}>
              Usuários: {usage.activeUsers}/{plan.maxUsers}
            </span>
            {' • '}
            <span className={isNearResidentLimit ? 'text-warning font-semibold' : ''}>
              Residentes: {usage.activeResidents}/{plan.maxResidents}
            </span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-info/30 hover:bg-info/10"
          onClick={() => navigate('/dashboard/settings/billing')}
        >
          Gerenciar Plano
        </Button>
      </div>
    </div>
  )
}
