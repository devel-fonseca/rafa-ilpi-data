import React from 'react'


import { Eye, Clock, Calendar, User } from 'lucide-react'
import { formatDateLongSafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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

export function ViewEliminacaoModal({
  open,
  onClose,
  record,
}: ViewEliminacaoModalProps) {
  if (!record) return null

  const { data, time, date, recordedBy, createdAt, notes } = record

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Eliminações - Detalhes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Registro */}
          <div className="bg-muted/30 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Data:</span>
              <span>{formatDateLongSafe(date)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Horário:</span>
              <span className="text-lg font-semibold">{time}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Registrado por:</span>
              <span>{recordedBy}</span>
            </div>
          </div>

          {/* Tipo de Eliminação */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">
              Tipo de Eliminação
            </h3>
            <Badge variant="outline" className="text-lg font-semibold">
              {data.tipo}
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
          {((data.observacoes && data.observacoes !== 'Sem observações') || notes) && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                Observações
              </h3>
              <div className="bg-muted/20 p-3 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">
                  {data.observacoes || notes}
                </p>
              </div>
            </div>
          )}

          {/* Rodapé com data de criação */}
          <div className="pt-4 border-t text-xs text-muted-foreground">
            Registrado em {formatDateTimeSafe(createdAt)}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
