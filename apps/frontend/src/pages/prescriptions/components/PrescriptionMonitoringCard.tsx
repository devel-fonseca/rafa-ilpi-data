import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, Pill, AlertTriangle, Clock, FileText } from 'lucide-react'
import { extractDateOnly } from '@/utils/dateHelpers'
import { PrescriptionMonitoringItem, PrescriptionMonitoringStatus } from '@/types/prescription-monitoring'

interface Props {
  prescription: PrescriptionMonitoringItem
  onClick?: () => void
}

export function PrescriptionMonitoringCard({ prescription, onClick }: Props) {
  const getStatusBadge = () => {
    switch (prescription.status) {
      case PrescriptionMonitoringStatus.EXPIRED:
        return {
          variant: 'destructive' as const,
          label: 'Vencida',
          icon: <AlertTriangle className="h-3 w-3" />,
          className: 'bg-danger/60 text-white hover:bg-danger/70 dark:bg-danger/70 dark:hover:bg-red-800',
        }
      case PrescriptionMonitoringStatus.EXPIRING_SOON:
        return {
          variant: 'default' as const,
          label: `Vence em ${prescription.daysUntilExpiry} dias`,
          icon: <Clock className="h-3 w-3" />,
          className:
            'bg-severity-warning/60 text-white hover:bg-severity-warning/70 dark:bg-severity-warning/70 dark:hover:bg-orange-800',
        }
      case PrescriptionMonitoringStatus.NEEDS_REVIEW:
        return {
          variant: 'secondary' as const,
          label: 'Precisa revisão',
          icon: <FileText className="h-3 w-3" />,
          className: 'bg-warning/60 text-white hover:bg-warning/70 dark:bg-warning/70 dark:hover:bg-yellow-800',
        }
      case PrescriptionMonitoringStatus.ACTIVE:
      default:
        return {
          variant: 'outline' as const,
          label: 'Ativa',
          icon: null,
          className: 'bg-success/60 text-white hover:bg-success/70 dark:bg-success/70 dark:hover:bg-green-800',
        }
    }
  }

  const getTypeBadge = () => {
    switch (prescription.prescriptionType) {
      case 'ANTIBIOTICO':
        return {
          label: 'Antibiótico',
          className:
            'bg-medication-controlled/10 text-medication-controlled/95 border-medication-controlled/40 dark:bg-purple-900/40 dark:text-purple-200 dark:border-medication-controlled/70',
        }
      case 'CONTROLADO':
        return {
          label: prescription.controlledClass
            ? `Controlado ${prescription.controlledClass}`
            : 'Controlado',
          className:
            'bg-danger/10 text-danger/90 border-danger/40 dark:bg-danger/40 dark:text-danger dark:border-danger/50',
        }
      case 'ALTO_RISCO':
        return {
          label: 'Alto Risco',
          className:
            'bg-severity-warning/10 text-severity-warning/90 border-severity-warning/40 dark:bg-orange-900/40 dark:text-orange-200 dark:border-severity-warning/70',
        }
      case 'ALTERACAO_PONTUAL':
        return {
          label: 'Alteração Pontual',
          className:
            'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700',
        }
      case 'ROTINA':
        return {
          label: 'Rotina',
          className:
            'bg-primary/10 text-primary/95 border-primary/40 dark:bg-primary/40 dark:text-blue-200 dark:border-primary/50',
        }
      case 'OUTRO':
      default:
        return {
          label: 'Outro',
          className:
            'bg-muted text-foreground border-border/40 dark:bg-gray-800 dark:text-gray-200 dark:border-border/60',
        }
    }
  }

  const statusBadge = getStatusBadge()
  const typeBadge = getTypeBadge()

  return (
    <Card
      className={`p-4 transition-all hover:shadow-lg border-2 ${
        onClick ? 'cursor-pointer hover:scale-[1.02]' : ''
      } ${
        prescription.status === PrescriptionMonitoringStatus.EXPIRED
          ? 'border-danger/40 bg-danger/5 dark:bg-danger/30 dark:border-danger/50'
          : prescription.status === PrescriptionMonitoringStatus.EXPIRING_SOON
            ? 'border-severity-warning/40 bg-severity-warning/5 dark:bg-severity-warning/30 dark:border-severity-warning/50'
            : prescription.status === PrescriptionMonitoringStatus.NEEDS_REVIEW
              ? 'border-warning/40 bg-warning/5 dark:bg-warning/30 dark:border-warning/50'
              : 'border-border hover:border-primary/50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={statusBadge.variant} className={`${statusBadge.className} font-medium`}>
            {statusBadge.icon}
            <span className="ml-1">{statusBadge.label}</span>
          </Badge>
          <Badge variant="outline" className={`${typeBadge.className} font-medium border`}>
            {typeBadge.label}
          </Badge>
        </div>
        {prescription.isControlled && (
          <AlertTriangle className="h-4 w-4 text-danger dark:text-danger shrink-0" />
        )}
      </div>

      <h3 className="font-bold text-lg mb-2 truncate text-foreground">{prescription.residentName}</h3>

      <div className="text-sm text-muted-foreground mb-3">
        <p className="truncate">Dr(a). {prescription.doctorName}</p>
        <p className="text-xs">CRM: {prescription.doctorCrm}</p>
      </div>

      <div className="mb-3">
        <div className="flex items-center gap-1 mb-1">
          <Pill className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {prescription.medicationCount}{' '}
            {prescription.medicationCount === 1 ? 'medicamento' : 'medicamentos'}
          </span>
        </div>
        {prescription.medicationNames.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-0.5 ml-5">
            {prescription.medicationNames.slice(0, 3).map((med, idx) => (
              <li key={idx} className="truncate">
                • {med}
              </li>
            ))}
            {prescription.medicationNames.length > 3 && (
              <li className="text-xs italic">+{prescription.medicationNames.length - 3} outros</li>
            )}
          </ul>
        )}
      </div>

      <div className="border-t pt-3 space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">
            Prescrita em:{' '}
            <span className="font-medium text-foreground">
              {format(
                new Date(extractDateOnly(prescription.prescriptionDate as string) + 'T12:00:00'),
                'dd/MM/yyyy',
                { locale: ptBR },
              )}
            </span>
          </span>
        </div>

        {prescription.validUntil && (
          <div className="flex items-center gap-2 text-xs">
            <Clock
              className={`h-3.5 w-3.5 shrink-0 ${
                prescription.status === PrescriptionMonitoringStatus.EXPIRED
                  ? 'text-danger dark:text-danger'
                  : prescription.status === PrescriptionMonitoringStatus.EXPIRING_SOON
                    ? 'text-severity-warning dark:text-severity-warning'
                    : 'text-muted-foreground'
              }`}
            />
            <span className="text-muted-foreground">
              Válida até:{' '}
              <span
                className={`font-semibold ${
                  prescription.status === PrescriptionMonitoringStatus.EXPIRED
                    ? 'text-danger/80 dark:text-danger'
                    : prescription.status === PrescriptionMonitoringStatus.EXPIRING_SOON
                      ? 'text-severity-warning/80 dark:text-severity-warning'
                      : 'text-foreground'
                }`}
              >
                {format(
                  new Date(extractDateOnly(prescription.validUntil as string) + 'T12:00:00'),
                  'dd/MM/yyyy',
                  { locale: ptBR },
                )}
              </span>
            </span>
          </div>
        )}

        {prescription.reviewDate && (
          <div className="flex items-center gap-2 text-xs">
            <FileText
              className={`h-3.5 w-3.5 shrink-0 ${
                prescription.status === PrescriptionMonitoringStatus.NEEDS_REVIEW
                  ? 'text-warning/80 dark:text-warning'
                  : 'text-muted-foreground'
              }`}
            />
            <span className="text-muted-foreground">
              Revisão em:{' '}
              <span
                className={`font-semibold ${
                  prescription.status === PrescriptionMonitoringStatus.NEEDS_REVIEW
                    ? 'text-warning/80 dark:text-warning'
                    : 'text-foreground'
                }`}
              >
                {format(
                  new Date(extractDateOnly(prescription.reviewDate as string) + 'T12:00:00'),
                  'dd/MM/yyyy',
                  { locale: ptBR },
                )}
              </span>
            </span>
          </div>
        )}
      </div>

      {prescription.notes && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground line-clamp-2">
            <span className="font-medium">Obs:</span> {prescription.notes}
          </p>
        </div>
      )}
    </Card>
  )
}
