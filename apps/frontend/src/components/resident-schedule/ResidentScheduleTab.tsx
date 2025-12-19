import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePermissions, PermissionType } from '@/hooks/usePermissions';
import { ScheduleConfigList } from './ScheduleConfigList';
import { ScheduledEventsList } from './ScheduledEventsList';
import { CreateScheduleConfigModal } from './CreateScheduleConfigModal';
import { CreateAlimentacaoConfigModal } from './CreateAlimentacaoConfigModal';
import { CreateScheduledEventModal } from './CreateScheduledEventModal';
import { EditScheduleConfigModal } from './EditScheduleConfigModal';
import { EditScheduledEventModal } from './EditScheduledEventModal';
import {
  DraggableRecordTypeCard,
  RecordType,
} from './DraggableRecordTypeCard';
import { ResidentScheduleConfig, ResidentScheduledEvent } from '@/hooks/useResidentSchedule';
import { Badge } from '@/components/ui/badge';
import { RECORD_TYPE_LABELS } from '@/utils/recordTypeLabels';

interface ResidentScheduleTabProps {
  residentId: string;
  residentName: string;
}

// Tipos de registro permitidos (excluindo VISITA, INTERCORRENCIA, OUTROS)
const ALLOWED_RECORD_TYPES: RecordType[] = [
  'HIGIENE',
  'ALIMENTACAO',
  'HIDRATACAO',
  'MONITORAMENTO',
  'ELIMINACAO',
  'COMPORTAMENTO',
  'HUMOR',
  'SONO',
  'PESO',
  'ATIVIDADES',
];

