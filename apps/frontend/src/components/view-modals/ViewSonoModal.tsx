import { Eye } from 'lucide-react'
import { formatDateLongSafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import { Badge } from '@/components/ui/badge'
import { ActionDetailsSheet } from '@/design-system/components'

interface SonoData {
  padraoSono: string
  outroPadrao?: string
  observacoes?: string
  [key: string]: unknown
}

interface SonoRecord {
  data: SonoData
  time: string
  date: string
  recordedBy: string
  createdAt: string
  notes?: string
  [key: string]: unknown
}

interface ViewSonoModalProps {
  open: boolean
  onClose: () => void
  record: SonoRecord
}

export function ViewSonoModal({
  open,
  onClose,
  record,
}: ViewSonoModalProps) {
  if (!record) return null

  const { data, time, date, recordedBy, createdAt, notes } = record
  const hasObservacoes =
    Boolean(data.observacoes && String(data.observacoes).trim().length > 0) ||
    Boolean(notes && String(notes).trim().length > 0)

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      title="Sono - Detalhes"
      description="Visualização completa do registro de sono"
      icon={<Eye className="h-4 w-4" />}
      summary={(
        <div className="bg-muted/20 p-4 rounded-lg border">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{formatDateLongSafe(date)}</span>
            <span>•</span>
            <span>Horário {time}</span>
            <span>•</span>
            <span>Por <span className="font-medium text-foreground">{recordedBy}</span></span>
          </div>
        </div>
      )}
      bodyClassName="space-y-6"
    >
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground mb-3">Padrão de Sono</h3>
        <div className="bg-muted/20 p-4 rounded-lg border">
          <Badge variant="outline" className="font-normal">
            {data.padraoSono}
          </Badge>
          {data.padraoSono === 'Outro' && data.outroPadrao && (
            <p className="text-sm mt-3 text-muted-foreground">
              Especificação: <span className="font-medium text-foreground">{data.outroPadrao}</span>
            </p>
          )}
        </div>
      </div>

      {hasObservacoes && (
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-3">
            Observações
          </h3>
          <div className="bg-muted/20 p-4 rounded-lg border">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {notes || data.observacoes}
            </p>
          </div>
        </div>
      )}

      <div className="pt-4 border-t text-xs text-muted-foreground">
        Registrado em {formatDateTimeSafe(createdAt)}
      </div>
    </ActionDetailsSheet>
  )
}
