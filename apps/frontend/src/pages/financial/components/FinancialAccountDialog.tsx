import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CircleHelp } from 'lucide-react'
import type { FinancialAccountType } from '@/types/financial-operations'
import { normalizePtBrDecimalInput, toPtBrDecimalInput } from '../financial.utils'

export interface AccountFormState {
  id?: string
  bankCode: string
  bankName: string
  branch: string
  accountNumber: string
  accountType: FinancialAccountType
  accountName: string
  pixKey: string
  pixKeyType: string
  isActive: boolean
  isDefault: boolean
  currentBalance: string
}

interface FinancialAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: AccountFormState
  setForm: (updater: (prev: AccountFormState) => AccountFormState) => void
  onSubmit: () => void
  isSubmitting: boolean
  canSubmit: boolean
  submitDisabledReason?: string
}

export function FinancialAccountDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onSubmit,
  isSubmitting,
  canSubmit,
  submitDisabledReason,
}: FinancialAccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(42rem,calc(100vw-2rem))] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <div className="flex items-center gap-2">
            <DialogTitle>{form.id ? 'Editar conta' : 'Nova conta'}</DialogTitle>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground">
                    <CircleHelp className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Cadastre conta para baixas, extrato e conciliação.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </DialogHeader>

        <div className="grid max-h-[calc(90vh-11rem)] gap-3 overflow-y-auto px-6 py-3 md:grid-cols-2">
          <div>
            <Label>Código do banco</Label>
            <Input
              value={form.bankCode}
              onChange={(event) => setForm((prev) => ({ ...prev, bankCode: event.target.value }))}
              placeholder="Ex: 001"
            />
          </div>
          <div>
            <Label>Banco</Label>
            <Input
              value={form.bankName}
              onChange={(event) => setForm((prev) => ({ ...prev, bankName: event.target.value }))}
              placeholder="Ex: Banco do Brasil"
            />
          </div>
          <div>
            <Label>Agência</Label>
            <Input
              value={form.branch}
              onChange={(event) => setForm((prev) => ({ ...prev, branch: event.target.value }))}
              placeholder="Ex: 1234"
            />
          </div>
          <div>
            <Label>Número da conta</Label>
            <Input
              value={form.accountNumber}
              onChange={(event) => setForm((prev) => ({ ...prev, accountNumber: event.target.value }))}
              placeholder="Ex: 12345-6"
            />
          </div>
          <div>
            <Label>Tipo</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.accountType}
              onChange={(event) => setForm((prev) => ({ ...prev, accountType: event.target.value as FinancialAccountType }))}
            >
              <option value="CHECKING">Corrente</option>
              <option value="SAVINGS">Poupança</option>
              <option value="PAYMENT">Pagamento</option>
            </select>
          </div>
          <div>
            <Label>Nome da conta</Label>
            <Input
              value={form.accountName}
              onChange={(event) => setForm((prev) => ({ ...prev, accountName: event.target.value }))}
              placeholder="Ex: Conta principal operacional"
            />
          </div>
          <div>
            <Label>Saldo atual</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={form.currentBalance}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  currentBalance: normalizePtBrDecimalInput(event.target.value),
                }))}
              onBlur={() =>
                setForm((prev) => ({
                  ...prev,
                  currentBalance: prev.currentBalance ? toPtBrDecimalInput(prev.currentBalance) : '',
                }))}
              placeholder="0,00"
            />
          </div>
          <div>
            <Label>Tipo de chave PIX</Label>
            <Input
              value={form.pixKeyType}
              onChange={(event) => setForm((prev) => ({ ...prev, pixKeyType: event.target.value }))}
              placeholder="Ex: EMAIL, CPF, TELEFONE"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Chave PIX</Label>
            <Input
              value={form.pixKey}
              onChange={(event) => setForm((prev) => ({ ...prev, pixKey: event.target.value }))}
              placeholder="Opcional"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            Conta ativa
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) => setForm((prev) => ({ ...prev, isDefault: event.target.checked }))}
            />
            Conta padrão
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t bg-background px-6 py-4">
          {!canSubmit && submitDisabledReason ? (
            <p className="mr-auto self-center text-xs text-muted-foreground">{submitDisabledReason}</p>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting || !canSubmit}>
            {form.id ? 'Salvar alterações' : 'Salvar conta'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
