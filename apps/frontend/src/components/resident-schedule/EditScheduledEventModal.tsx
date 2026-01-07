import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  useUpdateScheduledEvent,
  ScheduledEventType,
  ResidentScheduledEvent,
} from '@/hooks/useResidentSchedule';

interface EditScheduledEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: ResidentScheduledEvent | null;
  residentName: string;
}

const EVENT_TYPE_LABELS = {
  VACCINATION: 'Vacinação',
  CONSULTATION: 'Consulta',
  EXAM: 'Exame',
  PROCEDURE: 'Procedimento',
  OTHER: 'Outro',
};

const formSchema = z.object({
  eventType: z.string().min(1, 'Tipo de evento é obrigatório'),
  scheduledDate: z.string().min(1, 'Data é obrigatória'),
  scheduledTime: z.string().min(1, 'Horário é obrigatório'),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function EditScheduledEventModal({
  open,
  onOpenChange,
  event,
  residentName,
}: EditScheduledEventModalProps) {
  const updateMutation = useUpdateScheduledEvent();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventType: '',
      scheduledDate: '',
      scheduledTime: '',
      title: '',
      description: '',
      notes: '',
    },
  });

  // Preencher form quando event mudar
  useEffect(() => {
    if (event && open) {
      // ✅ Usa extractDateOnly para evitar timezone shift
      const dateFormatted = extractDateOnly(event.scheduledDate);

      form.reset({
        eventType: event.eventType,
        scheduledDate: dateFormatted,
        scheduledTime: event.scheduledTime,
        title: event.title,
        description: event.description ?? '',
        notes: event.notes ?? '',
      });
    }
  }, [event, open, form]);

  const onSubmit = async (data: FormData) => {
    if (!event) return;

    try {
      await updateMutation.mutateAsync({
        id: event.id,
        data: {
          eventType: data.eventType as ScheduledEventType,
          scheduledDate: data.scheduledDate,
          scheduledTime: data.scheduledTime,
          title: data.title,
          description: data.description,
          notes: data.notes,
        },
      });

      toast.success('Agendamento atualizado com sucesso');
      handleClose();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Erro ao atualizar agendamento'
      );
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Agendamento</DialogTitle>
          <DialogDescription>
            Edite o agendamento pontual para {residentName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo de Evento */}
            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Evento *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Título */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Consulta com cardiologista, Vacina contra gripe..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Data e Horário */}
            <div className="grid grid-cols-2 gap-4">
              {/* Data */}
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Horário */}
              <FormField
                control={form.control}
                name="scheduledTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário *</FormLabel>
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
            </div>

            {/* Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes adicionais sobre o agendamento..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Observações */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
