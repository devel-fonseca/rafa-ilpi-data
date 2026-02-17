import { useEffect, useMemo, useState } from 'react';
import { Loader2, Calendar, Clock, Repeat, CheckCircle2, Plus, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDailyTasksByResident } from '@/hooks/useResidentSchedule';
import { getRecordTypeLabel } from '@/utils/recordTypeLabels';

interface DailyTasksPanelProps {
  residentId: string | null;
  selectedDate: string;
  onRegisterRecord?: (recordType: string, mealType?: string) => void;
  pageSize?: number;
}

export function DailyTasksPanel({
  residentId,
  selectedDate,
  onRegisterRecord,
  pageSize = 8,
}: DailyTasksPanelProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const dateStr = selectedDate;

  const { data: tasks = [], isLoading, refetch, isFetching } = useDailyTasksByResident(
    residentId,
    dateStr,
    !!residentId, // enabled apenas se houver residentId
  );

  // Agrupar tarefas por tipo e ordenar (pendentes primeiro por horário, depois concluídas)
  const recurringTasks = useMemo(() => (
    tasks
      .filter((task) => task.type === 'RECURRING')
      .sort((a, b) => {
        // Pendentes primeiro
        if (a.isCompleted && !b.isCompleted) return 1;
        if (!a.isCompleted && b.isCompleted) return -1;

        // Se ambas pendentes, ordenar pelo horário individual (ou primeiro sugerido como fallback)
        if (!a.isCompleted && !b.isCompleted) {
          const timeA = a.scheduledTime || a.suggestedTimes?.[0] || '23:59';
          const timeB = b.scheduledTime || b.suggestedTimes?.[0] || '23:59';
          return timeA.localeCompare(timeB);
        }

        return 0;
      })
  ), [tasks]);

  useEffect(() => {
    setCurrentPage(1);
  }, [residentId, selectedDate, recurringTasks.length, pageSize]);

  const totalPages = Math.max(1, Math.ceil(recurringTasks.length / pageSize));
  const paginatedRecurringTasks = recurringTasks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  if (!residentId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-sm">Selecione um residente</p>
        <p className="text-xs mt-1">As tarefas aparecerão aqui</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-sm">Nenhuma tarefa para hoje</p>
        <p className="text-xs mt-1">Configure registros obrigatórios na aba "Agenda"</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botão de Refresh */}
      {tasks.length > 0 && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      )}

      {/* Registros Programados Recorrentes */}
      {recurringTasks.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Repeat className="h-4 w-4 text-primary dark:text-primary" />
            <h3 className="font-semibold text-sm">Registros Programados</h3>
            <Badge variant="secondary" className="ml-auto">
              {recurringTasks.length}
            </Badge>
          </div>

          <div className="max-h-[430px] overflow-y-auto pr-1 space-y-2">
            {paginatedRecurringTasks.map((task, index) => (
              <div
                key={`recurring-${task.configId}-${index}`}
                className={`p-3 border rounded-lg hover:bg-accent/50 transition-colors ${
                  task.isCompleted
                    ? 'bg-accent/20 dark:bg-accent/10 border-success/30 dark:border-success/20'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {task.isCompleted && (
                      <CheckCircle2 className="h-4 w-4 text-success dark:text-success flex-shrink-0" />
                    )}
                    <Badge
                      variant="outline"
                      className={task.isCompleted ? 'opacity-70' : 'font-medium'}
                    >
                      {task.recordType && getRecordTypeLabel(task.recordType).label}
                    </Badge>
                  </div>

                  {onRegisterRecord && task.recordType && !task.isCompleted && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => onRegisterRecord(task.recordType!, task.mealType)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Registrar
                    </Button>
                  )}
                </div>

                {(task.scheduledTime || (task.suggestedTimes && task.suggestedTimes.length > 0)) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{task.scheduledTime || task.suggestedTimes?.join(', ')}</span>
                  </div>
                )}

                {task.isCompleted && task.completedBy && (
                  <div className="flex items-center gap-1 text-xs text-success/80 dark:text-success mt-2 font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Registrado por {task.completedBy}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Mostrando {(currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, recurringTasks.length)} de {recurringTasks.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Nenhuma tarefa recorrente para hoje</p>
        </div>
      )}
    </div>
  );
}
