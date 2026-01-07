import { useState } from 'react'
import { useMySubscription } from '@/hooks/useTenant'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock } from 'lucide-react'
import { CancelTrialDialog } from './CancelTrialDialog'

export function TrialAlert() {
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const { data: subscriptionData } = useMySubscription()

  if (!subscriptionData || subscriptionData.subscription.status !== 'trialing') {
    return null
  }

  const { subscription } = subscriptionData
  const trialEndDate = subscription.trialEndDate ? new Date(subscription.trialEndDate) : null
  const today = new Date()
  const daysRemaining = trialEndDate
    ? Math.max(0, Math.ceil((trialEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <>
      <Alert className="bg-primary/5 dark:bg-primary/95/30 border-primary/30 dark:border-primary/80">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-10 h-10 bg-primary/10 dark:bg-primary/90/50 rounded-full flex-shrink-0">
            <Clock className="h-5 w-5 text-primary dark:text-primary/40" />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-primary/10 dark:bg-primary/90/50 text-primary/80 dark:text-primary/30 border-primary/30 dark:border-primary/70">
                PERÍODO DE TESTE
              </Badge>
              {daysRemaining !== null && (
                <span className="text-sm font-semibold text-primary/80 dark:text-primary/30">
                  {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                </span>
              )}
            </div>

            <AlertDescription className="text-sm text-primary/90 dark:text-blue-200">
              Você está no período de testes gratuito.
              {trialEndDate && (
                <>
                  {' '}A cobrança começará em{' '}
                  <strong>
                    {trialEndDate.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </strong>.
                </>
              )}
              {' '}Se desejar cancelar antes da primeira cobrança, você pode fazê-lo a qualquer momento durante o período de testes.
            </AlertDescription>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-danger dark:text-danger/40 border-danger/30 dark:border-danger/70 hover:bg-danger/5 dark:hover:bg-danger/95/30"
                onClick={() => setShowCancelDialog(true)}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Cancelar Antes da Cobrança
              </Button>
            </div>
          </div>
        </div>
      </Alert>

      <CancelTrialDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
      />
    </>
  )
}
