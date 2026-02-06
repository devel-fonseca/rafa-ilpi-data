import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDateLongSafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import { formatMedicationPresentation } from '@/utils/formatters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Eye,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

interface ViewMedicationAdministrationModalProps {
  open: boolean
  onClose: () => void
  administration: {
    id: string
    date: string
    scheduledTime: string
    actualTime?: string
    wasAdministered: boolean
    reason?: string
    administeredBy: string
    checkedBy?: string
    notes?: string
    createdAt: string
  }
  medication: {
    name: string
    presentation: string
    concentration: string
    dose: string
    route: string
    requiresDoubleCheck: boolean
  }
}

export function ViewMedicationAdministrationModal({
  open,
  onClose,
  administration,
  medication,
}: ViewMedicationAdministrationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Administração de Medicamento - Detalhes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 1. Info do Medicamento (bg-primary/5) */}
          <div className="bg-primary/5 border border-primary/30 p-4 rounded-lg">
            <h3 className="font-semibold text-primary/95 mb-1">
              {medication.name} {medication.concentration}
            </h3>
            <p className="text-sm text-primary/80">
              {formatMedicationPresentation(medication.presentation)}
            </p>
            <p className="text-sm text-primary/80 mt-1">
              <span className="font-medium">Dose:</span> {medication.dose} -{' '}
              <span className="font-medium">Via:</span> {medication.route}
            </p>
          </div>

          {/* 2. Informações da Administração (bg-muted/30) */}
          <div className="bg-muted/30 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Data:</span>
              <span>
                {/* ✅ REFATORADO: Usar formatDateLongSafe do dateHelpers */}
                {formatDateLongSafe(administration.date)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Horário Programado:</span>
              <span className="text-lg font-semibold">
                {administration.scheduledTime}
              </span>
            </div>
            {administration.actualTime && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Horário Real:</span>
                <Badge variant="outline">{administration.actualTime}</Badge>
              </div>
            )}
          </div>

          {/* 3. Status da Administração */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">
              Status
            </h3>
            {administration.wasAdministered ? (
              <Badge
                variant="outline"
                className="text-sm bg-success/10 text-success border-success/30"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Medicamento Administrado
              </Badge>
            ) : (
              <div className="space-y-2">
                <Badge
                  variant="outline"
                  className="text-sm bg-danger/10 text-danger border-danger/30"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Não Administrado
                </Badge>
                {administration.reason && (
                  <div className="bg-danger/10 border border-danger/20 p-3 rounded">
                    <p className="text-sm font-medium text-danger mb-1">
                      Motivo:
                    </p>
                    <p className="text-sm">{administration.reason}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Profissionais Responsáveis */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Profissionais
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Administrado por
                </p>
                <p className="text-sm font-medium">
                  {administration.administeredBy}
                </p>
              </div>
              {administration.checkedBy && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Dupla Checagem
                    {medication.requiresDoubleCheck && (
                      <Badge
                        variant="outline"
                        className="ml-2 text-xs bg-warning/10 text-warning border-warning/30"
                      >
                        Obrigatório
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm font-medium">
                    {administration.checkedBy}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 5. Observações */}
          {administration.notes && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                Observações
              </h3>
              <div className="bg-muted/20 p-3 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">
                  {administration.notes}
                </p>
              </div>
            </div>
          )}

          {/* 6. Rodapé com timestamp */}
          <div className="pt-4 border-t text-xs text-muted-foreground">
            {/* ✅ REFATORADO: Usar formatDateTimeSafe do dateHelpers */}
            Registrado em {formatDateTimeSafe(administration.createdAt)}
          </div>
        </div>

        {/* Botão fechar */}
        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
