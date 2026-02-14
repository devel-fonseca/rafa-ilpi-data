import { useEffect, useState } from 'react'
import { useMySubscription } from '@/hooks/useTenant'
import { useTenantInvoices } from '@/hooks/useBilling'
import { useAuthStore } from '@/stores/auth.store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, CreditCard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * WelcomeToActivePlanDialog
 *
 * Modal exibido UMA ÚNICA VEZ após o trial expirar.
 *
 * Características:
 * - Aparece apenas no PRIMEIRO acesso após trial expirar
 * - Tom positivo: "Bem-vindo ao plano ativo"
 * - Informa data de vencimento da primeira fatura
 * - Salva no localStorage para não repetir
 * - Botão principal: "Visualizar fatura"
 */
export function WelcomeToActivePlanDialog() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { user } = useAuthStore()
  const { data: subscriptionData } = useMySubscription()
  const { data: invoicesData } = useTenantInvoices({ status: 'OPEN', limit: 1 })

  const pendingInvoice = invoicesData?.data?.[0]
  const storageKey =
    user?.tenantId && pendingInvoice?.id
      ? `welcome-active-plan-seen:${user.tenantId}:${pendingInvoice.id}`
      : null

  useEffect(() => {
    // Modal de cobrança é exibido apenas para quem administra a instituição
    if (user?.profile?.positionCode !== 'ADMINISTRATOR') {
      return
    }

    // Verificar se já foi exibido
    if (storageKey && localStorage.getItem(storageKey) === 'true') {
      return
    }

    // Verificar se deve exibir
    if (!subscriptionData || !invoicesData?.data?.[0]) {
      return
    }

    const { subscription } = subscriptionData
    const trialEndDate = subscription.trialEndDate ? new Date(subscription.trialEndDate) : null
    const today = new Date()
    const pendingInvoice = invoicesData.data[0]

    // Condições para exibir:
    // 1. Trial expirou (trialEndDate < hoje)
    // 2. Expiração foi RECENTE (até 48h) para evitar popup após restore de snapshots antigos
    // 3. Status está 'active'
    // 4. Há fatura pendente
    const trialEndDateMs = trialEndDate?.getTime() || 0
    const todayMs = today.getTime()
    const maxActivationWindowMs = 48 * 60 * 60 * 1000 // 48 horas
    const isRecentTrialConversion =
      trialEndDateMs > 0 &&
      todayMs > trialEndDateMs &&
      todayMs - trialEndDateMs <= maxActivationWindowMs

    const shouldShow =
      isRecentTrialConversion &&
      subscription.status === 'active' &&
      pendingInvoice

    if (shouldShow) {
      setOpen(true)
    }
  }, [invoicesData, storageKey, subscriptionData, user?.profile?.positionCode])

  const handleClose = () => {
    setOpen(false)
    if (storageKey) {
      localStorage.setItem(storageKey, 'true')
    }
  }

  const handleViewInvoice = () => {
    handleClose()
    navigate('/dashboard/settings/billing?tab=invoices')
  }

  if (!subscriptionData || !invoicesData?.data?.[0]) {
    return null
  }

  const { plan } = subscriptionData
  const dueDate = new Date(pendingInvoice.dueDate)
  const dueDateFormatted = dueDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border-border">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-success/10 dark:bg-success/90/30 rounded-full">
            <CheckCircle2 className="w-6 h-6 text-success dark:text-success/40" />
          </div>
          <DialogTitle className="text-center text-xl font-semibold text-foreground">
            Bem-vindo ao plano ativo!
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Seu período de teste foi concluído com sucesso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informações do Plano */}
          <div className="flex items-center justify-between p-4 bg-muted/50 dark:bg-muted/20 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Plano Atual</p>
              <p className="text-lg font-semibold text-foreground">{plan.displayName}</p>
            </div>
            <Badge variant="outline" className="bg-success/10 dark:bg-success/90/50 text-success/80 dark:text-success/30 border-success/30 dark:border-success/70">
              ATIVO
            </Badge>
          </div>

          {/* Informações da Fatura */}
          <div className="space-y-3 p-4 border border-border rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Primeira Fatura</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Número:</span>
                <span className="text-sm font-medium text-foreground">{pendingInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Valor:</span>
                <span className="text-sm font-semibold text-foreground">
                  R$ {Number(pendingInvoice.amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Vencimento:</span>
                <span className="text-sm font-medium text-foreground">{dueDateFormatted}</span>
              </div>
            </div>
          </div>

          {/* Mensagem de Encorajamento */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Sua assinatura está <strong className="text-foreground">ativa</strong> e você pode continuar usando todos os recursos do sistema.
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleViewInvoice}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Visualizar Fatura
          </Button>
          <Button
            onClick={handleClose}
            variant="ghost"
            className="w-full"
          >
            Continuar Usando o Sistema
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
