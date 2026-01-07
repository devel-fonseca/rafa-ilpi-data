import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useSendReminder } from '@/hooks/useCollections'
import { Mail, Loader2 } from 'lucide-react'
import type { OverdueTenant } from '@/api/overdue.api'

interface SendReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant: OverdueTenant | null
}

export function SendReminderDialog({
  open,
  onOpenChange,
  tenant,
}: SendReminderDialogProps) {
  const sendReminderMutation = useSendReminder()

  const handleSend = () => {
    if (!tenant || tenant.invoices.length === 0) return

    // Enviar lembrete para a fatura mais antiga
    const oldestInvoice = tenant.invoices[0]

    sendReminderMutation.mutate(
      { invoiceId: oldestInvoice.id },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      },
    )
  }

  if (!tenant) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-slate-900 flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Enviar Lembrete de Pagamento
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Um email será enviado para o tenant solicitando regularização do pagamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Card com informações do tenant */}
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Tenant:</span>
                <span className="text-sm font-medium text-slate-900">{tenant.tenantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Email:</span>
                <span className="text-sm font-medium text-slate-900">{tenant.tenantEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Faturas Vencidas:</span>
                <span className="text-sm font-medium text-danger">
                  {tenant.overdueInvoices} {tenant.overdueInvoices === 1 ? 'fatura' : 'faturas'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Valor Total:</span>
                <span className="text-sm font-bold text-danger/90">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(tenant.totalOverdueAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-slate-500">
            O lembrete será enviado por email e registrado no sistema.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sendReminderMutation.isPending}
            className="border-slate-200 text-slate-700"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={sendReminderMutation.isPending}
            className="bg-primary/60 hover:bg-blue-700 text-white"
          >
            {sendReminderMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Enviar Lembrete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
