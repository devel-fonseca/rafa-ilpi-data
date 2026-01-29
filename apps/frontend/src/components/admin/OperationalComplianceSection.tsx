import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Pill, FileText, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ComplianceStats {
  activeResidents: number
  residentsWithSchedules: number
  medications: {
    scheduled: number
    administered: number
    total: number
  }
  mandatoryRecords: {
    expected: number
    completed: number
  }
}

interface Props {
  stats?: ComplianceStats
  isLoading?: boolean
}

export function OperationalComplianceSection({ stats, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            Situação Operacional – Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  const medicationsPercentage = stats.medications.total > 0
    ? Math.round((stats.medications.administered / stats.medications.total) * 100)
    : 0

  const recordsPercentage = stats.mandatoryRecords.expected > 0
    ? Math.round((stats.mandatoryRecords.completed / stats.mandatoryRecords.expected) * 100)
    : 0

  // Lógica de criticidade: Azul (info) → Amarelo (atenção) → Vermelho (risco)
  const getMedicationsStatus = () => {
    if (stats.medications.total === 0) return 'info' // Azul: sem medicações programadas
    if (medicationsPercentage === 100) return 'success' // Verde: tudo aplicado
    if (medicationsPercentage >= 50) return 'warning' // Amarelo: atenção (50%+)
    return 'danger' // Vermelho: risco crítico (<50%)
  }

  const getRecordsStatus = () => {
    if (stats.mandatoryRecords.expected === 0) return 'info' // Azul: sem registros esperados
    if (recordsPercentage === 100) return 'success' // Verde: tudo concluído
    if (recordsPercentage >= 50) return 'warning' // Amarelo: atenção (50%+)
    return 'danger' // Vermelho: risco crítico (<50%)
  }

  const medicationsStatus = getMedicationsStatus()
  const recordsStatus = getRecordsStatus()

  // Helper: obter classes CSS baseadas no status
  const getStatusClasses = (status: 'info' | 'success' | 'warning' | 'danger') => {
    const classes = {
      info: {
        bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/30',
        border: 'border-primary/30 dark:border-primary/50',
        iconBg: 'bg-primary/60 dark:bg-primary/80',
        text: 'text-primary dark:text-primary',
        textLight: 'text-primary/80 dark:text-primary/90',
        icon: CheckCircle2,
      },
      success: {
        bg: 'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/40 dark:to-green-900/30',
        border: 'border-success/30 dark:border-success/50',
        iconBg: 'bg-success/60 dark:bg-success/80',
        text: 'text-success dark:text-success',
        textLight: 'text-success/80 dark:text-success/90',
        icon: CheckCircle2,
      },
      warning: {
        bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/30',
        border: 'border-severity-warning/30 dark:border-severity-warning/50',
        iconBg: 'bg-severity-warning/60 dark:bg-severity-warning/80',
        text: 'text-severity-warning dark:text-severity-warning',
        textLight: 'text-severity-warning/80 dark:text-severity-warning/90',
        icon: AlertTriangle,
      },
      danger: {
        bg: 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/40 dark:to-red-900/30',
        border: 'border-destructive/30 dark:border-destructive/50',
        iconBg: 'bg-destructive/60 dark:bg-destructive/80',
        text: 'text-destructive dark:text-destructive',
        textLight: 'text-destructive/80 dark:text-destructive/90',
        icon: XCircle,
      },
    }
    return classes[status]
  }

  const medicationsClasses = getStatusClasses(medicationsStatus)
  const recordsClasses = getStatusClasses(recordsStatus)
  const MedicationsIcon = medicationsClasses.icon
  const RecordsIcon = recordsClasses.icon

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">
          Situação Operacional – Hoje
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card: Residentes */}
          <div className="bg-card rounded-lg p-4 border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                <Users className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Residentes
                </p>
              </div>
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/60 dark:bg-primary/80">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">
                  {stats.activeResidents}
                </span>
                <span className="text-sm font-medium ml-1 text-muted-foreground">
                  ativos
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {stats.residentsWithSchedules} {stats.residentsWithSchedules === 1 ? 'residente' : 'residentes'} com rotinas programadas.
                </p>
              </div>
            </div>
          </div>

          {/* Card: Medicações */}
          <div className="bg-card rounded-lg p-4 border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                <Pill className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Medicações
                </p>
              </div>
              <div className={cn("flex items-center justify-center w-6 h-6 rounded-full", medicationsClasses.iconBg)}>
                <MedicationsIcon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">
                  {stats.medications.total > 0 ? `${medicationsPercentage}%` : '0%'}
                </span>
                <span className="text-sm font-medium ml-1 text-muted-foreground">
                  registrado
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold">Programadas:</span> {stats.medications.scheduled} • <span className="font-semibold">Aplicadas:</span> {stats.medications.administered}
                </p>
              </div>
            </div>
          </div>

          {/* Card: Registros obrigatórios */}
          <div className="bg-card rounded-lg p-4 border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                <FileText className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Registros obrigatórios
                </p>
              </div>
              <div className={cn("flex items-center justify-center w-6 h-6 rounded-full", recordsClasses.iconBg)}>
                <RecordsIcon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">
                  {stats.mandatoryRecords.expected > 0 ? `${recordsPercentage}%` : '0%'}
                </span>
                <span className="text-sm font-medium ml-1 text-muted-foreground">
                  concluídos
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold">Concluídos:</span> {stats.mandatoryRecords.completed} / {stats.mandatoryRecords.expected}  <span className="font-semibold">• Pendentes:</span> {stats.mandatoryRecords.expected - stats.mandatoryRecords.completed}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
