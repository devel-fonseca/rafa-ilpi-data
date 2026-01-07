import { useState } from 'react';
import { Trash2, Edit2, Loader2, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  useScheduledEventsByResident,
  useDeleteScheduledEvent,
  useUpdateScheduledEvent,
  ResidentScheduledEvent,
  ScheduledEventStatus,
} from '@/hooks/useResidentSchedule';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { extractDateOnly } from '@/utils/dateHelpers';

interface ScheduledEventsListProps {
  residentId: string;
  canManage: boolean;
  onEdit?: (event: ResidentScheduledEvent) => void;
}

const EVENT_TYPE_LABELS = {
  VACCINATION: 'Vacinação',
  CONSULTATION: 'Consulta',
  EXAM: 'Exame',
  PROCEDURE: 'Procedimento',
  OTHER: 'Outro',
};

const STATUS_LABELS: Record<ScheduledEventStatus, string> = {
  SCHEDULED: 'Agendado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  MISSED: 'Perdido',
};

const STATUS_VARIANTS = {
  SCHEDULED: 'default' as const,
  COMPLETED: 'secondary' as const,
  CANCELLED: 'outline' as const,
  MISSED: 'destructive' as const,
};

export function ScheduledEventsList({
  residentId,
  canManage,
  onEdit,
}: ScheduledEventsListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingEvent, setDeletingEvent] = useState<ResidentScheduledEvent | undefined>();

  const { data: events = [], isLoading } = useScheduledEventsByResident(residentId);
  const deleteMutation = useDeleteScheduledEvent();
  const updateMutation = useUpdateScheduledEvent();

  // Filtrar e ordenar eventos
  const filteredEvents = events
    .filter((event) => {
      if (statusFilter === 'all') return true;
      return event.status === statusFilter;
    })
    .sort((a, b) => {
      // Ordenar por data crescente (próximos agendamentos primeiro)
      // ✅ Usa extractDateOnly para evitar timezone shift
      const dayKeyA = extractDateOnly(a.scheduledDate);
      const dayKeyB = extractDateOnly(b.scheduledDate);
      return dayKeyA.localeCompare(dayKeyB);
    });

  const handleDelete = (event: ResidentScheduledEvent) => {
    setDeletingEvent(event);
  };

  const handleConfirmDelete = async () => {
    if (!deletingEvent) return;

    try {
      await deleteMutation.mutateAsync({
        id: deletingEvent.id,
        residentId,
      });

      toast.success('Agendamento removido com sucesso');
      setDeletingEvent(undefined);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao remover agendamento');
    }
  };

  const handleMarkAsCompleted = async (event: ResidentScheduledEvent) => {
    try {
      await updateMutation.mutateAsync({
        id: event.id,
        data: {
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
        },
      });

      toast.success('Agendamento marcado como concluído');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar agendamento');
    }
  };

  const formatDate = (dateStr: string): string => {
    // ✅ Usa extractDateOnly para evitar timezone shift
    const dayKey = extractDateOnly(dateStr);
    const date = new Date(dayKey + 'T12:00:00');
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground">Filtrar por status:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="SCHEDULED">Agendados</SelectItem>
            <SelectItem value="COMPLETED">Concluídos</SelectItem>
            <SelectItem value="CANCELLED">Cancelados</SelectItem>
            <SelectItem value="MISSED">Perdidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredEvents.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>
              {statusFilter === 'all'
                ? 'Nenhum agendamento cadastrado'
                : `Nenhum agendamento ${STATUS_LABELS[statusFilter as ScheduledEventStatus].toLowerCase()}`}
            </p>
            <p className="text-sm mt-1">
              Agende vacinas, consultas, exames e procedimentos
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <Card key={event.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="font-semibold">
                      {EVENT_TYPE_LABELS[event.eventType as keyof typeof EVENT_TYPE_LABELS] ||
                        event.eventType}
                    </Badge>
                    <Badge variant={STATUS_VARIANTS[event.status]}>
                      {STATUS_LABELS[event.status]}
                    </Badge>
                  </div>

                  <h4 className="font-semibold text-base mb-2">{event.title}</h4>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(event.scheduledDate)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{event.scheduledTime}</span>
                    </div>
                  </div>

                  {event.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {event.description}
                    </p>
                  )}

                  {event.vaccineData && (
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium mb-1">Dados da Vacina:</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          <span className="font-medium">Nome:</span>{' '}
                          {(event.vaccineData as any).name}
                        </p>
                        <p>
                          <span className="font-medium">Dose:</span>{' '}
                          {(event.vaccineData as any).dose}
                        </p>
                        {(event.vaccineData as any).manufacturer && (
                          <p>
                            <span className="font-medium">Fabricante:</span>{' '}
                            {(event.vaccineData as any).manufacturer}
                          </p>
                        )}
                        {(event.vaccineData as any).batchNumber && (
                          <p>
                            <span className="font-medium">Lote:</span>{' '}
                            {(event.vaccineData as any).batchNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {event.notes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      <span className="font-medium">Obs:</span> {event.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {canManage && event.status === 'SCHEDULED' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMarkAsCompleted(event)}
                      title="Marcar como concluído"
                      disabled={updateMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </Button>
                  )}
                  {canManage && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit?.(event)}
                        title="Editar agendamento"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(event)}
                        title="Remover agendamento"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AlertDialog
        open={!!deletingEvent}
        onOpenChange={(open) => !open && setDeletingEvent(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este agendamento?
              <br />
              <br />
              <strong>
                {deletingEvent && deletingEvent.title}
                <br />
                {deletingEvent && formatDate(deletingEvent.scheduledDate)} às{' '}
                {deletingEvent && deletingEvent.scheduledTime}
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Remover'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