export function ResidentScheduleTab({
  residentId,
  residentName,
}: ResidentScheduleTabProps) {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PermissionType.MANAGE_RESIDENT_SCHEDULE);

  // Estados dos modais
  const [createConfigModalOpen, setCreateConfigModalOpen] = useState(false);
  const [createAlimentacaoModalOpen, setCreateAlimentacaoModalOpen] = useState(false);
  const [createEventModalOpen, setCreateEventModalOpen] = useState(false);
  const [editConfigModalOpen, setEditConfigModalOpen] = useState(false);
  const [editEventModalOpen, setEditEventModalOpen] = useState(false);
  const [configToEdit, setConfigToEdit] = useState<ResidentScheduleConfig | null>(null);
  const [eventToEdit, setEventToEdit] = useState<ResidentScheduledEvent | null>(null);

  // Estado do drag-and-drop
  const [activeRecordType, setActiveRecordType] = useState<RecordType | null>(null);
  const [droppedRecordType, setDroppedRecordType] = useState<RecordType | null>(null);
  const [droppedFrequency, setDroppedFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | null>(null);

  // Handlers de drag-and-drop
  const handleDragStart = (event: DragStartEvent) => {
    const recordType = event.active.data.current?.recordType as RecordType;
    setActiveRecordType(recordType);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Verificar se foi solto em uma das zonas de drop de frequência
    if (over && typeof over.id === 'string' && over.id.startsWith('config-list-dropzone-')) {
      const recordType = active.data.current?.recordType as RecordType;

      // Extrair a frequência do ID da zona de drop
      const frequency = over.id.replace('config-list-dropzone-', '') as 'DAILY' | 'WEEKLY' | 'MONTHLY';

      // Se for ALIMENTACAO, abrir modal especial (apenas permite DAILY)
      if (recordType === 'ALIMENTACAO') {
        if (frequency === 'DAILY') {
          setCreateAlimentacaoModalOpen(true);
        } else {
          // Não permitir ALIMENTACAO em frequências WEEKLY ou MONTHLY
          // Você pode adicionar um toast aqui se desejar feedback ao usuário
        }
      } else {
        // Para outros tipos, usar o modal genérico
        setDroppedRecordType(recordType);
        setDroppedFrequency(frequency);
        setCreateConfigModalOpen(true);
      }
    }

    setActiveRecordType(null);
  };

  const handleDragCancel = () => {
    setActiveRecordType(null);
  };

  // Handlers de edição
  const handleEditConfig = (config: ResidentScheduleConfig) => {
    setConfigToEdit(config);
    setEditConfigModalOpen(true);
  };

  const handleEditEvent = (event: ResidentScheduledEvent) => {
    setEventToEdit(event);
    setEditEventModalOpen(true);
  };

  // Handler para fechar modal e limpar recordType e frequency
  const handleCloseCreateConfigModal = (open: boolean) => {
    setCreateConfigModalOpen(open);
    if (!open) {
      setDroppedRecordType(null);
      setDroppedFrequency(null);
    }
  };

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Agenda do Residente</h3>
            <p className="text-sm text-muted-foreground">
              Configure registros obrigatórios e agende eventos para {residentName}
            </p>
          </div>
        </div>

        {/* Sub-Tabs */}
        <Tabs defaultValue="configs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="configs">Registros Obrigatórios</TabsTrigger>
            <TabsTrigger value="events">Agendamentos Pontuais</TabsTrigger>
          </TabsList>

          {/* TAB: Registros Obrigatórios */}
          <TabsContent value="configs" className="space-y-4">
            {/* Cards Arrastáveis (apenas para usuários com permissão de gerenciar) */}
            {canManage && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Tipos de Registro Disponíveis</CardTitle>
                  <CardDescription>
                    Arraste um card para a lista abaixo para adicionar uma configuração
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {ALLOWED_RECORD_TYPES.map((recordType) => (
                      <DraggableRecordTypeCard key={recordType} recordType={recordType} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <p className="text-sm text-muted-foreground mb-4">
                {canManage
                  ? 'Arraste um tipo de registro acima para adicionar ou visualize as configurações existentes'
                  : 'Configurações de registros obrigatórios para este residente'}
              </p>

              <ScheduleConfigList
                residentId={residentId}
                canManage={canManage}
                onEdit={handleEditConfig}
              />
            </div>
          </TabsContent>

          {/* TAB: Agendamentos Pontuais */}
          <TabsContent value="events" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Agende vacinas, consultas, exames e outros eventos pontuais
              </p>
              {canManage && (
                <Button onClick={() => setCreateEventModalOpen(true)}>
                  Adicionar Agendamento
                </Button>
              )}
            </div>

            <ScheduledEventsList
              residentId={residentId}
              canManage={canManage}
              onEdit={handleEditEvent}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Drag Overlay - mostra o card sendo arrastado */}
      <DragOverlay>
        {activeRecordType && (
          <Card className="opacity-80 shadow-2xl">
            <CardContent className="p-3">
              <Badge
                variant="secondary"
                className={`${RECORD_TYPE_LABELS[activeRecordType].color} ${RECORD_TYPE_LABELS[activeRecordType].bgColor} border-2`}
              >
                {RECORD_TYPE_LABELS[activeRecordType].label}
              </Badge>
            </CardContent>
          </Card>
        )}
      </DragOverlay>

      {/* Modais */}
      <CreateScheduleConfigModal
        open={createConfigModalOpen}
        onOpenChange={handleCloseCreateConfigModal}
        residentId={residentId}
        residentName={residentName}
        preselectedRecordType={droppedRecordType || undefined}
        preselectedFrequency={droppedFrequency || undefined}
      />

      <CreateAlimentacaoConfigModal
        open={createAlimentacaoModalOpen}
        onOpenChange={setCreateAlimentacaoModalOpen}
        residentId={residentId}
        residentName={residentName}
      />

      <CreateScheduledEventModal
        open={createEventModalOpen}
        onOpenChange={setCreateEventModalOpen}
        residentId={residentId}
        residentName={residentName}
      />

      <EditScheduleConfigModal
        open={editConfigModalOpen}
        onOpenChange={setEditConfigModalOpen}
        config={configToEdit}
        residentName={residentName}
      />

      <EditScheduledEventModal
        open={editEventModalOpen}
        onOpenChange={setEditEventModalOpen}
        event={eventToEdit}
        residentName={residentName}
      />
    </DndContext>
  );
}
