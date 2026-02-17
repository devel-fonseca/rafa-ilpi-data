import { Eye } from 'lucide-react'
import { formatDateLongSafe, formatDateTimeSafe, formatTimeSafe } from '@/utils/dateHelpers'
import { Badge } from '@/components/ui/badge'
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
  const createdByName = condition.user?.name || condition.createdByUser?.name || 'Usuário não informado'

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Condições Crônicas - Detalhes"
      description="Visualização completa do registro da condição crônica"
      icon={<Eye className="h-4 w-4" />}
      summary={(
        <div className="bg-muted/20 p-4 rounded-lg border">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{formatDateLongSafe(condition.createdAt)}</span>
            <span>•</span>
            <span>Horário {formatTimeSafe(condition.createdAt)}</span>
            <span>•</span>
            <span>Por <span className="font-medium text-foreground">{createdByName}</span></span>
          </div>
        </div>
      )}
      bodyClassName="space-y-6"
    >
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground mb-3">Condição / Diagnóstico</h3>
        <Badge variant="outline" className="font-normal text-sm">{condition.condition}</Badge>
      </div>

      <div>
        <h3 className="font-semibold text-sm text-muted-foreground mb-3">CID-10</h3>
        <div>
          {condition.icdCode ? (
            <Badge variant="outline">{condition.icdCode}</Badge>
          ) : (
            <p className="text-sm text-muted-foreground">Não informado</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Observações</h3>
        <div className="bg-muted/20 p-3 rounded-lg border">
          <p className="text-sm whitespace-pre-wrap">{condition.notes || 'Não informado'}</p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Contraindicações</h3>
        <div className="bg-muted/20 p-3 rounded-lg border">
          <p className="text-sm whitespace-pre-wrap">{condition.contraindications || 'Não informado'}</p>
        </div>
      </div>

      <div className="pt-4 border-t text-xs text-muted-foreground">
        Registrado em {formatDateTimeSafe(condition.createdAt)}
      </div>
    </ActionDetailsSheet>
  )
}
