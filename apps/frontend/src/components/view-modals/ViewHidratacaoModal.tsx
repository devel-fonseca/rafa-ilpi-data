import React from 'react'
import { Eye } from 'lucide-react'
import { formatDateLongSafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import { ActionDetailsSheet } from '@/design-system/components'

interface HidratacaoData {
  volumeMl: string | number
  tipo?: string
  observacoes?: string
  [key: string]: unknown
}

interface HidratacaoRecord {
  data: HidratacaoData
  time: string
  date: string
  recordedBy: string
  createdAt: string
  notes?: string
  [key: string]: unknown
}

interface ViewHidratacaoModalProps {
  open: boolean
  onClose: () => void
  record: HidratacaoRecord
}

export function ViewHidratacaoModal({
  open,
  onClose,
  record,
}: ViewHidratacaoModalProps) {
  if (!record) return null

  const { data, time, date, recordedBy, createdAt, notes } = record
  const hasObservacoes =
    Boolean(data.observacoes && String(data.observacoes).trim().length > 0) ||
    Boolean(notes && String(notes).trim().length > 0)

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      title="Hidratação - Detalhes"
      description="Visualização completa do registro de hidratação"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-3">Volume Ingerido</h3>
          <div className="bg-muted/20 border p-4 rounded-lg">
            <p className="text-2xl font-semibold">
              {data.volumeMl} <span className="text-base font-normal text-muted-foreground">ml</span>
            </p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-3">Tipo de Líquido</h3>
          <div className="bg-muted/20 border p-4 rounded-lg min-h-[72px] flex items-center">
            {data.tipo ? (
              <span className="text-sm">{data.tipo}</span>
            ) : (
              <span className="text-sm text-muted-foreground">Não informado</span>
            )}
          </div>
        </div>
      </div>

      {hasObservacoes && (
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-2">
            Observações
          </h3>
          <div className="bg-muted/20 p-3 rounded-lg">
            <p className="text-sm whitespace-pre-wrap">
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
