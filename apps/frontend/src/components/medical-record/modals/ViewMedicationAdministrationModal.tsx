// ──────────────────────────────────────────────────────────────────────────────
//  MODAL - ViewMedicationAdministrationModal (Visualização de Administração)
// ──────────────────────────────────────────────────────────────────────────────

import { Eye, Pill, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { formatDateTimeSafe } from '@/utils/dateHelpers'
import { formatMedicationPresentation } from '@/utils/formatters'
import { Badge } from '@/components/ui/badge'
import { ActionDetailsSheet } from '@/design-system/components'
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

function formatMedicationTitle(name?: string, concentration?: string): string {
  if (!name) return 'Medicamento não especificado'
  if (!concentration) return name

  const normalizedName = name.toLowerCase()
  const normalizedConcentration = concentration.toLowerCase()

  if (normalizedName.includes(normalizedConcentration)) return name

  return `${name} ${concentration}`
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
  const statusLabel = type === 'SOS' ? 'SOS' : wasAdministered ? 'Administrado' : 'Não administrado'
  const scheduleSummary =
    type === 'SOS'
      ? actualTime
        ? `Horário ${actualTime}`
        : null
      : [scheduledTime ? `Programado ${scheduledTime}` : null, actualTime && actualTime !== scheduledTime ? `Real ${actualTime}` : null]
          .filter(Boolean)
          .join(' • ')

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      title="Administração de Medicamento - Detalhes"
      description={`${type === 'SOS' ? 'Medicação SOS' : 'Medicação de rotina'} • ${statusLabel}`}
      icon={<Eye className="h-4 w-4" />}
      summary={(
        <div className={`p-4 rounded-lg ${
          type === 'SOS'
            ? 'bg-severity-warning/5 border border-severity-warning/20'
            : wasAdministered
            ? 'bg-success/5 border border-success/20'
            : 'bg-danger/5 border border-danger/20'
        }`}>
          <div className="flex items-center gap-3">
            {type === 'SOS' ? (
              <AlertTriangle className="h-5 w-5 text-severity-warning" />
            ) : wasAdministered ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <XCircle className="h-5 w-5 text-danger" />
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
                  ? 'bg-severity-warning/5 text-severity-warning border-severity-warning/30'
                  : ''
              }`}
            >
              {type === 'SOS' ? 'SOS' : wasAdministered ? 'Administrado' : 'Não Administrado'}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            {scheduleSummary && (
              <span className="text-muted-foreground">
                {scheduleSummary}
              </span>
            )}
            <span className="text-muted-foreground">
              Registrado por: <span className="font-medium text-foreground">{administeredBy}</span>
            </span>
            {checkedBy && (
              <span className="text-muted-foreground">
                • Checado por: <span className="font-medium text-foreground">{checkedBy}</span>
              </span>
            )}
          </div>
        </div>
      )}
      bodyClassName="space-y-6"
    >

          {/* Medicamento */}
          {medication && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Pill className="h-4 w-4" />
                Medicamento
              </h3>
              <div className="rounded-lg border bg-muted/10 p-4 space-y-2">
                <p className="text-xl font-semibold leading-tight">
                  {formatMedicationTitle(medication.name, medication.concentration)}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground font-medium">{medication.dose}</span>
                  {' • '}
                  <span className="text-foreground font-medium">{medication.route}</span>
                  {medication.presentation && (
                    <>
                      {' • '}
                      <span className="text-foreground font-medium">
                        {formatMedicationPresentation(medication.presentation)}
                      </span>
                    </>
                  )}
                </p>
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
    </ActionDetailsSheet>
  )
}
