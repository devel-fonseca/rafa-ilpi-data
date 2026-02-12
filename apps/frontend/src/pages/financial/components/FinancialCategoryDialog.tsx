import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CircleHelp } from 'lucide-react'
import type { FinancialCategory, FinancialCategoryType } from '@/types/financial-operations'

export interface CategoryFormState {
  id?: string
  name: string
  description: string
  type: FinancialCategoryType
  parentCategoryId: string
  isActive: boolean
}

interface FinancialCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: CategoryFormState
  setForm: (updater: (prev: CategoryFormState) => CategoryFormState) => void
  categories: FinancialCategory[]
  onSubmit: () => void
  isSubmitting: boolean
  canSubmit: boolean
  submitDisabledReason?: string
}

export function FinancialCategoryDialog({
  open,
  onOpenChange,
  form,
  setForm,
  categories,
  onSubmit,
  isSubmitting,
  canSubmit,
  submitDisabledReason,
}: FinancialCategoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(42rem,calc(100vw-2rem))] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <div className="flex items-center gap-2">
            <DialogTitle>{form.id ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground">
                    <CircleHelp className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Organize as transações por tipo e hierarquia.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </DialogHeader>

        <div className="grid max-h-[calc(90vh-11rem)] gap-3 overflow-y-auto px-6 py-3">
          <div>
            <Label>Nome</Label>
            <Input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Ex: Receitas operacionais"
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Descrição opcional da categoria"
            />
          </div>
          <div>
            <Label>Tipo</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.type}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  type: event.target.value as FinancialCategoryType,
                  parentCategoryId: '',
                }))
              }
            >
              <option value="INCOME">Receita</option>
              <option value="EXPENSE">Despesa</option>
            </select>
          </div>
          <div>
            <Label>Categoria</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.parentCategoryId}
              onChange={(event) => setForm((prev) => ({ ...prev, parentCategoryId: event.target.value }))}
            >
              <option value="">Sem categoria</option>
              {categories
                .filter((category) => category.type === form.type && category.id !== form.id)
                .map((category) => (
                  <option value={category.id} key={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            Categoria ativa
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
            {form.id ? 'Salvar alterações' : 'Salvar categoria'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
