import React from 'react'


import { Eye, Clock, Calendar, User, Activity, Thermometer, Heart, Wind, Droplets } from 'lucide-react'
import { formatDateLongSafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ViewMonitoramentoModalProps {
  open: boolean
  onClose: () => void
  record: any
}

export function ViewMonitoramentoModal({
  open,
  onClose,
  record,
}: ViewMonitoramentoModalProps) {
  if (!record) return null

  const { data, time, date, recordedBy, createdAt, notes } = record

  // Helper para verificar se algum valor está presente
  const hasVitalSign = (value: any) => value !== undefined && value !== null && value !== ''

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Monitoramento Vital - Detalhes
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

          {/* Sinais Vitais */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Sinais Vitais
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Pressão Arterial */}
              {hasVitalSign(data.pressaoArterial) && (
                <div className="bg-danger/5 border border-danger/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-4 w-4 text-danger" />
                    <span className="text-xs text-muted-foreground">Pressão Arterial</span>
                  </div>
                  <p className="text-2xl font-bold text-danger">{data.pressaoArterial}</p>
                  <p className="text-xs text-muted-foreground mt-1">mmHg</p>
                </div>
              )}

              {/* Temperatura */}
              {hasVitalSign(data.temperatura) && (
                <div className="bg-warning/5 border border-warning/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Thermometer className="h-4 w-4 text-warning" />
                    <span className="text-xs text-muted-foreground">Temperatura</span>
                  </div>
                  <p className="text-2xl font-bold text-warning">{data.temperatura}</p>
                  <p className="text-xs text-muted-foreground mt-1">°C</p>
                </div>
              )}

              {/* Frequência Cardíaca */}
              {hasVitalSign(data.frequenciaCardiaca) && (
                <div className="bg-danger/5 border border-danger/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-4 w-4 text-danger" />
                    <span className="text-xs text-muted-foreground">Frequência Cardíaca</span>
                  </div>
                  <p className="text-2xl font-bold text-danger">{data.frequenciaCardiaca}</p>
                  <p className="text-xs text-muted-foreground mt-1">bpm</p>
                </div>
              )}

              {/* Saturação O2 */}
              {hasVitalSign(data.saturacaoO2) && (
                <div className="bg-info/5 border border-info/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind className="h-4 w-4 text-info" />
                    <span className="text-xs text-muted-foreground">Saturação O₂</span>
                  </div>
                  <p className="text-2xl font-bold text-info">{data.saturacaoO2}</p>
                  <p className="text-xs text-muted-foreground mt-1">%</p>
                </div>
              )}

              {/* Glicemia */}
              {hasVitalSign(data.glicemia) && (
                <div className="bg-success/5 border border-success/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="h-4 w-4 text-success" />
                    <span className="text-xs text-muted-foreground">Glicemia</span>
                  </div>
                  <p className="text-2xl font-bold text-success">{data.glicemia}</p>
                  <p className="text-xs text-muted-foreground mt-1">mg/dL</p>
                </div>
              )}
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
