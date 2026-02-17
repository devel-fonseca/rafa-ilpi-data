import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ActionDetailsSheet } from '@/design-system/components'
import type { Allergy } from '@/api/allergies.api'

interface AllergyViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  allergy?: Allergy
}

const severityLabel: Record<string, string> = {
  LEVE: 'Leve',
  MODERADA: 'Moderada',
  GRAVE: 'Grave',
  ANAFILAXIA: 'Anafilaxia',
}

export function AllergyViewModal({ open, onOpenChange, allergy }: AllergyViewModalProps) {
  if (!allergy) return null

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Visualizar Alergia"
      description="Registro de alergias e reações adversas"
      icon={<AlertTriangle className="h-4 w-4" />}
      bodyClassName="space-y-4"
    >
      <div>
        <Label>Substância</Label>
        <p className="mt-1 text-sm">{allergy.substance}</p>
      </div>

      <div>
        <Label>Severidade</Label>
        <div className="mt-1">
          {allergy.severity ? (
            <Badge variant="outline">{severityLabel[allergy.severity] || allergy.severity}</Badge>
          ) : (
            <p className="text-sm text-muted-foreground">Não informado</p>
          )}
        </div>
      </div>

      <div>
        <Label>Reação</Label>
        <p className="mt-1 text-sm">{allergy.reaction || 'Não informado'}</p>
      </div>

      <div>
        <Label>Observações</Label>
        <p className="mt-1 text-sm">{allergy.notes || 'Não informado'}</p>
      </div>

      <div>
        <Label>Contraindicações</Label>
        <p className="mt-1 text-sm">{allergy.contraindications || 'Não informado'}</p>
      </div>
    </ActionDetailsSheet>
  )
}
