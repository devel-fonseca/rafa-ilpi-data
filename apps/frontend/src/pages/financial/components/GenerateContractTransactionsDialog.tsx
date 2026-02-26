import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface GenerateContractTransactionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  competenceMonth: string
  onCompetenceMonthChange: (value: string) => void
  onConfirm: () => void
  isSubmitting: boolean
}

export function GenerateContractTransactionsDialog({
  open,
  onOpenChange,
  competenceMonth,
  onCompetenceMonthChange,
  onConfirm,
  isSubmitting,
}: GenerateContractTransactionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar mensalidades por contratos</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Gere automaticamente as mensalidades da competência selecionada para contratos vigentes.
          </p>
          <div>
            <Label>Competência</Label>
            <Input
              type="month"
              value={competenceMonth}
              onChange={(event) => onCompetenceMonthChange(event.target.value)}
            />
          </div>
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            Gerar mensalidades
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
