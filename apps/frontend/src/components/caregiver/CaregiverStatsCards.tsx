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
      <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600 dark:bg-blue-500">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">
              Total Pendente
            </p>
          </div>
        </div>
        <div className="mt-2">
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {stats?.totalPending || 0}
          </p>
          <p className="text-xs text-blue-700/70 dark:text-blue-300/70 mt-1">
            Tarefas a realizar
          </p>
        </div>
      </div>

      {/* Card: Registros Obrigatórios */}
      <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-600 dark:bg-orange-500">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-orange-700 dark:text-orange-300 uppercase tracking-wide">
              Registros Obrigatórios
            </p>
          </div>
        </div>
        <div className="mt-2">
          <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
            {stats?.recordsPending || 0}
          </p>
          <p className="text-xs text-orange-700/70 dark:text-orange-300/70 mt-1">
            Pendentes de registro
          </p>
        </div>
      </div>

      {/* Card: Medicações Agendadas */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-600 dark:bg-purple-500">
            <Pill className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wide">
              Medicações Agendadas
            </p>
          </div>
        </div>
        <div className="mt-2">
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
            {stats?.medicationsCount || 0}
          </p>
          <p className="text-xs text-purple-700/70 dark:text-purple-300/70 mt-1">
            Horários programados
          </p>
        </div>
      </div>
    </div>
  )
}
