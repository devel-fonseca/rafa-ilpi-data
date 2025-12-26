import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSuspendTenant } from '@/hooks/useCollections'
import { Ban, Loader2, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { OverdueTenant } from '@/api/overdue.api'

interface SuspendTenantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant: OverdueTenant | null
}

export function SuspendTenantDialog({
  open,
  onOpenChange,
  tenant,
}: SuspendTenantDialogProps) {
  const suspendMutation = useSuspendTenant()

  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [errors, setErrors] = useState<{ reason?: string; confirmed?: string }>({})

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setReason('')
      setConfirmed(false)
      setErrors({})
    }
  }, [open])

  const validate = () => {
    const newErrors: { reason?: string; confirmed?: string } = {}

    // Validar motivo
    if (!reason || reason.trim().length < 10) {
      newErrors.reason = 'Motivo deve ter pelo menos 10 caracteres'
    }

    // Validar confirmação
    if (!confirmed) {
      newErrors.confirmed = 'Você deve confirmar a ação antes de prosseguir'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSuspend = () => {
    if (!tenant) return
    if (!validate()) return

    const invoiceIds = tenant.invoices.map((inv) => inv.id)

    suspendMutation.mutate(
      {
        tenantId: tenant.tenantId,
        invoiceIds,
        reason: reason.trim(),
      },
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
      <DialogContent className="sm:max-w-[600px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-red-900 flex items-center gap-2">
            <Ban className="h-5 w-5 text-red-600" />
            Suspender Tenant
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Esta ação irá bloquear o acesso do tenant ao sistema imediatamente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Alert de Aviso */}
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 text-sm">
              <strong>Atenção:</strong> Esta é uma ação crítica. O tenant perderá acesso
              ao sistema até que seja reativado manualmente.
            </AlertDescription>
          </Alert>

          {/* Tenant Info */}
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
                <span className="text-sm text-slate-600">Plano:</span>
                <span className="text-sm font-medium text-slate-900">{tenant.planName}</span>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Faturas Vencidas */}
          <div className="space-y-2">
            <Label className="text-slate-700">
              Faturas Vencidas ({tenant.overdueInvoices})
            </Label>
            <Card className="bg-white border-red-200">
              <CardContent className="p-3 space-y-2 max-h-[150px] overflow-y-auto">
                {tenant.invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex justify-between items-center text-sm py-1 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <span className="text-slate-700 font-mono">{invoice.invoiceNumber}</span>
                      <Badge variant="destructive" className="ml-2 text-xs">
                        {invoice.daysOverdue} {invoice.daysOverdue === 1 ? 'dia' : 'dias'}
                      </Badge>
                    </div>
                    <span className="text-slate-900 font-medium">
                      R$ {invoice.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-md border border-red-200">
              <span className="text-sm font-medium text-red-900">Total em Atraso:</span>
              <span className="text-lg font-bold text-red-900">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(tenant.totalOverdueAmount)}
              </span>
            </div>
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-slate-700">
              Motivo da Suspensão *
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-white border-slate-200 text-slate-900 min-h-[80px]"
              placeholder="Ex: Inadimplência superior a 30 dias, múltiplas tentativas de contato sem retorno..."
            />
            {errors.reason && (
              <p className="text-sm text-red-600">{errors.reason}</p>
            )}
            <p className="text-xs text-slate-500">
              {reason.length}/10 caracteres mínimos
            </p>
          </div>

          {/* Confirmação Obrigatória */}
          <div className="space-y-3 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="confirm"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
                className="mt-1"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="confirm"
                  className="text-sm font-medium text-slate-900 cursor-pointer"
                >
                  Confirmo que entendo as consequências desta ação
                </Label>
                <p className="text-xs text-slate-600">
                  O tenant será imediatamente bloqueado e receberá um alerta no sistema.
                  Esta ação pode ser revertida posteriormente na página de detalhes do tenant.
                </p>
              </div>
            </div>
            {errors.confirmed && (
              <p className="text-sm text-red-600 mt-2">{errors.confirmed}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={suspendMutation.isPending}
            className="border-slate-200 text-slate-700"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSuspend}
            disabled={suspendMutation.isPending || !confirmed}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {suspendMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Suspendendo...
              </>
            ) : (
              <>
                <Ban className="h-4 w-4 mr-2" />
                Suspender Tenant
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
