import { Eye } from 'lucide-react'
import { formatDateLongSafe, formatDateTimeSafe, formatTimeSafe } from '@/utils/dateHelpers'
import { Badge } from '@/components/ui/badge'
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
  const createdByName = allergy.user?.name || allergy.createdByUser?.name || 'Usuário não informado'
  const wasUpdated = Boolean(allergy.updatedAt && allergy.updatedAt !== allergy.createdAt)

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Alergias - Detalhes"
      description="Visualização completa do registro de alergia"
      icon={<Eye className="h-4 w-4" />}
      summary={(
        <div className="bg-muted/20 p-4 rounded-lg border">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{formatDateLongSafe(allergy.createdAt)}</span>
            <span>•</span>
            <span>Horário {formatTimeSafe(allergy.createdAt)}</span>
            <span>•</span>
            <span>Por <span className="font-medium text-foreground">{createdByName}</span></span>
          </div>
        </div>
      )}
      bodyClassName="space-y-6"
    >
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground mb-3">Substância</h3>
        <Badge variant="outline" className="font-normal text-sm">{allergy.substance}</Badge>
      </div>

      <div>
        <h3 className="font-semibold text-sm text-muted-foreground mb-3">Severidade</h3>
        <div>
          {allergy.severity ? (
            <Badge variant="outline">{severityLabel[allergy.severity] || allergy.severity}</Badge>
          ) : (
            <p className="text-sm text-muted-foreground">Não informado</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Reação</h3>
        <div className="bg-muted/20 p-3 rounded-lg border">
          <p className="text-sm whitespace-pre-wrap">{allergy.reaction || 'Não informado'}</p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Observações</h3>
        <div className="bg-muted/20 p-3 rounded-lg border">
          <p className="text-sm whitespace-pre-wrap">{allergy.notes || 'Não informado'}</p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Contraindicações</h3>
        <div className="bg-muted/20 p-3 rounded-lg border">
          <p className="text-sm whitespace-pre-wrap">{allergy.contraindications || 'Não informado'}</p>
        </div>
      </div>

      <div className="pt-4 border-t text-xs text-muted-foreground">
        Registrado em {formatDateTimeSafe(allergy.createdAt)}
        {wasUpdated && <> • Alterado em {formatDateTimeSafe(allergy.updatedAt)}</>}
      </div>
    </ActionDetailsSheet>
  )
}
