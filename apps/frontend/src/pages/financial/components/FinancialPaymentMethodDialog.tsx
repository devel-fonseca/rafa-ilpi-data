import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CircleHelp } from 'lucide-react'

export interface PaymentMethodFormState {
  id?: string
  name: string
  code: string
  description: string
  allowsInstallments: boolean
  maxInstallments: number
  isActive: boolean
}

interface FinancialPaymentMethodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: PaymentMethodFormState
  setForm: (updater: (prev: PaymentMethodFormState) => PaymentMethodFormState) => void
  onSubmit: () => void
  isSubmitting: boolean
  canSubmit: boolean
  submitDisabledReason?: string
}

export function FinancialPaymentMethodDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onSubmit,
  isSubmitting,
  canSubmit,
  submitDisabledReason,
}: FinancialPaymentMethodDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(42rem,calc(100vw-2rem))] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <div className="flex items-center gap-2">
            <DialogTitle>{form.id ? 'Editar método de pagamento' : 'Novo método de pagamento'}</DialogTitle>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground">
                    <CircleHelp className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Define formas de recebimento/pagamento. Confirmação é manual.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </DialogHeader>

        <div className="grid max-h-[calc(90vh-11rem)] gap-3 overflow-y-auto px-6 py-3 md:grid-cols-2">
          <div>
            <Label>Nome</Label>
            <Input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Ex: PIX"
            />
          </div>
          <div>
            <Label>Código</Label>
            <Input
              value={form.code}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, code: event.target.value.toLowerCase().replace(/\s+/g, '_') }))
              }
              placeholder="Ex: pix"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Descrição opcional"
            />
          </div>
          <div>
            <Label>Máx. parcelas</Label>
            <Input
              type="number"
              min="1"
              max="120"
              inputMode="numeric"
              disabled={!form.allowsInstallments}
              value={form.maxInstallments}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, maxInstallments: Number(event.target.value || 1) }))
              }
            />
          </div>
          <div className="flex items-end">
            <p className="text-sm text-muted-foreground">Confirmação de pagamento: manual (obrigatório)</p>
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.allowsInstallments}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    allowsInstallments: event.target.checked,
                    maxInstallments: event.target.checked ? prev.maxInstallments : 1,
                  }))
                }
              />
              Permite parcelamento
            </label>
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              Método ativo
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t bg-background px-6 py-4">
          {!canSubmit && submitDisabledReason ? (
            <p className="mr-auto self-center text-xs text-muted-foreground">{submitDisabledReason}</p>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting || !canSubmit}>
            {form.id ? 'Salvar alterações' : 'Salvar método'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
