import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getCurrentTime } from '@/utils/dateHelpers';
import { formatDateOnlySafe } from '@/utils/dateHelpers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Activity } from 'lucide-react';
import {
  IncidentCategory,
  IncidentSeverity,
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_SEVERITY_LABELS,
  SEVERITY_COLORS,
  getSubtypesByCategory,
  isSentinelEvent,
  IncidentSubtypeClinical,
} from '@/types/incidents';

const intercorrenciaSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  categoria: z.nativeEnum(IncidentCategory, {
    required_error: 'Categoria é obrigatória',
  }),
  subtipo: z.string().min(1, 'Subtipo é obrigatório'),
  severidade: z.nativeEnum(IncidentSeverity, {
    required_error: 'Severidade é obrigatória',
  }),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  acaoTomada: z.string().min(1, 'Ação tomada é obrigatória'),
  isDoencaNotificavel: z.boolean().optional(),
});

type IntercorrenciaFormData = z.infer<typeof intercorrenciaSchema>;

interface IntercorrenciaModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  residentId: string;
  residentName: string;
  date: string;
  currentUserName: string;
}

export function IntercorrenciaModal({
  open,
  onClose,
  onSubmit,
  residentId,
  residentName,
  date,
  currentUserName,
}: IntercorrenciaModalProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<IntercorrenciaFormData>({
    resolver: zodResolver(intercorrenciaSchema),
    defaultValues: {
      time: getCurrentTime(),
      isDoencaNotificavel: false,
    },
  });

  const [availableSubtypes, setAvailableSubtypes] = useState<
    Array<{ value: string; label: string }>
  >([]);

  const selectedCategory = watch('categoria');
  const selectedSubtype = watch('subtipo');
  const selectedSeverity = watch('severidade');

  // Atualizar subtipos disponíveis quando categoria muda
  useEffect(() => {
    if (selectedCategory) {
      const subtypes = getSubtypesByCategory(selectedCategory);
      setAvailableSubtypes(subtypes);

      // Reset subtipo se categoria mudou
      setValue('subtipo', '');
    } else {
      setAvailableSubtypes([]);
    }
  }, [selectedCategory, setValue]);

  // Verificar se é Evento Sentinela
  const isEventoSentinela =
    selectedCategory === IncidentCategory.CLINICA &&
    isSentinelEvent(selectedSubtype as IncidentSubtypeClinical);

  const handleFormSubmit = (data: IntercorrenciaFormData) => {
    const payload = {
      residentId,
      type: 'INTERCORRENCIA',
      date,
      time: data.time,
      recordedBy: currentUserName,
      incidentCategory: data.categoria,
      incidentSubtypeClinical:
        data.categoria === IncidentCategory.CLINICA ? data.subtipo : null,
      incidentSubtypeAssist:
        data.categoria === IncidentCategory.ASSISTENCIAL ? data.subtipo : null,
      incidentSubtypeAdmin:
        data.categoria === IncidentCategory.ADMINISTRATIVA ? data.subtipo : null,
      incidentSeverity: data.severidade,
      isEventoSentinela,
      isDoencaNotificavel: data.isDoencaNotificavel || false,
      data: {
        descricao: data.descricao,
        acaoTomada: data.acaoTomada,
      },
    };
    onSubmit(payload);
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Intercorrência - {residentName}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Data: {formatDateOnlySafe(date)}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Horário */}
          <div>
            <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
              Horário
            </Label>
            <Input {...register('time')} type="time" className="mt-2" />
            {errors.time && (
              <p className="text-sm text-danger mt-1">{errors.time.message}</p>
            )}
          </div>

          {/* Categoria e Subtipo (lado a lado) */}
          <div className="grid grid-cols-2 gap-4">
            {/* Categoria */}
            <div>
              <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
                Categoria
              </Label>
              <Controller
                name="categoria"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(INCIDENT_CATEGORY_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoria && (
                <p className="text-sm text-danger mt-1">
                  {errors.categoria.message}
                </p>
              )}
            </div>

            {/* Subtipo */}
            <div>
              <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
                Subtipo
              </Label>
              <Controller
                name="subtipo"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!selectedCategory || availableSubtypes.length === 0}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubtypes.map((subtype) => (
                        <SelectItem key={subtype.value} value={subtype.value}>
                          {subtype.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.subtipo && (
                <p className="text-sm text-danger mt-1">
                  {errors.subtipo.message}
                </p>
              )}
            </div>
          </div>

          {/* Severidade */}
          <div>
            <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
              Severidade
            </Label>
            <Controller
              name="severidade"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INCIDENT_SEVERITY_LABELS).map(
                      ([value, label]) => {
                        const colors =
                          SEVERITY_COLORS[value as IncidentSeverity];
                        return (
                          <SelectItem key={value} value={value}>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${colors.badge}`}
                              >
                                {label}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      },
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.severidade && (
              <p className="text-sm text-danger mt-1">
                {errors.severidade.message}
              </p>
            )}
          </div>

          {/* Alerta de Evento Sentinela */}
          {isEventoSentinela && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 dark:text-red-100 text-sm">
                    🚨 Evento Sentinela Detectado
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Este evento requer <strong>notificação obrigatória</strong> à
                    Autoridade Sanitária Local em até <strong>24 horas</strong>{' '}
                    (RDC 502/2021 Art. 55).
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    Um email será enviado automaticamente ao Responsável Técnico.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Checkbox de Doença Notificável */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <input
              type="checkbox"
              id="isDoencaNotificavel"
              {...register('isDoencaNotificavel')}
              className="mt-1"
            />
            <div className="flex-1">
              <label
                htmlFor="isDoencaNotificavel"
                className="text-sm font-medium text-amber-900 dark:text-amber-100 cursor-pointer"
              >
                <Activity className="inline h-4 w-4 mr-1" />
                Doença de Notificação Compulsória
              </label>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Marque se for doença de notificação obrigatória ao sistema de
                vigilância epidemiológica (ex: COVID-19, Tuberculose, Hepatites
                virais).
              </p>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
              Descrição
            </Label>
            <Textarea
              {...register('descricao')}
              rows={3}
              className="mt-2"
              placeholder="Descreva o ocorrido de forma clara e objetiva..."
            />
            {errors.descricao && (
              <p className="text-sm text-danger mt-1">
                {errors.descricao.message}
              </p>
            )}
          </div>

          {/* Ação Tomada */}
          <div>
            <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
              Ação Tomada
            </Label>
            <Textarea
              {...register('acaoTomada')}
              rows={3}
              className="mt-2"
              placeholder="Descreva as ações tomadas, medicações administradas, profissionais acionados..."
            />
            {errors.acaoTomada && (
              <p className="text-sm text-danger mt-1">
                {errors.acaoTomada.message}
              </p>
            )}
          </div>

          {/* Info do Responsável */}
          <div className="text-sm text-muted-foreground">
            Responsável: <span className="font-medium">{currentUserName}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={isEventoSentinela ? 'danger' : 'default'}
            >
              {isEventoSentinela ? '🚨 Registrar Evento Sentinela' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
