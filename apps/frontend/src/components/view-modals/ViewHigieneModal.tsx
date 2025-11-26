import React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, Clock, Calendar, User } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ViewHigieneModalProps {
  open: boolean
  onClose: () => void
  record: any
}

export function ViewHigieneModal({
  open,
  onClose,
  record,
}: ViewHigieneModalProps) {
  if (!record) return null

  const { data, time, date, recordedBy, createdAt } = record

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Higiene Corporal - Detalhes
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
          {data.observacoes && data.observacoes !== 'Sem observações' && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                Observações
              </h3>
              <div className="bg-muted/20 p-3 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{data.observacoes}</p>
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
