import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { normalizeUTCDate } from '@/utils/dateHelpers'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent } from '@/components/ui/card'
import { useRenegotiate } from '@/hooks/useCollections'
import { DollarSign, Loader2, Calendar } from 'lucide-react'
import type { OverdueTenant } from '@/api/overdue.api'

interface RenegotiateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant: OverdueTenant | null
}

export function RenegotiateDialog({
  open,
  onOpenChange,
  tenant,
}: RenegotiateDialogProps) {
  const renegotiateMutation = useRenegotiate()

  const [discountPercent, setDiscountPercent] = useState(0)
  const [extensionDays, setExtensionDays] = useState(0)
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<{ reason?: string; general?: string }>({})

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setDiscountPercent(0)
      setExtensionDays(0)
      setReason('')
      setErrors({})
    }
  }, [open])

  const validate = () => {
    const newErrors: { reason?: string; general?: string } = {}

    // Validar: pelo menos desconto OU extensão
    if (discountPercent === 0 && extensionDays === 0) {
      newErrors.general = 'Defina pelo menos um desconto OU uma extensão de prazo'
    }

    // Validar motivo
    if (!reason || reason.trim().length < 10) {
      newErrors.reason = 'Motivo deve ter pelo menos 10 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!tenant || tenant.invoices.length === 0) return
    if (!validate()) return

    // Renegociar a fatura mais antiga
    const oldestInvoice = tenant.invoices[0]

    renegotiateMutation.mutate(
      {
        invoiceId: oldestInvoice.id,
        discountPercent: discountPercent > 0 ? discountPercent : undefined,
        extensionDays: extensionDays > 0 ? extensionDays : undefined,
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

  // Calcular preview do novo valor
  const oldestInvoice = tenant.invoices[0]
  const originalAmount = oldestInvoice?.amount || 0
  const discountAmount = (originalAmount * discountPercent) / 100
  const newAmount = originalAmount - discountAmount

  // Calcular nova data de vencimento
  // Usar normalizeUTCDate para evitar timezone shift em datas civis (DATETIME_STANDARD.md)
  const originalDueDate = oldestInvoice ? normalizeUTCDate(oldestInvoice.dueDate) : new Date()
  // Clonar Date object existente (OK usar new Date() aqui)
  // eslint-disable-next-line no-restricted-syntax
  const newDueDate = new Date(originalDueDate)
  newDueDate.setDate(newDueDate.getDate() + extensionDays)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            Renegociar Fatura
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Aplique desconto e/ou extensão de prazo para ajudar o tenant a regularizar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Tenant Info */}
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Tenant:</span>
                <span className="text-sm font-medium text-slate-900">{tenant.tenantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Fatura:</span>
                <span className="text-sm font-medium text-slate-900">{oldestInvoice?.invoiceNumber}</span>
              </div>
            </CardContent>
          </Card>

          {/* Error general */}
          {errors.general && (
            <div className="text-sm text-danger bg-danger/5 border border-danger/30 rounded-md p-3">
              {errors.general}
            </div>
          )}

          {/* Desconto */}
          <div className="space-y-3">
            <Label className="text-slate-700">
              Desconto (%)
              <span className="text-slate-400 text-xs ml-2">Opcional</span>
            </Label>
            <div className="space-y-2">
              <Slider
                value={[discountPercent]}
                onValueChange={(value) => setDiscountPercent(value[0])}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">{discountPercent}% de desconto</span>
                <span className="text-sm font-medium text-success">
                  - R$ {discountAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Extensão de Prazo */}
          <div className="space-y-2">
            <Label htmlFor="extensionDays" className="text-slate-700">
              Extensão de Prazo (dias)
              <span className="text-slate-400 text-xs ml-2">Opcional</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="extensionDays"
                type="number"
                min="0"
                value={extensionDays || ''}
                onChange={(e) => setExtensionDays(parseInt(e.target.value) || 0)}
                className="bg-white border-slate-200 text-slate-900"
                placeholder="0"
              />
              <Calendar className="h-5 w-5 text-slate-400" />
            </div>
            {extensionDays > 0 && (
              <p className="text-xs text-slate-500">
                Novo vencimento: {newDueDate.toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-slate-700">
              Motivo da Renegociação *
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-white border-slate-200 text-slate-900 min-h-[80px]"
              placeholder="Ex: Cliente com dificuldades financeiras temporárias, boa histórico de pagamento..."
            />
            {errors.reason && (
              <p className="text-sm text-danger">{errors.reason}</p>
            )}
            <p className="text-xs text-slate-500">
              {reason.length}/10 caracteres mínimos
            </p>
          </div>

          {/* Preview */}
          <Card className="bg-success/5 border-success/30">
            <CardContent className="p-4 space-y-2">
              <h4 className="text-sm font-medium text-success/95">Preview da Renegociação</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-success/80">Valor Original:</span>
                  <span className="text-success/95 line-through">
                    R$ {originalAmount.toFixed(2)}
                  </span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-success/80">Desconto ({discountPercent}%):</span>
                    <span className="text-success font-medium">
                      - R$ {discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-success/30">
                  <span className="text-success/95">Novo Valor:</span>
                  <span className="text-success/95 text-base">
                    R$ {newAmount.toFixed(2)}
                  </span>
                </div>
                {extensionDays > 0 && (
                  <div className="flex justify-between text-sm pt-1">
                    <span className="text-success/80">Novo Vencimento:</span>
                    <span className="text-success/95">
                      {newDueDate.toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={renegotiateMutation.isPending}
            className="border-slate-200 text-slate-700"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={renegotiateMutation.isPending}
            className="bg-success/60 hover:bg-success/70 text-white"
          >
            {renegotiateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Renegociando...
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 mr-2" />
                Confirmar Renegociação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
