import React from 'react'


import { Eye, Clock, Calendar, User, AlertTriangle, FileText } from 'lucide-react'
import { formatDateLongSafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ViewIntercorrenciaModalProps {
  open: boolean
  onClose: () => void
  record: any
}

export function ViewIntercorrenciaModal({
  open,
  onClose,
  record,
}: ViewIntercorrenciaModalProps) {
  if (!record) return null

  const { data, time, date, recordedBy, createdAt } = record

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Intercorrência - Detalhes
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

          {/* Descrição da Intercorrência */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Descrição
            </h3>
            <div className="bg-warning/10 border border-warning/20 p-4 rounded-lg">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {data.descricao}
              </p>
            </div>
          </div>

          {/* Ação Tomada */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Ação Tomada
            </h3>
            <div className="bg-muted/20 p-4 rounded-lg">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {data.acaoTomada}
              </p>
            </div>
          </div>

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
