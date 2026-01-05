import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useState } from 'react'
import { AgendaItem, CONTENT_FILTER_ICONS, CONTENT_FILTER_COLORS, STATUS_BADGES } from '@/types/agenda'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Clock, User } from 'lucide-react'

interface Props {
  item: AgendaItem
}

export function AgendaItemCard({ item }: Props) {
  const [showDetails, setShowDetails] = useState(false)

  const colors = CONTENT_FILTER_COLORS[item.category as keyof typeof CONTENT_FILTER_COLORS]
  const statusBadge = STATUS_BADGES[item.status]
  const icon = CONTENT_FILTER_ICONS[item.category as keyof typeof CONTENT_FILTER_ICONS]

  return (
    <>
      <Card
        className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${colors?.border} border-l-4`}
        onClick={() => setShowDetails(true)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{icon}</span>
              <p className="font-medium text-sm truncate">{item.title}</p>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Clock className="h-3 w-3" />
              <span>{item.scheduledTime}</span>
              <span className="text-xs text-muted-foreground">• {item.residentName}</span>
            </div>

            {item.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
            )}

            {item.status === 'completed' && item.completedBy && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{item.completedBy}</span>
              </div>
            )}
          </div>

          <Badge className={`${statusBadge.bg} ${statusBadge.text} text-xs shrink-0`}>
            {statusBadge.label}
          </Badge>
        </div>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{icon}</span>
              <span>{item.title}</span>
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-3 mt-4">
                <div>
                  <p className="text-sm font-semibold">Horário Agendado</p>
                  <p className="text-sm">{item.scheduledTime}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold">Residente</p>
                  <p className="text-sm">{item.residentName}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold">Status</p>
                  <Badge className={`${statusBadge.bg} ${statusBadge.text} text-xs`}>
                    {statusBadge.label}
                  </Badge>
                </div>

                {item.description && (
                  <div>
                    <p className="text-sm font-semibold">Descrição</p>
                    <p className="text-sm">{item.description}</p>
                  </div>
                )}

                {item.medicationName && (
                  <div>
                    <p className="text-sm font-semibold">Medicamento</p>
                    <p className="text-sm">{item.medicationName}</p>
                    {item.dosage && <p className="text-xs text-muted-foreground">{item.dosage}</p>}
                  </div>
                )}

                {item.status === 'completed' && (
                  <div>
                    <p className="text-sm font-semibold">Concluído em</p>
                    <p className="text-sm">
                      {item.completedAt &&
                        format(new Date(item.completedAt), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
                    </p>
                    {item.completedBy && (
                      <p className="text-xs text-muted-foreground">Por: {item.completedBy}</p>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground italic">
                    Funcionalidade de registro/edição será implementada em breve.
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}
