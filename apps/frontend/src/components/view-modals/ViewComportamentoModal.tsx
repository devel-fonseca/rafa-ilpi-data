import React from 'react'
import { Eye, Clock, Calendar, User, Heart } from 'lucide-react'
import { formatDateLongSafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ComportamentoData {
  estadoEmocional: string
  outroEstado?: string
  observacoes?: string
  [key: string]: unknown
}

interface ComportamentoRecord {
  data: ComportamentoData
  time: string
  date: string
  recordedBy: string
  createdAt: string
  [key: string]: unknown
}

interface ViewComportamentoModalProps {
  open: boolean
  onClose: () => void
  record: ComportamentoRecord
}

export function ViewComportamentoModal({
  open,
  onClose,
  record,
}: ViewComportamentoModalProps) {
  if (!record) return null

  const { data, time, date, recordedBy, createdAt } = record

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Estado Emocional - Detalhes
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

          {/* Estado Emocional */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Estado Emocional Relatado
            </h3>
            <div className="bg-muted/20 p-4 rounded-lg">
              <Badge variant="secondary" className="text-base px-3 py-1">
                {data.estadoEmocional}
              </Badge>
              {data.estadoEmocional === 'Outro' && data.outroEstado && (
                <p className="text-sm mt-3 text-muted-foreground">
                  Especificação: <span className="font-medium text-foreground">{data.outroEstado}</span>
                </p>
              )}
            </div>
          </div>

          {/* Observações */}
          {data.observacoes && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                Observações
              </h3>
              <div className="bg-muted/20 p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {data.observacoes}
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
