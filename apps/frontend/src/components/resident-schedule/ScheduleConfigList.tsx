import { useState } from 'react';
import { Trash2, Edit2, Loader2, Calendar, Clock } from 'lucide-react';
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
import { toast } from 'sonner';
import {
  useScheduleConfigsByResident,
  useDeleteScheduleConfig,
  ResidentScheduleConfig,
  ScheduleFrequency,
} from '@/hooks/useResidentSchedule';
import { RECORD_TYPE_LABELS } from '@/utils/recordTypeLabels';

interface ScheduleConfigListProps {
  residentId: string;
  canManage: boolean;
  onEdit?: (config: ResidentScheduleConfig) => void;
}

const FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  DAILY: 'Diariamente',
  WEEKLY: 'Semanalmente',
  MONTHLY: 'Mensalmente',
};

const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export function ScheduleConfigList({
  residentId,
  canManage,
  onEdit,
}: ScheduleConfigListProps) {
  const [deletingConfig, setDeletingConfig] = useState<ResidentScheduleConfig | undefined>();

  const { data: configs = [], isLoading } = useScheduleConfigsByResident(residentId);
  const deleteMutation = useDeleteScheduleConfig();

  const getFrequencyLabel = (config: ResidentScheduleConfig): string => {
    const baseLabel = FREQUENCY_LABELS[config.frequency];

    if (config.frequency === 'WEEKLY' && config.dayOfWeek !== undefined) {
      return `${baseLabel} - ${WEEKDAY_LABELS[config.dayOfWeek]}`;
    }

    if (config.frequency === 'MONTHLY' && config.dayOfMonth !== undefined) {
      return `${baseLabel} - Dia ${config.dayOfMonth}`;
    }

    return baseLabel;
  };

  const handleDelete = (config: ResidentScheduleConfig) => {
    setDeletingConfig(config);
  };

  const handleConfirmDelete = async () => {
    if (!deletingConfig) return;

    try {
      await deleteMutation.mutateAsync({
        id: deletingConfig.id,
        residentId,
      });

      toast.success('Configuração removida com sucesso');
      setDeletingConfig(undefined);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao remover configuração');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (configs.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma configuração cadastrada</p>
          <p className="text-sm mt-1">
            Configure registros obrigatórios para este residente
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {configs.map((config) => (
          <Card key={config.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="font-semibold">
                    {RECORD_TYPE_LABELS[config.recordType as keyof typeof RECORD_TYPE_LABELS]?.label ||
                      config.recordType}
                  </Badge>
                  {!config.isActive && (
                    <Badge variant="outline" className="text-muted-foreground">
                      Inativa
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{getFrequencyLabel(config)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{config.suggestedTimes.join(', ')}</span>
                  </div>
                </div>

                {config.notes && (
                  <p className="text-sm text-muted-foreground mt-2">
                    <span className="font-medium">Obs:</span> {config.notes}
                  </p>
                )}
              </div>

              {canManage && (
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit?.(config)}
                    title="Editar configuração"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(config)}
                    title="Remover configuração"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <AlertDialog
        open={!!deletingConfig}
        onOpenChange={(open) => !open && setDeletingConfig(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta configuração de registro obrigatório?
              <br />
              <br />
              <strong>
                {deletingConfig &&
                  RECORD_TYPE_LABELS[
                    deletingConfig.recordType as keyof typeof RECORD_TYPE_LABELS
                  ]?.label}{' '}
                - {deletingConfig && getFrequencyLabel(deletingConfig)}
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
