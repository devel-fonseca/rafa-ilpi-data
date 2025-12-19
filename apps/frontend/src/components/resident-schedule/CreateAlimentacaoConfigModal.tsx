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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { MEAL_TYPES } from '@/constants/meal-types';
import { useCreateAlimentacaoConfig } from '@/hooks/useResidentSchedule';

interface CreateAlimentacaoConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentId: string;
  residentName: string;
}

const formSchema = z.object({
  cafeDaManha: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato inválido'),
  colacao: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato inválido'),
  almoco: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato inválido'),
  lanche: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato inválido'),
  jantar: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato inválido'),
  ceia: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato inválido'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function CreateAlimentacaoConfigModal({
  open,
  onOpenChange,
  residentId,
  residentName,
}: CreateAlimentacaoConfigModalProps) {
  const createMutation = useCreateAlimentacaoConfig();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cafeDaManha: '07:00',
      colacao: '09:30',
      almoco: '12:00',
      lanche: '15:00',
      jantar: '18:00',
      ceia: '20:00',
      notes: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createMutation.mutateAsync({
        residentId,
        mealTimes: {
          cafeDaManha: data.cafeDaManha,
          colacao: data.colacao,
          almoco: data.almoco,
          lanche: data.lanche,
          jantar: data.jantar,
          ceia: data.ceia,
        },
        isActive: true,
        notes: data.notes,
      });

      toast.success('Configurações de alimentação criadas com sucesso');
      handleClose();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Erro ao criar configurações de alimentação'
      );
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
          <DialogTitle>Configurar Horários de Alimentação</DialogTitle>
          <DialogDescription>
            Configure os horários das 6 refeições obrigatórias para {residentName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Grid com os 6 horários */}
            <div className="grid grid-cols-2 gap-4">
              {MEAL_TYPES.map((mealType) => {
                // Mapear value para fieldName
                const fieldNameMap: Record<string, keyof FormData> = {
                  'Café da Manhã': 'cafeDaManha',
                  'Colação': 'colacao',
                  'Almoço': 'almoco',
                  'Lanche': 'lanche',
                  'Jantar': 'jantar',
                  'Ceia': 'ceia',
                };

                const fieldName = fieldNameMap[mealType.value];

                return (
                  <FormField
                    key={mealType.value}
                    control={form.control}
                    name={fieldName}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <span className="text-lg">{mealType.icon}</span>
                          {mealType.label}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            placeholder={mealType.defaultTime}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                );
              })}
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
                      placeholder="Observações gerais sobre alimentação do residente..."
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
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Configurações'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
