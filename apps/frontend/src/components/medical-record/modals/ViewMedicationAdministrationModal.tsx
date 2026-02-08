// ──────────────────────────────────────────────────────────────────────────────
//  MODAL - ViewMedicationAdministrationModal (Visualização de Administração)
// ──────────────────────────────────────────────────────────────────────────────

import { Eye, Clock, User, Pill, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { formatDateTimeSafe } from '@/utils/dateHelpers'
import { formatMedicationPresentation } from '@/utils/formatters'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { MedicationAdministration } from '../types'

// ========== HELPERS ==========

function getIndicationLabel(indication: string): string {
  const labels: Record<string, string> = {
    DOR: 'Dor',
    FEBRE: 'Febre',
    ANSIEDADE: 'Ansiedade',
    AGITACAO: 'Agitação',
    NAUSEA: 'Náusea/Vômito',
    INSONIA: 'Insônia',
    OUTRO: 'Outro',
  }
  return labels[indication] || indication
}

// ========== INTERFACE ==========

interface ViewMedicationAdministrationModalProps {
  open: boolean
  onClose: () => void
  administration: MedicationAdministration | null
}

// ========== COMPONENT ==========

export function ViewMedicationAdministrationModal({
  open,
  onClose,
  administration,
}: ViewMedicationAdministrationModalProps) {
  if (!administration) return null

  const {
    type,
    wasAdministered,
    scheduledTime,
    actualTime,
    administeredBy,
    checkedBy,
    reason,
    notes,
    indication,
    createdAt,
    medication,
  } = administration

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
          {/* Status da Administração */}
          <div className={`p-4 rounded-lg ${
            type === 'SOS'
              ? 'bg-severity-warning/10 border border-severity-warning/30'
              : wasAdministered
              ? 'bg-success/10 border border-success/30'
              : 'bg-danger/10 border border-danger/30'
          }`}>
            <div className="flex items-center gap-3">
              {type === 'SOS' ? (
                <AlertTriangle className="h-6 w-6 text-severity-warning" />
              ) : wasAdministered ? (
                <CheckCircle2 className="h-6 w-6 text-success" />
              ) : (
                <XCircle className="h-6 w-6 text-danger" />
              )}
              <div>
                <p className="font-semibold">
                  {type === 'SOS'
                    ? 'Medicação SOS'
                    : wasAdministered
                    ? 'Medicamento Administrado'
                    : 'Medicamento Não Administrado'}
                </p>
                {type === 'SOS' && indication && (
                  <p className="text-sm text-muted-foreground">
                    Indicação: {getIndicationLabel(indication)}
                  </p>
                )}
              </div>
              <Badge
                variant={type === 'SOS' ? 'outline' : wasAdministered ? 'default' : 'destructive'}
                className={`ml-auto ${
                  type === 'SOS'
                    ? 'bg-severity-warning/10 text-severity-warning border-severity-warning/30'
                    : ''
                }`}
              >
                {type === 'SOS' ? 'SOS' : wasAdministered ? 'Administrado' : 'Não Administrado'}
              </Badge>
            </div>
          </div>

          {/* Informações do Horário */}
          <div className="bg-muted/30 p-4 rounded-lg space-y-2">
            {scheduledTime && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Horário Programado:</span>
                <span className="text-lg font-semibold">{scheduledTime}</span>
              </div>
            )}
            {actualTime && actualTime !== scheduledTime && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Horário Real:</span>
                <span className="text-lg font-semibold">{actualTime}</span>
              </div>
            )}
            {type === 'SOS' && actualTime && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Horário:</span>
                <span className="text-lg font-semibold">{actualTime}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Registrado por:</span>
              <span>{administeredBy}</span>
            </div>
            {checkedBy && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Checado por:</span>
                <span>{checkedBy}</span>
              </div>
            )}
          </div>

          {/* Medicamento */}
          {medication && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Pill className="h-4 w-4" />
                Medicamento
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="text-lg font-semibold">{medication.name}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Dose</p>
                  <Badge variant="outline" className="font-normal text-sm">
                    {medication.dose}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Via</p>
                  <Badge variant="outline" className="font-normal text-sm">
                    {medication.route}
                  </Badge>
                </div>

                {medication.presentation && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-xs text-muted-foreground">Apresentação</p>
                    <p className="text-sm">{formatMedicationPresentation(medication.presentation)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Indicação SOS */}
          {type === 'SOS' && indication && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-severity-warning" />
                Indicação da Medicação SOS
              </h3>
              <div className="bg-severity-warning/10 border border-severity-warning/30 p-3 rounded-lg">
                <Badge variant="outline" className="border-severity-warning text-severity-warning">
                  {getIndicationLabel(indication)}
                </Badge>
              </div>
            </div>
          )}

          {/* Motivo (se não administrado) */}
          {!wasAdministered && reason && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-danger" />
                Motivo da Não Administração
              </h3>
              <div className="bg-danger/10 border border-danger/30 p-3 rounded-lg">
                <p className="text-sm">{reason}</p>
              </div>
            </div>
          )}

          {/* Observações */}
          {notes && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                Observações
              </h3>
              <div className="bg-muted/20 p-3 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{notes}</p>
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
