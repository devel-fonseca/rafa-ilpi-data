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
import { useCancelTrial } from '@/hooks/useBilling'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'

interface CancelTrialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CancelTrialDialog({ open, onOpenChange }: CancelTrialDialogProps) {
  const navigate = useNavigate()
  const cancelTrial = useCancelTrial()

  const handleConfirmCancel = async () => {
    try {
      await cancelTrial.mutateAsync()

      toast.success('Trial cancelado', {
        description: 'Seu trial foi cancelado com sucesso. Sua conta será desativada.',
      })

      onOpenChange(false)

      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (error: any) {
      toast.error('Erro ao cancelar trial', {
        description: error.response?.data?.message || 'Não foi possível cancelar o trial. Tente novamente.',
      })
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <AlertDialogTitle className="text-foreground">
              Cancelar Período de Teste
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-muted-foreground text-left">
            <strong className="text-red-600 dark:text-red-400">Atenção:</strong> Esta ação é irreversível. Ao cancelar o trial:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Sua conta será imediatamente desativada</li>
              <li>Você perderá acesso a todos os dados e funcionalidades</li>
              <li>Não será cobrado nenhum valor</li>
              <li>Você poderá criar uma nova conta no futuro, se desejar</li>
            </ul>
            <p className="mt-3 font-medium">
              Tem certeza de que deseja cancelar seu período de teste?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-muted text-foreground hover:bg-muted/80">
            Manter Trial Ativo
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmCancel}
            disabled={cancelTrial.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {cancelTrial.isPending ? 'Cancelando...' : 'Sim, Cancelar Trial'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
