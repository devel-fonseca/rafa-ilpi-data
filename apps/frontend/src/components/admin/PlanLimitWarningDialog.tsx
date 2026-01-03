import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle, XCircle, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

interface PlanLimitWarningDialogProps {
  type: 'users' | 'residents'
  open: boolean
  onOpenChange: (open: boolean) => void
  onProceed: () => void
  usage: {
    current: number
    max: number
  }
}

export function PlanLimitWarningDialog({
  type,
  open,
  onOpenChange,
  onProceed,
  usage,
}: PlanLimitWarningDialogProps) {
  const navigate = useNavigate()
  const { current, max } = usage
  const isAtLimit = current >= max

  // Textos dinâmicos baseados no tipo
  const entityName = type === 'users' ? 'usuários' : 'residentes'
  const entityNameSingular = type === 'users' ? 'usuário' : 'residente'
  const actionText = type === 'users' ? 'adicionar mais usuários à sua equipe' : 'cadastrar mais residentes'

  const handleProceed = () => {
    onProceed()
    onOpenChange(false)
  }

  const handleUpgrade = () => {
    onOpenChange(false)
    navigate('/dashboard/settings/billing?tab=available-plans')
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {isAtLimit ? (
              <div className="flex items-center justify-center w-12 h-12 bg-destructive/10 rounded-full">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-12 h-12 bg-warning/10 rounded-full">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
            )}
            <div className="flex-1">
              <AlertDialogTitle className="text-left">
                {isAtLimit ? 'Limite Atingido!' : 'Próximo do Limite do Plano'}
              </AlertDialogTitle>
            </div>
          </div>

          <AlertDialogDescription className="text-left pt-4 space-y-3">
            {isAtLimit ? (
              <>
                <p className="text-base">
                  Você atingiu o limite de <strong>{max} {entityName}</strong> do seu plano atual.
                </p>
                <p>
                  Não é possível criar mais {entityName} sem fazer upgrade do plano.
                </p>
              </>
            ) : (
              <>
                <p className="text-base">
                  Você está usando <strong className="text-warning">{current} de {max} {entityName}</strong>.
                </p>
                <p>
                  Ao criar este {entityNameSingular}, você estará a{' '}
                  <strong>{max - current - 1}</strong>{' '}
                  {max - current - 1 === 1 ? entityNameSingular : entityName} do limite do seu plano.
                </p>
              </>
            )}

            <div className="bg-muted/50 rounded-lg p-3 mt-4">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm">
                  <strong>Dica:</strong> Considere fazer upgrade do plano para {actionText} sem limites.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          {isAtLimit ? (
            <>
              <AlertDialogCancel className="sm:order-1">
                Voltar
              </AlertDialogCancel>
              <Button
                onClick={handleUpgrade}
                className="sm:order-2 bg-primary hover:bg-primary/90"
              >
                Ver Planos
              </Button>
            </>
          ) : (
            <>
              <AlertDialogCancel className="sm:order-1">
                Cancelar
              </AlertDialogCancel>
              <Button
                variant="outline"
                onClick={handleUpgrade}
                className="sm:order-2"
              >
                Ver Planos
              </Button>
              <AlertDialogAction
                onClick={handleProceed}
                className="sm:order-3 bg-primary hover:bg-primary/90"
              >
                Prosseguir Mesmo Assim
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
