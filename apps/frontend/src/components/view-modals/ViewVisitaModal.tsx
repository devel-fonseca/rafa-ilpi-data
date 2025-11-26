import React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, Clock, Calendar, User, Users } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ViewVisitaModalProps {
  open: boolean
  onClose: () => void
  record: any
}

export function ViewVisitaModal({
  open,
  onClose,
  record,
}: ViewVisitaModalProps) {
  if (!record) return null

  const { data, time, date, recordedBy, createdAt, notes } = record

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visita - Detalhes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Registro */}
          <div className="bg-muted/30 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Data:</span>
              <span>{format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
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

          {/* Visitante */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Visitante
            </h3>
            <div className="bg-muted/20 p-4 rounded-lg">
              <p className="text-sm leading-relaxed">
                {data.visitante}
              </p>
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
            Registrado em {format(new Date(createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
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
