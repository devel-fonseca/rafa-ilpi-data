import React from 'react'


import { Eye, Clock, Calendar, User, Utensils, Droplet, AlertTriangle } from 'lucide-react'
import { formatDateLongSafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AlimentacaoData {
  refeicao: string
  cardapio?: string
  consistencia: string
  ingeriu: string
  auxilioNecessario: boolean
  volumeMl?: string
  intercorrencia?: string
  observacoes?: string
  [key: string]: unknown
}

interface AlimentacaoRecord {
  data: AlimentacaoData
  time: string
  date: string
  recordedBy: string
  createdAt: string
  notes?: string
  [key: string]: unknown
}

interface ViewAlimentacaoModalProps {
  open: boolean
  onClose: () => void
  record: AlimentacaoRecord
}

export function ViewAlimentacaoModal({
  open,
  onClose,
  record,
}: ViewAlimentacaoModalProps) {
  if (!record) return null

  const { data, time, date, recordedBy, createdAt, notes } = record

  // Determinar cor baseada na ingestão
  const getIngestaoColor = (ingeriu: string) => {
    switch (ingeriu) {
      case '100%':
        return 'bg-success/10 text-success border-success'
      case '75%':
        return 'bg-success/10 text-success border-success'
      case '50%':
        return 'bg-warning/10 text-warning border-warning'
      case '<25%':
        return 'bg-danger/10 text-danger border-danger'
      case 'Recusou':
        return 'bg-danger/10 text-danger border-danger'
      default:
        return ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Alimentação - Detalhes
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

          {/* Refeição */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              Refeição
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Tipo</p>
                <Badge variant="outline" className="font-normal text-sm">
                  {data.refeicao}
                </Badge>
              </div>

              {data.cardapio && (
                <div className="space-y-1 col-span-2">
                  <p className="text-xs text-muted-foreground">Cardápio</p>
                  <p className="text-sm">{data.cardapio}</p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Consistência</p>
                <Badge variant="outline">{data.consistencia}</Badge>
              </div>
            </div>
          </div>

          {/* Aceitação Alimentar */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">
              Aceitação Alimentar
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Ingestão</p>
                <Badge
                  variant="outline"
                  className={`text-lg font-semibold ${getIngestaoColor(data.ingeriu)}`}
                >
                  {data.ingeriu}
                </Badge>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Auxílio necessário</p>
                <Badge variant={data.auxilioNecessario ? 'default' : 'outline'}>
                  {data.auxilioNecessario ? 'Sim' : 'Não'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Hidratação */}
          {data.volumeMl && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Droplet className="h-4 w-4" />
                Hidratação durante a refeição
              </h3>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Volume</p>
                <p className="text-2xl font-bold text-info">{data.volumeMl} ml</p>
              </div>
            </div>
          )}

          {/* Intercorrência */}
          {data.intercorrencia && data.intercorrencia !== 'Nenhuma' && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Intercorrência
              </h3>
              <Badge variant="outline" className="border-warning text-warning">
                {data.intercorrencia}
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
