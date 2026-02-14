import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Trash2, Edit2, Loader2, Calendar, Clock, MousePointerClick } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  useDeleteAlimentacaoConfig,
  ResidentScheduleConfig,
  ScheduleFrequency,
} from '@/hooks/useResidentSchedule';
import { getRecordTypeLabel } from '@/utils/recordTypeLabels';
import { EditAlimentacaoConfigModal } from './EditAlimentacaoConfigModal';
import { AlimentacaoGroupedCard } from './AlimentacaoGroupedCard';

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

// Função auxiliar para obter o primeiro horário de um config (para ordenação)
const getFirstTime = (config: ResidentScheduleConfig): string => {
  return config.suggestedTimes.length > 0 ? config.suggestedTimes[0] : '99:99';
};

// Componente de área de drop para cada frequência
function FrequencyDropZone({
  frequency,
  configs,
  isOver,
  setNodeRef,
  canManage,
  onEdit,
  onDelete,
  alimentacaoConfigs,
  onEditAlimentacao,
  onDeleteAlimentacao,
}: {
  frequency: ScheduleFrequency;
  configs: ResidentScheduleConfig[];
  isOver: boolean;
  setNodeRef: (node: HTMLElement | null) => void;
  canManage: boolean;
  onEdit?: (config: ResidentScheduleConfig) => void;
  onDelete: (config: ResidentScheduleConfig) => void;
  alimentacaoConfigs?: ResidentScheduleConfig[];
  onEditAlimentacao?: (configs: ResidentScheduleConfig[]) => void;
  onDeleteAlimentacao?: () => void;
}) {
  // Ordenar configs por horário (primeiro horário sugerido)
  const sortedConfigs = [...configs].sort((a, b) => {
    return getFirstTime(a).localeCompare(getFirstTime(b));
  });

  const frequencyIcon = {
    DAILY: '📅',
    WEEKLY: '📆',
    MONTHLY: '🗓️',
  };

  const frequencyColor = {
    DAILY: 'border-primary/30 bg-primary/5/50',
    WEEKLY: 'border-success/30 bg-success/5/50',
    MONTHLY: 'border-medication-controlled/30 bg-medication-controlled/5/50',
  };

  const frequencyColorActive = {
    DAILY: 'border-primary/40 bg-primary/10',
    WEEKLY: 'border-success/40 bg-success/10',
    MONTHLY: 'border-medication-controlled/40 bg-medication-controlled/10',
  };

  return (
    <Card
      ref={setNodeRef}
      className={`transition-all border-2 min-w-0 ${
        isOver
          ? `${frequencyColorActive[frequency]} scale-[1.02] shadow-lg`
          : configs.length === 0
          ? 'border-dashed border-border hover:border-primary/50'
          : frequencyColor[frequency]
      }`}
    >
      <CardHeader className="pb-3 px-4 sm:px-6">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <span className="text-lg">{frequencyIcon[frequency]}</span>
          {FREQUENCY_LABELS[frequency]}
        </CardTitle>
        {configs.length === 0 && (
          <CardDescription className="text-xs">
            {isOver
              ? 'Solte aqui para configurar'
              : 'Nenhum registro configurado'}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="px-3 sm:px-4">
        {isOver && configs.length > 0 && (
          <Card className="p-4 mb-3 border-2 border-dashed border-primary/40 bg-primary/5 animate-pulse">
            <div className="text-center text-primary/80 font-semibold text-sm">
              <MousePointerClick className="h-6 w-6 mx-auto mb-1" />
              Solte aqui para adicionar
            </div>
          </Card>
        )}

        {configs.length === 0 && isOver && (
          <div className="text-center text-primary/80 font-semibold py-8">
            <MousePointerClick className="h-10 w-10 mx-auto mb-2 animate-bounce" />
            <p className="text-sm">Solte aqui para configurar</p>
          </div>
        )}

        {configs.length === 0 && !isOver && (
          <div className="text-center text-muted-foreground py-8">
            <MousePointerClick className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Arraste um card para cá</p>
          </div>
        )}

        <div className="space-y-2">
          {/* Card agrupado de ALIMENTACAO (apenas para DAILY) */}
          {frequency === 'DAILY' && alimentacaoConfigs && alimentacaoConfigs.length > 0 && (
            <AlimentacaoGroupedCard
              configs={alimentacaoConfigs}
              canManage={canManage}
              onEdit={(configs) => onEditAlimentacao?.(configs)}
              onDelete={() => onDeleteAlimentacao?.()}
            />
          )}
          {sortedConfigs.map((config) => (
            <Card key={config.id} className="p-3 bg-card hover:bg-accent/50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <Badge variant="secondary" className="font-medium text-xs">
                      {getRecordTypeLabel(config.recordType).label}
                    </Badge>
                    {!config.isActive && (
                      <Badge variant="outline" className="text-muted-foreground text-xs">
                        Inativa
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {(config.frequency === 'WEEKLY' || config.frequency === 'MONTHLY') && (
                      <div className="flex items-center gap-1 min-w-0">
                        <Calendar className="h-3 w-3" />
                        <span className="truncate">
                          {config.frequency === 'WEEKLY' && config.dayOfWeek !== undefined
                            ? WEEKDAY_LABELS[config.dayOfWeek]
                            : config.frequency === 'MONTHLY' && config.dayOfMonth !== undefined
                            ? `Dia ${config.dayOfMonth}`
                            : ''}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 min-w-0">
                      <Clock className="h-3 w-3" />
                      <span className="truncate">{config.suggestedTimes.join(', ')}</span>
                    </div>
                  </div>

                  {config.notes && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      <span className="font-medium">Obs:</span> {config.notes}
                    </p>
                  )}
                </div>

                {canManage && (
                  <div className="flex items-center gap-1 ml-1 sm:ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEdit?.(config)}
                      title="Editar configuração"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onDelete(config)}
                      title="Remover configuração"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ScheduleConfigList({
  residentId,
  canManage,
  onEdit,
}: ScheduleConfigListProps) {
  const [deletingConfig, setDeletingConfig] = useState<ResidentScheduleConfig | undefined>();
  const [deletingAlimentacao, setDeletingAlimentacao] = useState(false);
  const [editingAlimentacaoConfigs, setEditingAlimentacaoConfigs] = useState<ResidentScheduleConfig[] | null>(null);

  const { data: configs = [], isLoading} = useScheduleConfigsByResident(residentId);
  const deleteMutation = useDeleteScheduleConfig();
  const deleteAlimentacaoMutation = useDeleteAlimentacaoConfig();

  // Drop zones para cada frequência
  const dailyDropZone = useDroppable({ id: 'config-list-dropzone-DAILY' });
  const weeklyDropZone = useDroppable({ id: 'config-list-dropzone-WEEKLY' });
  const monthlyDropZone = useDroppable({ id: 'config-list-dropzone-MONTHLY' });

  // Separar configs de ALIMENTACAO das outras
  const alimentacaoConfigs = configs.filter(
    (c) => c.recordType === 'ALIMENTACAO' && c.frequency === 'DAILY'
  );

  // Agrupar configs por frequência (excluindo ALIMENTACAO de DAILY)
  const dailyConfigs = configs.filter(
    (c) => c.frequency === 'DAILY' && c.recordType !== 'ALIMENTACAO'
  );
  const weeklyConfigs = configs.filter((c) => c.frequency === 'WEEKLY');
  const monthlyConfigs = configs.filter((c) => c.frequency === 'MONTHLY');

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
    } catch (error: unknown) {
      toast.error('Erro ao remover configuração');
    }
  };

  const handleDeleteAlimentacao = () => {
    setDeletingAlimentacao(true);
  };

  const handleConfirmDeleteAlimentacao = async () => {
    try {
      await deleteAlimentacaoMutation.mutateAsync({ residentId });
      toast.success('Configurações de alimentação removidas com sucesso');
      setDeletingAlimentacao(false);
    } catch (error: unknown) {
      toast.error('Erro ao remover configurações');
    }
  };

  const handleEditAlimentacao = (configs: ResidentScheduleConfig[]) => {
    setEditingAlimentacaoConfigs(configs);
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
        <FrequencyDropZone
          frequency="DAILY"
          configs={dailyConfigs}
          isOver={dailyDropZone.isOver}
          setNodeRef={dailyDropZone.setNodeRef}
          canManage={canManage}
          onEdit={onEdit}
          onDelete={handleDelete}
          alimentacaoConfigs={alimentacaoConfigs}
          onEditAlimentacao={handleEditAlimentacao}
          onDeleteAlimentacao={handleDeleteAlimentacao}
        />

        <FrequencyDropZone
          frequency="WEEKLY"
          configs={weeklyConfigs}
          isOver={weeklyDropZone.isOver}
          setNodeRef={weeklyDropZone.setNodeRef}
          canManage={canManage}
          onEdit={onEdit}
          onDelete={handleDelete}
        />

        <FrequencyDropZone
          frequency="MONTHLY"
          configs={monthlyConfigs}
          isOver={monthlyDropZone.isOver}
          setNodeRef={monthlyDropZone.setNodeRef}
          canManage={canManage}
          onEdit={onEdit}
          onDelete={handleDelete}
        />
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
                {deletingConfig && getRecordTypeLabel(deletingConfig.recordType).label}{' '}
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

      {/* Delete Alimentacao Confirmation Modal */}
      <AlertDialog
        open={deletingAlimentacao}
        onOpenChange={(open) => !open && setDeletingAlimentacao(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover TODAS as configurações de alimentação?
              <br />
              <br />
              Isso irá remover os 6 horários de refeições obrigatórias configurados para este
              residente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteAlimentacao}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteAlimentacaoMutation.isPending}
            >
              {deleteAlimentacaoMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Remover Todas'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Alimentacao Modal */}
      {editingAlimentacaoConfigs && (
        <EditAlimentacaoConfigModal
          open={!!editingAlimentacaoConfigs}
          onOpenChange={(open) => !open && setEditingAlimentacaoConfigs(null)}
          configs={editingAlimentacaoConfigs}
          residentName=""
        />
      )}
    </>
  );
}
