import { Utensils } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ActionDetailsSheet } from '@/design-system/components'
import type { DietaryRestriction } from '@/api/dietary-restrictions.api'

interface DietaryRestrictionViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  restriction?: DietaryRestriction
}

const restrictionTypeLabel: Record<string, string> = {
  ALERGIA_ALIMENTAR: 'Alergia Alimentar',
  INTOLERANCIA: 'Intolerância',
  RESTRICAO_MEDICA: 'Restrição Médica',
  RESTRICAO_RELIGIOSA: 'Restrição Religiosa',
  DISFAGIA: 'Disfagia',
  DIABETES: 'Diabetes',
  HIPERTENSAO: 'Hipertensão',
  OUTRA: 'Outra',
}

export function DietaryRestrictionViewModal({
  open,
  onOpenChange,
  restriction,
}: DietaryRestrictionViewModalProps) {
  if (!restriction) return null

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Visualizar Restrição Alimentar"
      description="Restrições dietéticas e orientações nutricionais"
      icon={<Utensils className="h-4 w-4" />}
      bodyClassName="space-y-4"
    >
      <div>
        <Label>Tipo de Restrição</Label>
        <div className="mt-1">
          <Badge variant="outline">
            {restrictionTypeLabel[restriction.restrictionType] || restriction.restrictionType}
          </Badge>
        </div>
      </div>

      <div>
        <Label>Descrição</Label>
        <p className="mt-1 text-sm">{restriction.description}</p>
      </div>

      <div>
        <Label>Observações</Label>
        <p className="mt-1 text-sm">{restriction.notes || 'Não informado'}</p>
      </div>

      <div>
        <Label>Contraindicações</Label>
        <p className="mt-1 text-sm">{restriction.contraindications || 'Não informado'}</p>
      </div>
    </ActionDetailsSheet>
  )
}
