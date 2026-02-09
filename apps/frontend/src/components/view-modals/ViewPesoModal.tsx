import React from 'react'
import { Eye } from 'lucide-react'
import { formatDateLongSafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import { Badge } from '@/components/ui/badge'
import { ActionDetailsSheet } from '@/design-system/components'

interface PesoData {
  peso: string
  altura?: string
  imc?: number
  observacoes?: string
  [key: string]: unknown
}

interface PesoRecord {
  data: PesoData
  time: string
  date: string
  recordedBy: string
  createdAt: string
  notes?: string
  [key: string]: unknown
}

interface ViewPesoModalProps {
  open: boolean
  onClose: () => void
  record: PesoRecord
}

export function ViewPesoModal({
  open,
  onClose,
  record,
}: ViewPesoModalProps) {
  if (!record) return null

  const { data, time, date, recordedBy, createdAt, notes } = record
  const hasObservacoes =
    Boolean(data.observacoes && String(data.observacoes).trim().length > 0) ||
    Boolean(notes && String(notes).trim().length > 0)

  // Função para classificar IMC
  const getIMCClassification = (imc: number) => {
    if (imc < 18.5) return { texto: 'Baixo peso', cor: 'text-warning' }
    if (imc < 25) return { texto: 'Peso normal', cor: 'text-success' }
    if (imc < 30) return { texto: 'Sobrepeso', cor: 'text-severity-warning' }
    return { texto: 'Obesidade', cor: 'text-danger' }
  }

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      title="Peso e Altura - Detalhes"
      description="Visualização completa do registro antropométrico"
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

          {/* Medições */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">Peso</h3>
              <div className="bg-muted/20 border p-4 rounded-lg">
                <p className="text-xl font-semibold">
                  {data.peso} <span className="text-base font-normal text-muted-foreground">kg</span>
                </p>
              </div>
            </div>

            {data.altura && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">Altura</h3>
                <div className="bg-muted/20 border p-4 rounded-lg">
                  <p className="text-xl font-semibold">
                    {data.altura} <span className="text-base font-normal text-muted-foreground">cm</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* IMC */}
          {data.imc && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                Índice de Massa Corporal (IMC)
              </h3>
              <div className="bg-muted/20 border p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">IMC</p>
                    <p className="text-2xl font-semibold">
                      {data.imc.toFixed(1)} <span className="text-base font-normal">kg/m²</span>
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-sm px-3 py-1 ${getIMCClassification(data.imc).cor}`}>
                    {getIMCClassification(data.imc).texto}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Observações */}
          {hasObservacoes && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                Observações
              </h3>
              <div className="bg-muted/20 p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
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
