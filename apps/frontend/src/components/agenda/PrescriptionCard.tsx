import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PrescriptionCalendarItem, PrescriptionStatus, PrescriptionType } from '@/types/agenda'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, Pill, AlertTriangle, Clock, FileText } from 'lucide-react'

interface Props {
  prescription: PrescriptionCalendarItem
  onClick?: () => void
}

export function PrescriptionCard({ prescription, onClick }: Props) {
  // Determinar cor do badge baseado no status
  const getStatusBadge = () => {
    switch (prescription.status) {
      case PrescriptionStatus.EXPIRED:
        return {
          variant: 'destructive' as const,
          label: 'Vencida',
          icon: <AlertTriangle className="h-3 w-3" />,
          className: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800',
        }
      case PrescriptionStatus.EXPIRING_SOON:
        return {
          variant: 'default' as const,
          label: `Vence em ${prescription.daysUntilExpiry} dias`,
          icon: <Clock className="h-3 w-3" />,
          className: 'bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800',
        }
      case PrescriptionStatus.NEEDS_REVIEW:
        return {
          variant: 'secondary' as const,
          label: 'Precisa revisão',
          icon: <FileText className="h-3 w-3" />,
          className: 'bg-yellow-600 text-white hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800',
        }
      case PrescriptionStatus.ACTIVE:
      default:
        return {
          variant: 'outline' as const,
          label: 'Ativa',
          icon: null,
          className: 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800',
        }
    }
  }

  // Determinar badge do tipo de prescrição
  const getTypeBadge = () => {
    switch (prescription.prescriptionType) {
      case PrescriptionType.ANTIBIOTICO:
        return {
          label: 'Antibiótico',
          className: 'bg-purple-100 text-purple-900 border-purple-400 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700',
        }
      case PrescriptionType.CONTROLADO:
        return {
          label: prescription.controlledClass ? `Controlado ${prescription.controlledClass}` : 'Controlado',
          className: 'bg-red-100 text-red-900 border-red-400 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700',
        }
      case PrescriptionType.ALTO_RISCO:
        return {
          label: 'Alto Risco',
          className: 'bg-orange-100 text-orange-900 border-orange-400 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-700',
        }
      case PrescriptionType.ALTERACAO_PONTUAL:
        return {
          label: 'Alteração Pontual',
          className: 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700',
        }
      case PrescriptionType.ROTINA:
        return {
          label: 'Rotina',
          className: 'bg-blue-100 text-blue-900 border-blue-400 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700',
        }
      case PrescriptionType.OUTRO:
      default:
        return {
          label: 'Outro',
          className: 'bg-gray-100 text-gray-900 border-gray-400 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600',
        }
    }
  }

  const statusBadge = getStatusBadge()
  const typeBadge = getTypeBadge()

  return (
    <Card
      className={`p-4 transition-all hover:shadow-lg border-2 ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''} ${
        prescription.status === PrescriptionStatus.EXPIRED
          ? 'border-red-400 bg-red-50 dark:bg-red-950/30 dark:border-red-700'
        : prescription.status === PrescriptionStatus.EXPIRING_SOON
          ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-700'
        : prescription.status === PrescriptionStatus.NEEDS_REVIEW
          ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-700'
          : 'border-border hover:border-primary/50'
      }`}
      onClick={onClick}
    >
      {/* Header com status e tipo */}
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
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
        )}
      </div>

      {/* Residente */}
      <h3 className="font-bold text-lg mb-2 truncate text-foreground">
        {prescription.residentName}
      </h3>

      {/* Informações do médico */}
      <div className="text-sm text-muted-foreground mb-3">
        <p className="truncate">
          Dr(a). {prescription.doctorName}
        </p>
        <p className="text-xs">
          CRM: {prescription.doctorCrm}
        </p>
      </div>

      {/* Medicamentos */}
      <div className="mb-3">
        <div className="flex items-center gap-1 mb-1">
          <Pill className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {prescription.medicationCount} {prescription.medicationCount === 1 ? 'medicamento' : 'medicamentos'}
          </span>
        </div>
        {prescription.medicationNames.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-0.5 ml-5">
            {prescription.medicationNames.slice(0, 3).map((med, idx) => (
              <li key={idx} className="truncate">• {med}</li>
            ))}
            {prescription.medicationNames.length > 3 && (
              <li className="text-xs italic">
                +{prescription.medicationNames.length - 3} outros
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Datas importantes */}
      <div className="border-t pt-3 space-y-1.5">
        {/* Data de prescrição */}
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">
            Prescrita em:{' '}
            <span className="font-medium text-foreground">
              {format(parseISO(prescription.prescriptionDate as string), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          </span>
        </div>

        {/* Validade (para antibióticos e controlados) */}
        {prescription.validUntil && (
          <div className="flex items-center gap-2 text-xs">
            <Clock className={`h-3.5 w-3.5 shrink-0 ${
              prescription.status === PrescriptionStatus.EXPIRED
                ? 'text-red-600 dark:text-red-400'
              : prescription.status === PrescriptionStatus.EXPIRING_SOON
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-muted-foreground'
            }`} />
            <span className="text-muted-foreground">
              Válida até:{' '}
              <span className={`font-semibold ${
                prescription.status === PrescriptionStatus.EXPIRED
                  ? 'text-red-700 dark:text-red-400'
                : prescription.status === PrescriptionStatus.EXPIRING_SOON
                  ? 'text-orange-700 dark:text-orange-400'
                  : 'text-foreground'
              }`}>
                {format(parseISO(prescription.validUntil as string), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </span>
          </div>
        )}

        {/* Data de revisão */}
        {prescription.reviewDate && (
          <div className="flex items-center gap-2 text-xs">
            <FileText className={`h-3.5 w-3.5 shrink-0 ${
              prescription.status === PrescriptionStatus.NEEDS_REVIEW
                ? 'text-yellow-700 dark:text-yellow-400'
                : 'text-muted-foreground'
            }`} />
            <span className="text-muted-foreground">
              Revisão em:{' '}
              <span className={`font-semibold ${
                prescription.status === PrescriptionStatus.NEEDS_REVIEW
                  ? 'text-yellow-700 dark:text-yellow-400'
                  : 'text-foreground'
              }`}>
                {format(parseISO(prescription.reviewDate as string), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Notas (se houver) */}
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
