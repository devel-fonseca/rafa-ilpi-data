import React from 'react'
import { Eye, Clock, Calendar, User, Weight, Ruler } from 'lucide-react'
import { formatDateLongSafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ViewPesoModalProps {
  open: boolean
  onClose: () => void
  record: any
}

export function ViewPesoModal({
  open,
  onClose,
  record,
}: ViewPesoModalProps) {
  if (!record) return null

  const { data, time, date, recordedBy, createdAt } = record

  // Função para classificar IMC
  const getIMCClassification = (imc: number) => {
    if (imc < 18.5) return { texto: 'Baixo peso', cor: 'text-yellow-600' }
    if (imc < 25) return { texto: 'Peso normal', cor: 'text-green-600' }
    if (imc < 30) return { texto: 'Sobrepeso', cor: 'text-orange-600' }
    return { texto: 'Obesidade', cor: 'text-red-600' }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Peso e Altura - Detalhes
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

          {/* Medições */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Weight className="h-4 w-4" />
                Peso
              </h3>
              <div className="bg-muted/20 p-4 rounded-lg">
                <p className="text-2xl font-bold text-primary">
                  {data.peso} <span className="text-base font-normal text-muted-foreground">kg</span>
                </p>
              </div>
            </div>

            {data.altura && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Altura
                </h3>
                <div className="bg-muted/20 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-primary">
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
              <div className="bg-primary/10 p-4 rounded-lg border-2 border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">IMC</p>
                    <p className="text-3xl font-bold text-primary">
                      {data.imc.toFixed(1)} <span className="text-base font-normal">kg/m²</span>
                    </p>
                  </div>
                  <Badge variant="secondary" className={`text-base px-4 py-2 ${getIMCClassification(data.imc).cor}`}>
                    {getIMCClassification(data.imc).texto}
                  </Badge>
                </div>
              </div>
            </div>
          )}

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
