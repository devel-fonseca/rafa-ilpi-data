import { Eye } from 'lucide-react'
import { formatDateLongSafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import { ActionDetailsSheet } from '@/design-system/components'

interface ComportamentoData {
  descricao?: string
  [key: string]: unknown
}

interface ComportamentoRecord {
  data: ComportamentoData
  time: string
  date: string
  recordedBy: string
  createdAt: string
  notes?: string
  [key: string]: unknown
}

interface ViewComportamentoModalProps {
  open: boolean
  onClose: () => void
  record: ComportamentoRecord
}

const COMPORTAMENTO_OPTIONS = new Set(['Calmo', 'Ansioso', 'Triste', 'Eufórico', 'Irritado', 'Apático'])

export function ViewComportamentoModal({
  open,
  onClose,
  record,
}: ViewComportamentoModalProps) {
  if (!record) return null

  const { data, time, date, recordedBy, createdAt, notes } = record
  const hasObservacoes = Boolean(notes && String(notes).trim().length > 0)
  const descricao = String(data.descricao || '').trim()
  const isKnownType = COMPORTAMENTO_OPTIONS.has(descricao)
  const comportamentoLabel = isKnownType ? descricao : 'Outro'

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      title="Comportamento - Detalhes"
      description="Visualização completa do registro comportamental"
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

          {/* Comportamento */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">Comportamento</h3>
            <div className="bg-muted/20 p-4 rounded-lg">
              <div className="bg-muted/20 border p-4 rounded-lg">
                <p className="text-2xl font-semibold">
                  {comportamentoLabel}
                </p>
              </div>
              {!isKnownType && (
                <p className="text-sm whitespace-pre-wrap leading-relaxed mt-3 text-muted-foreground">
                  {descricao || 'Sem descrição informada'}
                </p>
              )}
            </div>
          </div>

          {/* Observações */}
          {hasObservacoes && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                Observações
              </h3>
              <div className="bg-muted/20 p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {notes}
                </p>
              </div>
            </div>
          )}

          {/* Rodapé com data de criação */}
          <div className="pt-4 border-t text-xs text-muted-foreground">
            Registrado em {formatDateTimeSafe(createdAt)}
          </div>
    </ActionDetailsSheet>
  )
}
