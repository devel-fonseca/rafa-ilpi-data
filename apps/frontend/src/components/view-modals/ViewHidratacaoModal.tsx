import React from 'react'


import { Eye, Clock, Calendar, User, Droplet } from 'lucide-react'
import { formatDateLongSafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ViewHidratacaoModalProps {
  open: boolean
  onClose: () => void
  record: any
}

export function ViewHidratacaoModal({
  open,
  onClose,
  record,
}: ViewHidratacaoModalProps) {
  if (!record) return null

  const { data, time, date, recordedBy, createdAt, notes } = record

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Hidratação - Detalhes
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

          {/* Volume de Líquido */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <Droplet className="h-4 w-4 text-info" />
              Volume Ingerido
            </h3>
            <div className="bg-info/10 p-6 rounded-lg text-center">
              <p className="text-4xl font-bold text-info">{data.volumeMl} ml</p>
            </div>
          </div>

          {/* Tipo de Líquido */}
          {data.tipo && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                Tipo de Líquido
              </h3>
              <Badge variant="outline" className="text-sm">
                {data.tipo}
              </Badge>
            </div>
          )}

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
