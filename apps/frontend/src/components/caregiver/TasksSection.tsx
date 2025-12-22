import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Droplets,
  Utensils,
  Bath,
  Activity,
  Trash2,
  Smile,
  Moon,
  Weight,
  AlertTriangle,
  Dribbble,
  Calendar,
  FileText,
  CheckCircle2,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { DailyTask } from '@/hooks/useResidentSchedule'

// ──────────────────────────────────────────────────────────────────────────
// ÍCONES POR TIPO DE REGISTRO
// ──────────────────────────────────────────────────────────────────────────

const RECORD_TYPE_CONFIG: Record<
  string,
  { icon: typeof Bath; label: string; color: string }
> = {
  HIGIENE: {
    icon: Bath,
    label: 'Higiene',
    color: 'text-blue-600 dark:text-blue-400',
  },
  ALIMENTACAO: {
    icon: Utensils,
    label: 'Alimentação',
    color: 'text-green-600 dark:text-green-400',
  },
  HIDRATACAO: {
    icon: Droplets,
    label: 'Hidratação',
    color: 'text-cyan-600 dark:text-cyan-400',
  },
  MONITORAMENTO: {
    icon: Activity,
    label: 'Sinais Vitais',
    color: 'text-red-600 dark:text-red-400',
  },
  ELIMINACAO: {
    icon: Trash2,
    label: 'Eliminação',
    color: 'text-amber-600 dark:text-amber-400',
  },
  COMPORTAMENTO: {
    icon: Smile,
    label: 'Comportamento',
    color: 'text-purple-600 dark:text-purple-400',
  },
  HUMOR: {
    icon: Smile,
    label: 'Humor',
    color: 'text-pink-600 dark:text-pink-400',
  },
  SONO: {
    icon: Moon,
    label: 'Sono',
    color: 'text-indigo-600 dark:text-indigo-400',
  },
  PESO: {
    icon: Weight,
    label: 'Peso',
    color: 'text-muted-foreground',
  },
  INTERCORRENCIA: {
    icon: AlertTriangle,
    label: 'Intercorrência',
    color: 'text-destructive',
  },
  ATIVIDADES: {
    icon: Dribbble,
    label: 'Atividades',
    color: 'text-teal-600 dark:text-teal-400',
  },
  VISITA: {
    icon: Calendar,
    label: 'Visita',
    color: 'text-violet-600 dark:text-violet-400',
  },
  OUTROS: {
    icon: FileText,
    label: 'Outros',
    color: 'text-muted-foreground',
  },
}

// ──────────────────────────────────────────────────────────────────────────
// PROPS
// ──────────────────────────────────────────────────────────────────────────

interface Props {
  title: string
  tasks: DailyTask[]
  onRegister: (
    residentId: string,
    recordType: string,
    mealType?: string,
  ) => void
  onViewResident: (residentId: string) => void
  isLoading?: boolean
}

// ──────────────────────────────────────────────────────────────────────────
// COMPONENTE
// ──────────────────────────────────────────────────────────────────────────

export function TasksSection({
  title,
  tasks,
  onRegister,
  onViewResident,
  isLoading,
}: Props) {
  // Estado de paginação
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filtrar apenas tarefas pendentes (mesma lógica do DailyTasksPanel mas filtrando em vez de ordenar)
  const pendingTasks = tasks.filter((task) => !task.isCompleted)

  // Ordenar tarefas pendentes por horário sugerido
  const sortedTasks = [...pendingTasks].sort((a, b) => {
    const timeA = a.suggestedTimes?.[0] || '99:99'
    const timeB = b.suggestedTimes?.[0] || '99:99'
    return timeA.localeCompare(timeB)
  })

  // Calcular paginação
  const totalPages = Math.ceil(sortedTasks.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTasks = sortedTasks.slice(startIndex, endIndex)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3" />
            <p>Nenhuma tarefa obrigatória para hoje</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {tasks.filter((t) => !t.isCompleted).length} pendentes de{' '}
          {tasks.length}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {paginatedTasks.map((task, index) => {
            const config =
              RECORD_TYPE_CONFIG[task.recordType || 'OUTROS'] ||
              RECORD_TYPE_CONFIG.OUTROS
            const Icon = config.icon

            return (
              <div
                key={`${task.residentId}-${task.recordType}-${index}`}
                className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                  task.isCompleted
                    ? 'bg-muted/50 border-border'
                    : 'bg-card border-border hover:border-primary'
                }`}
              >
                {/* Icon + Time */}
                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                      task.isCompleted ? 'bg-muted' : 'bg-muted/50'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        task.isCompleted ? 'text-muted-foreground' : config.color
                      }`}
                    />
                  </div>
                  {task.suggestedTimes && task.suggestedTimes.length > 0 && (
                    <span className="text-sm font-medium text-muted-foreground min-w-[3rem]">
                      {task.suggestedTimes[0]}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium truncate ${
                        task.isCompleted ? 'text-muted-foreground' : 'text-foreground'
                      }`}
                    >
                      {config.label}
                      {task.mealType && ` - ${task.mealType}`}
                    </span>
                    {task.isCompleted && (
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {task.residentName}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!task.isCompleted && (
                    <Button
                      size="sm"
                      onClick={() =>
                        onRegister(
                          task.residentId,
                          task.recordType!,
                          task.mealType,
                        )
                      }
                    >
                      Registrar
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewResident(task.residentId)}
                    className="px-2"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Controles de paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1}-
              {Math.min(endIndex, sortedTasks.length)} de {sortedTasks.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
