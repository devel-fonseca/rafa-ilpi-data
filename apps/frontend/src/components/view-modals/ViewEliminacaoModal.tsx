import React from 'react'


import { Eye } from 'lucide-react'
import { formatDateLongSafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import { Badge } from '@/components/ui/badge'
import { ActionDetailsSheet } from '@/design-system/components'

interface EliminacaoData {
  tipo: string
  consistencia?: string
  cor?: string
  odor?: string
  volume?: string
  trocaFralda: boolean
  observacoes?: string
  [key: string]: unknown
}

interface EliminacaoRecord {
  data: EliminacaoData
  time: string
  date: string
  recordedBy: string
  createdAt: string
  notes?: string
  [key: string]: unknown
}

interface ViewEliminacaoModalProps {
  open: boolean
  onClose: () => void
  record: EliminacaoRecord
}

function getEliminationTypeLabel(type?: string): string {
  if (type === 'Fezes') return 'Eliminação Intestinal'
  if (type === 'Urina') return 'Eliminação Urinária'
  return type || 'Tipo não informado'
}

export function ViewEliminacaoModal({
  open,
  onClose,
  record,
}: ViewEliminacaoModalProps) {
  if (!record) return null

  const { data, time, date, recordedBy, createdAt, notes } = record
  const hasObservacoes =
    Boolean(data.observacoes && String(data.observacoes).trim().length > 0) ||
    Boolean(notes && String(notes).trim().length > 0)

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      title="Eliminações - Detalhes"
      description="Visualização completa do registro de eliminação"
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

          {/* Tipo de Eliminação */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">
              Tipo de Eliminação
            </h3>
            <Badge variant="outline" className="font-normal">
              {getEliminationTypeLabel(data.tipo)}
            </Badge>
          </div>

          {/* Características */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">
              Características
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Consistência (apenas para Fezes) */}
              {data.tipo === 'Fezes' && data.consistencia && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Consistência</p>
                  <Badge variant="outline">{data.consistencia}</Badge>
                </div>
              )}

              {/* Cor */}
              {data.cor && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Cor</p>
                  <Badge
                    variant="outline"
                    className={
                      data.cor.includes('atenção')
                        ? 'border-warning text-warning'
                        : ''
                    }
                  >
                    {data.cor}
                  </Badge>
                </div>
              )}

              {/* Odor (apenas para Urina) */}
              {data.tipo === 'Urina' && data.odor && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Odor</p>
                  <Badge variant="outline">{data.odor}</Badge>
                </div>
              )}

              {/* Volume */}
              {data.volume && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Volume</p>
                  <Badge variant="outline">{data.volume}</Badge>
                </div>
              )}

              {/* Troca de Fralda */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Troca de fralda/roupa</p>
                <Badge variant={data.trocaFralda ? 'default' : 'outline'}>
                  {data.trocaFralda ? 'Sim' : 'Não'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Observações */}
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

          {/* Rodapé com data de criação */}
          <div className="pt-4 border-t text-xs text-muted-foreground">
            Registrado em {formatDateTimeSafe(createdAt)}
          </div>
    </ActionDetailsSheet>
  )
}
