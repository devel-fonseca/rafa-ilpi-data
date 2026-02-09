import { Loader2, Calendar, Clock, Repeat, CheckCircle2, Plus, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDailyTasksByResident } from '@/hooks/useResidentSchedule';
import { getRecordTypeLabel } from '@/utils/recordTypeLabels';

interface DailyTasksPanelProps {
  residentId: string | null;
  selectedDate: string;
  onRegisterRecord?: (recordType: string, mealType?: string) => void;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  VACCINATION: 'Vacinação',
  CONSULTATION: 'Consulta',
  EXAM: 'Exame',
  PROCEDURE: 'Procedimento',
  OTHER: 'Outro',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  SCHEDULED: 'default',
  COMPLETED: 'secondary',
  CANCELLED: 'outline',
  MISSED: 'destructive',
};

export function DailyTasksPanel({ residentId, selectedDate, onRegisterRecord }: DailyTasksPanelProps) {
  const dateStr = selectedDate;

  const { data: tasks = [], isLoading, refetch, isFetching } = useDailyTasksByResident(
    residentId,
    dateStr,
    !!residentId, // enabled apenas se houver residentId
  );

  // Agrupar tarefas por tipo e ordenar (pendentes primeiro por horário, depois concluídas)
  const recurringTasks = tasks
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
    });
  const eventTasks = tasks.filter((task) => task.type === 'EVENT');

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
      {recurringTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Repeat className="h-4 w-4 text-primary dark:text-primary" />
            <h3 className="font-semibold text-sm">Registros Programados</h3>
            <Badge variant="secondary" className="ml-auto">
              {recurringTasks.length}
            </Badge>
          </div>

          <div className="space-y-2">
            {recurringTasks.map((task, index) => (
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
        </div>
      )}

      {/* Agendamentos Pontuais */}
      {eventTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-success dark:text-success" />
            <h3 className="font-semibold text-sm">Agendamentos</h3>
            <Badge variant="secondary" className="ml-auto">
              {eventTasks.length}
            </Badge>
          </div>

          <div className="space-y-2">
            {eventTasks.map((task, index) => (
              <div
                key={`event-${task.eventId}-${index}`}
                className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-medium">
                      {task.eventType && EVENT_TYPE_LABELS[task.eventType]}
                    </Badge>
                    {task.status && (
                      <Badge
                        variant={STATUS_VARIANTS[task.status] || 'default'}
                        className="text-xs"
                      >
                        {task.status === 'SCHEDULED' && 'Agendado'}
                        {task.status === 'COMPLETED' && 'Concluído'}
                        {task.status === 'CANCELLED' && 'Cancelado'}
                        {task.status === 'MISSED' && 'Perdido'}
                      </Badge>
                    )}
                  </div>

                  {task.status === 'COMPLETED' && (
                    <CheckCircle2 className="h-4 w-4 text-success dark:text-success" />
                  )}
                </div>

                <p className="font-medium text-sm mb-1">{task.title}</p>

                {task.scheduledTime && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{task.scheduledTime}</span>
                  </div>
                )}

                {task.description && (
                  <p className="text-xs text-muted-foreground mt-2">{task.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
