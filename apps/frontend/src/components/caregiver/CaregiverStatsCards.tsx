import { Activity, Pill, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CaregiverTasksStats } from '@/hooks/useCaregiverTasks'

interface Props {
  stats?: CaregiverTasksStats
  isLoading?: boolean
}

export function CaregiverStatsCards({ stats, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (!stats) {
    return null
  }

  // Lógica de criticidade para Registros Programados
  const getRecordsPendingStatus = () => {
    if (stats.recordsPending === 0) return 'success' // Verde: tudo registrado
    if (stats.recordsPending <= 3) return 'info' // Azul: poucos pendentes
    if (stats.recordsPending <= 10) return 'warning' // Amarelo: atenção
    return 'danger' // Vermelho: muitos registros pendentes
  }

  // Lógica de criticidade para Medicações
  const getMedicationsStatus = () => {
    if (stats.medicationsCount === 0) return 'info' // Azul: sem medicações
    if (stats.medicationsCount <= 5) return 'success' // Verde: poucas medicações
    if (stats.medicationsCount <= 15) return 'warning' // Amarelo: atenção
    return 'danger' // Vermelho: muitas medicações pendentes
  }

  const recordsPendingStatus = getRecordsPendingStatus()
  const medicationsStatus = getMedicationsStatus()

  // Helper: obter classes CSS baseadas no status
  const getStatusClasses = (status: 'info' | 'success' | 'warning' | 'danger') => {
    const classes = {
      info: {
        iconBg: 'bg-primary/60 dark:bg-primary/80',
        icon: CheckCircle2,
      },
      success: {
        iconBg: 'bg-success/60 dark:bg-success/80',
        icon: CheckCircle2,
      },
      warning: {
        iconBg: 'bg-severity-warning/60 dark:bg-severity-warning/80',
        icon: AlertTriangle,
      },
      danger: {
        iconBg: 'bg-destructive/60 dark:bg-destructive/80',
        icon: AlertTriangle,
      },
    }
    return classes[status]
  }

  const recordsPendingClasses = getStatusClasses(recordsPendingStatus)
  const medicationsClasses = getStatusClasses(medicationsStatus)

  const RecordsPendingIcon = recordsPendingClasses.icon
  const MedicationsIcon = medicationsClasses.icon

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Card: Registros Programados */}
      <div className="bg-card rounded-lg p-4 border border-border min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                <Activity className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground break-words">
                  Registros Programados
                </p>
              </div>
              <div className={cn("flex items-center justify-center w-6 h-6 rounded-full", recordsPendingClasses.iconBg)}>
                <RecordsPendingIcon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-bold text-foreground leading-none">
                  {stats.recordsPending}
                </span>
                <span className="text-sm font-medium ml-1 text-muted-foreground">
                  pendentes
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-border">
                {stats.recordsPending > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Priorize itens vencidos e depois os do próximo horário.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Todos os registros programados foram concluídos.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Card: Medicações Agendadas */}
          <div className="bg-card rounded-lg p-4 border border-border min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                <Pill className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground break-words">
                  Medicações Agendadas
                </p>
              </div>
              <div className={cn("flex items-center justify-center w-6 h-6 rounded-full", medicationsClasses.iconBg)}>
                <MedicationsIcon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-bold text-foreground leading-none">
                  {stats.medicationsCount}
                </span>
                <span className="text-sm font-medium ml-1 text-muted-foreground">
                  programadas
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-border">
                {stats.medicationsCount > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Registre a administração assim que concluída.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Todas as medicações foram administradas.
                  </p>
                )}
              </div>
            </div>
      </div>
    </div>
  )
}
