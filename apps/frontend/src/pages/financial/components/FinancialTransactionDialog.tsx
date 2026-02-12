import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CircleHelp } from 'lucide-react'
import {
  formatCurrency,
  normalizePtBrDecimalInput,
  parsePtBrDecimalToNumber,
  toPtBrDecimalInput,
} from '../financial.utils'
import type {
  FinancialBankAccount,
  FinancialCategory,
  FinancialPaymentMethod,
  FinancialTransactionType,
} from '@/types/financial-operations'

export interface TransactionFormState {
  id?: string
  type: FinancialTransactionType
  categoryId: string
  amount: string
  discountAmount: string
  lateFeeMode: 'amount' | 'percentage'
  lateFeeAmount: string
  lateFeePercentage: string
  issueDate: string
  dueDate: string
  competenceMonth: string
  paymentMethodId: string
  bankAccountId: string
  description: string
  notes: string
}

interface FinancialTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: TransactionFormState
  setForm: (updater: (prev: TransactionFormState) => TransactionFormState) => void
  compatibleCategories: FinancialCategory[]
  paymentMethods: FinancialPaymentMethod[]
  bankAccounts: FinancialBankAccount[]
  onSubmit: () => void
  isSubmitting: boolean
  canSubmit: boolean
  submitDisabledReason?: string
}

export function FinancialTransactionDialog({
  open,
  onOpenChange,
  form,
  setForm,
  compatibleCategories,
  paymentMethods,
  bankAccounts,
  onSubmit,
  isSubmitting,
  canSubmit,
  submitDisabledReason,
}: FinancialTransactionDialogProps) {
  const lateFeePreviewAmount =
    form.lateFeeMode === 'percentage'
      ? (parsePtBrDecimalToNumber(form.amount || '0') * parsePtBrDecimalToNumber(form.lateFeePercentage || '0')) / 100
      : parsePtBrDecimalToNumber(form.lateFeeAmount || '0')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(42rem,calc(100vw-2rem))] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <div className="flex items-center gap-2">
            <DialogTitle>{form.id ? 'Editar transação' : 'Nova transação'}</DialogTitle>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground">
                    <CircleHelp className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Registrar receita ou despesa (baixa de pagamento é manual).</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </DialogHeader>

        <div className="grid max-h-[calc(90vh-11rem)] gap-3 overflow-y-auto px-6 py-3 md:grid-cols-2">
          <div>
            <Label>Tipo</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.type}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  type: event.target.value as FinancialTransactionType,
                  categoryId: '',
                }))
              }
            >
              <option value="INCOME">Receita</option>
              <option value="EXPENSE">Despesa</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Categoria</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.categoryId}
              onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
            >
              <option value="">Selecione</option>
              {compatibleCategories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Valor bruto</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={form.amount}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  amount: normalizePtBrDecimalInput(event.target.value),
                }))}
              onBlur={() =>
                setForm((prev) => ({
                  ...prev,
                  amount: prev.amount ? toPtBrDecimalInput(prev.amount) : '',
                }))}
              placeholder="0,00"
            />
          </div>
          <div>
            <Label>Desconto</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={form.discountAmount}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  discountAmount: normalizePtBrDecimalInput(event.target.value),
                }))}
              onBlur={() =>
                setForm((prev) => ({
                  ...prev,
                  discountAmount: prev.discountAmount ? toPtBrDecimalInput(prev.discountAmount) : '',
                }))}
              placeholder="0,00"
            />
          </div>
          <div>
            <Label>Juros/multa</Label>
            <div className="mb-2">
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.lateFeeMode}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    lateFeeMode: event.target.value as 'amount' | 'percentage',
                    lateFeeAmount: event.target.value === 'amount' ? prev.lateFeeAmount : '',
                    lateFeePercentage: event.target.value === 'percentage' ? prev.lateFeePercentage : '',
                  }))
                }
              >
                <option value="amount">Em R$</option>
                <option value="percentage">Em %</option>
              </select>
            </div>
            <Input
              type="text"
              inputMode="decimal"
              value={form.lateFeeMode === 'amount' ? form.lateFeeAmount : form.lateFeePercentage}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  ...(prev.lateFeeMode === 'amount'
                    ? { lateFeeAmount: normalizePtBrDecimalInput(event.target.value) }
                    : { lateFeePercentage: normalizePtBrDecimalInput(event.target.value) }),
                }))}
              onBlur={() =>
                setForm((prev) => ({
                  ...prev,
                  ...(prev.lateFeeMode === 'amount'
                    ? { lateFeeAmount: prev.lateFeeAmount ? toPtBrDecimalInput(prev.lateFeeAmount) : '' }
                    : {
                        lateFeePercentage: prev.lateFeePercentage
                          ? toPtBrDecimalInput(prev.lateFeePercentage)
                          : '',
                      }),
                }))}
              placeholder={form.lateFeeMode === 'amount' ? '0,00' : '0,00'}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {form.lateFeeMode === 'amount'
                ? 'Valor adicional em R$.'
                : 'Percentual aplicado sobre o valor bruto.'}
            </p>
            {form.lateFeeMode === 'percentage' ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Valor calculado: {formatCurrency(lateFeePreviewAmount)}
              </p>
            ) : null}
          </div>
          <div>
            <Label>Competência</Label>
            <Input
              type="month"
              value={form.competenceMonth}
              onChange={(event) => setForm((prev) => ({ ...prev, competenceMonth: event.target.value }))}
            />
          </div>
          <div>
            <Label>Data de emissão</Label>
            <Input
              type="date"
              value={form.issueDate}
              onChange={(event) => setForm((prev) => ({ ...prev, issueDate: event.target.value }))}
            />
          </div>
          <div>
            <Label>Data de vencimento</Label>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
            />
          </div>
          <div>
            <Label>Método de pagamento</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.paymentMethodId}
              onChange={(event) => setForm((prev) => ({ ...prev, paymentMethodId: event.target.value }))}
            >
              <option value="">Não definido</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Conta</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.bankAccountId}
              onChange={(event) => setForm((prev) => ({ ...prev, bankAccountId: event.target.value }))}
            >
              <option value="">Não definida</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountName} ({account.bankName})
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Descrição</Label>
            <Input
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Ex: Mensalidade fevereiro/2026"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Observações</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Observações opcionais"
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
            {form.id ? 'Salvar alterações' : 'Salvar transação'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
