import { Eye } from 'lucide-react'
import { formatDateLongSafe, formatDateTimeSafe, formatTimeSafe } from '@/utils/dateHelpers'
import { Badge } from '@/components/ui/badge'
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
  const wasUpdated = Boolean(restriction.updatedAt && restriction.updatedAt !== restriction.createdAt)

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Restrições Alimentares - Detalhes"
      description="Visualização completa do registro da restrição alimentar"
      icon={<Eye className="h-4 w-4" />}
      summary={(
        <div className="bg-muted/20 p-4 rounded-lg border">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{formatDateLongSafe(restriction.createdAt)}</span>
            <span>•</span>
            <span>Horário {formatTimeSafe(restriction.createdAt)}</span>
            <span>•</span>
            <span>Por <span className="font-medium text-foreground">{restriction.creator?.name || 'Usuário não informado'}</span></span>
          </div>
        </div>
      )}
      bodyClassName="space-y-6"
    >
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground mb-3">Tipo de Restrição</h3>
        <div>
          <Badge variant="outline">
            {restrictionTypeLabel[restriction.restrictionType] || restriction.restrictionType}
          </Badge>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm text-muted-foreground mb-3">Descrição</h3>
        <Badge variant="outline" className="font-normal text-sm">{restriction.description}</Badge>
      </div>

      <div>
        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Observações</h3>
        <div className="bg-muted/20 p-3 rounded-lg border">
          <p className="text-sm whitespace-pre-wrap">{restriction.notes || 'Não informado'}</p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Contraindicações</h3>
        <div className="bg-muted/20 p-3 rounded-lg border">
          <p className="text-sm whitespace-pre-wrap">{restriction.contraindications || 'Não informado'}</p>
        </div>
      </div>

      <div className="pt-4 border-t text-xs text-muted-foreground">
        Registrado em {formatDateTimeSafe(restriction.createdAt)}
        {wasUpdated && <> • Alterado em {formatDateTimeSafe(restriction.updatedAt)}</>}
      </div>
    </ActionDetailsSheet>
  )
}
