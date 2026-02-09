import React from 'react'


import { Eye } from 'lucide-react'
import { formatDateLongSafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import { Badge } from '@/components/ui/badge'
import { ActionDetailsSheet } from '@/design-system/components'

interface HigieneData {
  tipoBanho?: string
  duracao?: string
  higieneBucal: boolean
  trocaFralda: boolean
  quantidadeFraldas?: string
  condicaoPele?: string
  localAlteracao?: string
  hidratanteAplicado: boolean
  observacoes?: string
  [key: string]: unknown
}

interface HigieneRecord {
  data: HigieneData
  time: string
  date: string
  recordedBy: string
  createdAt: string
  notes?: string
  [key: string]: unknown
}

interface ViewHigieneModalProps {
  open: boolean
  onClose: () => void
  record: HigieneRecord
}

export function ViewHigieneModal({
  open,
  onClose,
  record,
}: ViewHigieneModalProps) {
  if (!record) return null

  const { data, time, date, recordedBy, createdAt, notes } = record
  const hasObservacoes =
    Boolean(data.observacoes && String(data.observacoes).trim().length > 0) ||
    Boolean(notes && String(notes).trim().length > 0)

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      title="Higiene Corporal - Detalhes"
      icon={<Eye className="h-4 w-4" />}
      description="Visualização completa do registro de higiene"
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
          {/* Banho e Higiene Básica */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">
              Banho e Higiene Básica
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Tipo de banho</p>
                <Badge variant="outline" className="font-normal">
                  {data.tipoBanho || 'Não informado'}
                </Badge>
              </div>

              {data.tipoBanho !== 'Sem banho' && data.duracao && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Duração</p>
                  <p className="text-sm font-medium">{data.duracao} minutos</p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Higiene bucal</p>
                <Badge variant={data.higieneBucal ? 'default' : 'outline'}>
                  {data.higieneBucal ? 'Sim' : 'Não'}
                </Badge>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Troca de fralda/roupa</p>
                <Badge variant={data.trocaFralda ? 'default' : 'outline'}>
                  {data.trocaFralda ? 'Sim' : 'Não'}
                </Badge>
              </div>

              {data.trocaFralda && data.quantidadeFraldas && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Quantidade de fraldas</p>
                  <p className="text-sm font-medium">{data.quantidadeFraldas}</p>
                </div>
              )}
            </div>
          </div>

          {/* Condição da Pele */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">
              Condição da Pele
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Condição</p>
                <Badge
                  variant={data.condicaoPele === 'Normal' ? 'default' : 'outline'}
                  className={
                    data.condicaoPele === 'Lesão' || data.condicaoPele === 'Edema'
                      ? 'border-warning text-warning'
                      : ''
                  }
                >
                  {data.condicaoPele || 'Não informado'}
                </Badge>
              </div>

              {data.localAlteracao && data.localAlteracao !== 'Sem alteração' && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Local da alteração</p>
                  <p className="text-sm">{data.localAlteracao}</p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Hidratante aplicado</p>
                <Badge variant={data.hidratanteAplicado ? 'default' : 'outline'}>
                  {data.hidratanteAplicado ? 'Sim' : 'Não'}
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
                <p className="text-sm whitespace-pre-wrap">{notes || data.observacoes}</p>
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
