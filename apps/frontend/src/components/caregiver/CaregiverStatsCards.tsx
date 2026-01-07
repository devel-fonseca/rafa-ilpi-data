import { ClipboardList, Activity, Pill } from 'lucide-react'
import type { CaregiverTasksStats } from '@/hooks/useCaregiverTasks'

interface Props {
  stats?: CaregiverTasksStats
  isLoading?: boolean
}

export function CaregiverStatsCards({ stats, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card: Total Pendente */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg p-4 border border-primary/30 dark:border-primary/80">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/60 dark:bg-primary">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-primary/80 dark:text-primary/30 uppercase tracking-wide">
              Total Pendente
            </p>
          </div>
        </div>
        <div className="mt-2">
          <p className="text-3xl font-bold text-primary/95 dark:text-primary/10">
            {stats?.totalPending || 0}
          </p>
          <p className="text-xs text-primary/80/70 dark:text-primary/30/70 mt-1">
            Tarefas a realizar
          </p>
        </div>
      </div>

      {/* Card: Registros Obrigatórios */}
      <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 rounded-lg p-4 border border-severity-warning/30 dark:border-severity-warning/80">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-severity-warning/60 dark:bg-severity-warning">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-severity-warning/80 dark:text-severity-warning/30 uppercase tracking-wide">
              Registros Obrigatórios
            </p>
          </div>
        </div>
        <div className="mt-2">
          <p className="text-3xl font-bold text-severity-warning/90 dark:text-severity-warning/10">
            {stats?.recordsPending || 0}
          </p>
          <p className="text-xs text-severity-warning/80/70 dark:text-severity-warning/30/70 mt-1">
            Pendentes de registro
          </p>
        </div>
      </div>

      {/* Card: Medicações Agendadas */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 rounded-lg p-4 border border-medication-controlled/30 dark:border-medication-controlled/90">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-600 dark:bg-medication-controlled">
            <Pill className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-medication-controlled/80 dark:text-medication-controlled/30 uppercase tracking-wide">
              Medicações Agendadas
            </p>
          </div>
        </div>
        <div className="mt-2">
          <p className="text-3xl font-bold text-medication-controlled/95 dark:text-purple-100">
            {stats?.medicationsCount || 0}
          </p>
          <p className="text-xs text-medication-controlled/80/70 dark:text-medication-controlled/30/70 mt-1">
            Horários programados
          </p>
        </div>
      </div>
    </div>
  )
}
