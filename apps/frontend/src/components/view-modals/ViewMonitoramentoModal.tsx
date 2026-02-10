import { Eye } from 'lucide-react'
import { formatDateLongSafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import { ActionDetailsSheet } from '@/design-system/components'
import type { MonitoramentoRecord } from '@/types/daily-records'

interface ViewMonitoramentoModalProps {
  open: boolean
  onClose: () => void
  record: MonitoramentoRecord | null
}

export function ViewMonitoramentoModal({
  open,
  onClose,
  record,
}: ViewMonitoramentoModalProps) {
  if (!record) return null

  const { data, time, date, recordedBy, createdAt, notes } = record
  const hasObservacoes = Boolean(notes && String(notes).trim().length > 0)

  const hasVitalSign = (value: unknown) => value !== undefined && value !== null && value !== ''

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      title="Monitoramento Vital - Detalhes"
      description="Visualização completa do registro de sinais vitais"
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
        <h3 className="font-semibold text-sm text-muted-foreground mb-3">Sinais Vitais</h3>
        <div className="grid grid-cols-2 gap-4">
          {hasVitalSign(data.pressaoArterial) && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Pressão Arterial</p>
              <p className="text-sm font-medium">{String(data.pressaoArterial)} mmHg</p>
            </div>
          )}

          {hasVitalSign(data.temperatura) && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Temperatura</p>
              <p className="text-sm font-medium">{String(data.temperatura)} °C</p>
            </div>
          )}

          {hasVitalSign(data.frequenciaCardiaca) && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Frequência Cardíaca</p>
              <p className="text-sm font-medium">{String(data.frequenciaCardiaca)} bpm</p>
            </div>
          )}

          {hasVitalSign(data.saturacaoO2) && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Saturação O₂</p>
              <p className="text-sm font-medium">{String(data.saturacaoO2)} %</p>
            </div>
          )}

          {hasVitalSign(data.glicemia) && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Glicemia</p>
              <p className="text-sm font-medium">{String(data.glicemia)} mg/dL</p>
            </div>
          )}

        </div>
      </div>

      {hasObservacoes && (
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-2">Observações</h3>
          <div className="bg-muted/20 p-3 rounded-lg border">
            <p className="text-sm whitespace-pre-wrap">{notes}</p>
          </div>
        </div>
      )}

      <div className="pt-4 border-t text-xs text-muted-foreground">
        Registrado em {formatDateTimeSafe(createdAt)}
      </div>
    </ActionDetailsSheet>
  )
}
