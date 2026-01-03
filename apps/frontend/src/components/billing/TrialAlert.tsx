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
      <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex-shrink-0">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                PERÍODO DE TESTE
              </Badge>
              {daysRemaining !== null && (
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                </span>
              )}
            </div>

            <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
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
                className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
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
