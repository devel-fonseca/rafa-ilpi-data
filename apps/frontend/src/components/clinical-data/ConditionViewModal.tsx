import { Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ActionDetailsSheet } from '@/design-system/components'
import type { Condition } from '@/api/conditions.api'

interface ConditionViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  condition?: Condition
}

export function ConditionViewModal({
  open,
  onOpenChange,
  condition,
}: ConditionViewModalProps) {
  if (!condition) return null

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Visualizar Condição Crônica"
      description="Registro de condições médicas e comorbidades"
      icon={<Activity className="h-4 w-4" />}
      bodyClassName="space-y-4"
    >
      <div>
        <Label>Condição / Diagnóstico</Label>
        <p className="mt-1 text-sm">{condition.condition}</p>
      </div>

      <div>
        <Label>CID-10</Label>
        <div className="mt-1">
          {condition.icdCode ? (
            <Badge variant="outline">{condition.icdCode}</Badge>
          ) : (
            <p className="text-sm text-muted-foreground">Não informado</p>
          )}
        </div>
      </div>

      <div>
        <Label>Observações</Label>
        <p className="mt-1 text-sm">{condition.notes || 'Não informado'}</p>
      </div>

      <div>
        <Label>Contraindicações</Label>
        <p className="mt-1 text-sm">{condition.contraindications || 'Não informado'}</p>
      </div>
    </ActionDetailsSheet>
  )
}
