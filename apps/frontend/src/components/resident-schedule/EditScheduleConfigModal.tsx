import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, X, Plus } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  useUpdateScheduleConfig,
  RecordType,
  ResidentScheduleConfig,
} from '@/hooks/useResidentSchedule';
import { RECORD_TYPE_LABELS } from '@/utils/recordTypeLabels';

interface EditScheduleConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ResidentScheduleConfig | null;
  residentName: string;
}

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

const formSchema = z
  .object({
    recordType: z.string().min(1, 'Tipo de registro é obrigatório'),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY'] as const),
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.frequency === 'WEEKLY' && data.dayOfWeek === undefined) {
        return false;
      }
      if (data.frequency === 'MONTHLY' && data.dayOfMonth === undefined) {
        return false;
      }
      return true;
    },
    {
      message:
        'Frequência semanal requer dia da semana, mensal requer dia do mês',
      path: ['frequency'],
    }
  );

type FormData = z.infer<typeof formSchema>;

export function EditScheduleConfigModal({
  open,
  onOpenChange,
  config,
  residentName,
}: EditScheduleConfigModalProps) {
  const [suggestedTimes, setSuggestedTimes] = useState<string[]>([]);
  const [newTimeInput, setNewTimeInput] = useState('');

  const updateMutation = useUpdateScheduleConfig();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recordType: '',
      frequency: 'DAILY',
      notes: '',
    },
  });

  const frequency = form.watch('frequency');

  // Preencher form quando config mudar
  useEffect(() => {
    if (config && open) {
      form.reset({
        recordType: config.recordType,
        frequency: config.frequency,
        dayOfWeek: config.dayOfWeek ?? undefined,
        dayOfMonth: config.dayOfMonth ?? undefined,
        notes: config.notes ?? '',
      });

      // Parse suggestedTimes do JSON
      const times = Array.isArray(config.suggestedTimes)
        ? config.suggestedTimes
        : [];
      setSuggestedTimes(times.sort());
    }
  }, [config, open, form]);

  const handleAddTime = () => {
    const trimmed = newTimeInput.trim();
    if (!trimmed) return;

    // Validar formato HH:mm
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(trimmed)) {
      toast.error('Formato inválido. Use HH:mm (ex: 08:00)');
      return;
    }

    if (suggestedTimes.includes(trimmed)) {
      toast.error('Este horário já foi adicionado');
      return;
    }

    setSuggestedTimes([...suggestedTimes, trimmed].sort());
    setNewTimeInput('');
  };

  const handleRemoveTime = (time: string) => {
    setSuggestedTimes(suggestedTimes.filter((t) => t !== time));
  };

  const onSubmit = async (data: FormData) => {
    if (!config) return;

    if (suggestedTimes.length === 0) {
      toast.error('Adicione pelo menos um horário sugerido');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: config.id,
        data: {
          recordType: data.recordType as RecordType,
          frequency: data.frequency,
          dayOfWeek: data.frequency === 'WEEKLY' ? data.dayOfWeek : undefined,
          dayOfMonth:
            data.frequency === 'MONTHLY' ? data.dayOfMonth : undefined,
          suggestedTimes,
          notes: data.notes,
        },
      });

      toast.success('Configuração atualizada com sucesso');
      handleClose();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Erro ao atualizar configuração'
      );
    }
  };

  const handleClose = () => {
    form.reset();
    setSuggestedTimes([]);
    setNewTimeInput('');
    onOpenChange(false);
  };

  if (!config) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Registro Obrigatório</DialogTitle>
          <DialogDescription>
            Edite a configuração de registro obrigatório para {residentName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo de Registro */}
            <FormField
              control={form.control}
              name="recordType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Registro *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(RECORD_TYPE_LABELS).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Frequência */}
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequência *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DAILY">Diariamente</SelectItem>
                      <SelectItem value="WEEKLY">Semanalmente</SelectItem>
                      <SelectItem value="MONTHLY">Mensalmente</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dia da Semana (apenas se WEEKLY) */}
            {frequency === 'WEEKLY' && (
              <FormField
                control={form.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia da Semana *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o dia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WEEKDAY_OPTIONS.map((day) => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Dia do Mês (apenas se MONTHLY) */}
            {frequency === 'MONTHLY' && (
              <FormField
                control={form.control}
                name="dayOfMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia do Mês *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        placeholder="1-31"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Se o mês tiver menos dias, o registro não será gerado
                      naquele mês
                    </p>
                  </FormItem>
                )}
              />
            )}

            {/* Horários Sugeridos */}
            <div className="space-y-2">
              <FormLabel>Horários Sugeridos *</FormLabel>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="HH:mm (ex: 08:00)"
                  value={newTimeInput}
                  onChange={(e) => setNewTimeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTime();
                    }
                  }}
                  maxLength={5}
                />
                <Button
                  type="button"
                  onClick={handleAddTime}
                  variant="outline"
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {suggestedTimes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {suggestedTimes.map((time) => (
                    <Badge key={time} variant="secondary" className="gap-1">
                      {time}
                      <button
                        type="button"
                        onClick={() => handleRemoveTime(time)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Adicione um ou mais horários sugeridos para este registro
              </p>
            </div>

            {/* Observações */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Instruções especiais ou observações..."
                      className="resize-none"
                      rows={3}
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
