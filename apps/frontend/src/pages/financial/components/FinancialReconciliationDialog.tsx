import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CircleHelp } from 'lucide-react'
import type { FinancialBankAccount } from '@/types/financial-operations'
import { normalizePtBrDecimalInput, toPtBrDecimalInput } from '../financial.utils'

export interface ReconciliationFormState {
  bankAccountId: string
  reconciliationDate: string
  startDate: string
  endDate: string
  openingBalance: string
  closingBalance: string
  notes: string
}

interface FinancialReconciliationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: ReconciliationFormState
  setForm: (updater: (prev: ReconciliationFormState) => ReconciliationFormState) => void
  bankAccounts: FinancialBankAccount[]
  onSubmit: () => void
  onApplySystemBalances: () => void
  isSubmitting: boolean
  isSystemSummaryLoading: boolean
  systemSummary?: {
    openingBalance: string
    closingBalance: string
    periodNetImpact: string
  }
  canSubmit: boolean
  submitDisabledReason?: string
}

export function FinancialReconciliationDialog({
  open,
  onOpenChange,
  form,
  setForm,
  bankAccounts,
  onSubmit,
  onApplySystemBalances,
  isSubmitting,
  isSystemSummaryLoading,
  systemSummary,
  canSubmit,
  submitDisabledReason,
}: FinancialReconciliationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(42rem,calc(100vw-2rem))] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <div className="flex items-center gap-2">
            <DialogTitle>Novo fechamento</DialogTitle>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground">
                    <CircleHelp className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Use o fechamento para comparar o saldo informado com o saldo calculado no período.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </DialogHeader>

        <div className="grid max-h-[calc(90vh-11rem)] gap-3 overflow-y-auto px-6 py-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Conta bancária</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.bankAccountId}
              onChange={(event) => setForm((prev) => ({ ...prev, bankAccountId: event.target.value }))}
            >
              <option value="">Selecione</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountName} ({account.bankName})
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 rounded-md border border-border/70 bg-muted/20 p-3 text-sm">
            {isSystemSummaryLoading ? (
              <p className="text-muted-foreground">Carregando saldos do sistema...</p>
            ) : systemSummary ? (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  Saldos calculados pelo sistema para o período selecionado.
                </p>
                <p>
                  Abertura: <strong>{systemSummary.openingBalance}</strong> | Impacto:{' '}
                  <strong>{systemSummary.periodNetImpact}</strong> | Fechamento:{' '}
                  <strong>{systemSummary.closingBalance}</strong>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onApplySystemBalances}
                >
                  Usar saldos do sistema
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Selecione conta e período para carregar os saldos do sistema.
              </p>
            )}
          </div>
          <div>
            <Label>Data do fechamento</Label>
            <Input
              type="date"
              value={form.reconciliationDate}
              onChange={(event) => setForm((prev) => ({ ...prev, reconciliationDate: event.target.value }))}
            />
          </div>
          <div>
            <Label>Período inicial</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
            />
          </div>
          <div>
            <Label>Período final</Label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
            />
          </div>
          <div>
            <Label>Saldo inicial</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={form.openingBalance}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  openingBalance: normalizePtBrDecimalInput(event.target.value),
                }))}
              onBlur={() =>
                setForm((prev) => ({
                  ...prev,
                  openingBalance: prev.openingBalance ? toPtBrDecimalInput(prev.openingBalance) : '',
                }))}
              placeholder="0,00"
            />
          </div>
          <div>
            <Label>Saldo final informado</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={form.closingBalance}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  closingBalance: normalizePtBrDecimalInput(event.target.value),
                }))}
              onBlur={() =>
                setForm((prev) => ({
                  ...prev,
                  closingBalance: prev.closingBalance ? toPtBrDecimalInput(prev.closingBalance) : '',
                }))}
              placeholder="0,00"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Observações</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Opcional"
            />
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
            Gerar fechamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
