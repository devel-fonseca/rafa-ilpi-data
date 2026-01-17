import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Loader2, Calendar, CheckCircle } from 'lucide-react';
import { extractDateOnly } from '@/utils/dateHelpers';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useUpdateScheduledEvent } from '@/hooks/useResidentSchedule';
import { markAsRead } from '@/api/notifications.api';

interface MissedEventActionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  scheduledDate: string;
  scheduledTime: string;
  residentName: string;
  notificationId?: string;
}

type ActionMode = 'choose' | 'reschedule' | 'complete';

const rescheduleSchema = z.object({
  scheduledDate: z.string().min(1, 'Data é obrigatória'),
  scheduledTime: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato inválido. Use HH:mm (ex: 14:30)'),
});

type RescheduleFormData = z.infer<typeof rescheduleSchema>;

export function MissedEventActionsModal({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  scheduledDate,
  scheduledTime,
  residentName,
  notificationId,
}: MissedEventActionsModalProps) {
  const [mode, setMode] = useState<ActionMode>('choose');
  const updateMutation = useUpdateScheduledEvent();

  const form = useForm<RescheduleFormData>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: {
      scheduledDate: format(new Date(), 'yyyy-MM-dd'), // Hoje como padrão
      scheduledTime: scheduledTime,
    },
  });

  const handleReschedule = async (data: RescheduleFormData) => {
    try {
      await updateMutation.mutateAsync({
        id: eventId,
        data: {
          scheduledDate: data.scheduledDate,
          scheduledTime: data.scheduledTime,
        },
      });

      // Marcar notificação como lida
      if (notificationId) {
        await markAsRead(notificationId);
      }

      toast.success('Evento reagendado com sucesso');
      handleClose();
    } catch (error: unknown) {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response;
      toast.error(errorResponse?.data?.message || 'Erro ao reagendar evento');
    }
  };

  const handleComplete = async () => {
    try {
      await updateMutation.mutateAsync({
        id: eventId,
        data: {
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
        },
      });

      // Marcar notificação como lida
      if (notificationId) {
        await markAsRead(notificationId);
      }

      toast.success('Evento marcado como concluído');
      handleClose();
    } catch (error: unknown) {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response;
      toast.error(errorResponse?.data?.message || 'Erro ao marcar como concluído');
    }
  };

  const handleClose = () => {
    setMode('choose');
    form.reset();
    onOpenChange(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Data inválida';
    try {
      // ✅ Usa extractDateOnly para evitar timezone shift
      const dayKey = extractDateOnly(dateStr);
      const date = new Date(dayKey + 'T12:00:00');
      return format(date, 'dd/MM/yyyy');
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {/* Modo: Escolher Ação */}
        {mode === 'choose' && (
          <>
            <DialogHeader>
              <DialogTitle>Evento Não Concluído</DialogTitle>
              <DialogDescription>
                O evento "{eventTitle}" de {residentName} estava agendado para{' '}
                {formatDate(scheduledDate)} às {scheduledTime} e não foi marcado como concluído.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => setMode('reschedule')}
              >
                <Calendar className="mr-3 h-5 w-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Reagendar</div>
                  <div className="text-xs text-muted-foreground">
                    Escolher nova data e horário para o evento
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => setMode('complete')}
              >
                <CheckCircle className="mr-3 h-5 w-5 text-success" />
                <div className="text-left">
                  <div className="font-semibold">Marcar como Concluído</div>
                  <div className="text-xs text-muted-foreground">
                    Confirmar que o evento foi realizado
                  </div>
                </div>
              </Button>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>
                Cancelar
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Modo: Reagendar */}
        {mode === 'reschedule' && (
          <>
            <DialogHeader>
              <DialogTitle>Reagendar Evento</DialogTitle>
              <DialogDescription>
                Escolha a nova data e horário para "{eventTitle}"
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleReschedule)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova Data *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduledTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Novo Horário *</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setMode('choose')}>
                    Voltar
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Reagendando...
                      </>
                    ) : (
                      'Reagendar'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}

        {/* Modo: Marcar como Concluído */}
        {mode === 'complete' && (
          <>
            <DialogHeader>
              <DialogTitle>Confirmar Conclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja marcar o evento "{eventTitle}" como concluído?
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 text-sm text-muted-foreground">
              <p>Esta ação irá:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Atualizar o status do evento para "Concluído"</li>
                <li>Registrar a data/hora atual como momento da conclusão</li>
                <li>Marcar a notificação como lida</li>
              </ul>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setMode('choose')}>
                Voltar
              </Button>
              <Button onClick={handleComplete} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Confirmar Conclusão'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
