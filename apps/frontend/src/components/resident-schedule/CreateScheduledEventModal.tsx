import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
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
import { useCreateScheduledEvent, ScheduledEventType } from '@/hooks/useResidentSchedule';

interface CreateScheduledEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentId: string;
  residentName: string;
}

const EVENT_TYPE_OPTIONS: { value: ScheduledEventType; label: string }[] = [
  { value: 'VACCINATION', label: 'Vacinação' },
  { value: 'CONSULTATION', label: 'Consulta' },
  { value: 'EXAM', label: 'Exame' },
  { value: 'PROCEDURE', label: 'Procedimento' },
  { value: 'OTHER', label: 'Outro' },
];

const formSchema = z.object({
  eventType: z.enum(['VACCINATION', 'CONSULTATION', 'EXAM', 'PROCEDURE', 'OTHER'] as const),
  scheduledDate: z.string().min(1, 'Data é obrigatória'),
  scheduledTime: z.string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato inválido. Use HH:mm (ex: 14:30)'),
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Máximo 200 caracteres'),
  description: z.string().max(500, 'Máximo 500 caracteres').optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function CreateScheduledEventModal({
  open,
  onOpenChange,
  residentId,
  residentName,
}: CreateScheduledEventModalProps) {
  const createMutation = useCreateScheduledEvent();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventType: 'CONSULTATION',
      scheduledDate: '',
      scheduledTime: '',
      title: '',
      description: '',
      notes: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createMutation.mutateAsync({
        residentId,
        eventType: data.eventType,
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        title: data.title,
        description: data.description,
        notes: data.notes,
      });

      toast.success('Agendamento criado com sucesso');
      handleClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao criar agendamento');
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Agendamento</DialogTitle>
          <DialogDescription>
            Agende uma vacina, consulta, exame ou procedimento para {residentName}
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
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EVENT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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

              <FormField
                control={form.control}
                name="scheduledTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário *</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="HH:mm (ex: 14:30)"
                        maxLength={5}
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
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Agendamento'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
