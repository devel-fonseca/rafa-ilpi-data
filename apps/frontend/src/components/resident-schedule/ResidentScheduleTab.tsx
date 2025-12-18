import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { usePermissions, PermissionType } from '@/hooks/usePermissions';
import { ScheduleConfigList } from './ScheduleConfigList';
import { ScheduledEventsList } from './ScheduledEventsList';
import { CreateScheduleConfigModal } from './CreateScheduleConfigModal';
import { CreateScheduledEventModal } from './CreateScheduledEventModal';
import { EditScheduleConfigModal } from './EditScheduleConfigModal';
import { EditScheduledEventModal } from './EditScheduledEventModal';
import { ResidentScheduleConfig, ResidentScheduledEvent } from '@/hooks/useResidentSchedule';

interface ResidentScheduleTabProps {
  residentId: string;
  residentName: string;
}

export function ResidentScheduleTab({
  residentId,
  residentName,
}: ResidentScheduleTabProps) {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PermissionType.MANAGE_RESIDENT_SCHEDULE);

  // Estados dos modais de criação
  const [createConfigModalOpen, setCreateConfigModalOpen] = useState(false);
  const [createEventModalOpen, setCreateEventModalOpen] = useState(false);

  // Estados dos modais de edição
  const [editConfigModalOpen, setEditConfigModalOpen] = useState(false);
  const [editEventModalOpen, setEditEventModalOpen] = useState(false);
  const [configToEdit, setConfigToEdit] = useState<ResidentScheduleConfig | null>(null);
  const [eventToEdit, setEventToEdit] = useState<ResidentScheduledEvent | null>(null);

  // Handlers de criação
  const handleAddConfig = () => setCreateConfigModalOpen(true);
  const handleAddEvent = () => setCreateEventModalOpen(true);

  // Handlers de edição
  const handleEditConfig = (config: ResidentScheduleConfig) => {
    setConfigToEdit(config);
    setEditConfigModalOpen(true);
  };

  const handleEditEvent = (event: ResidentScheduledEvent) => {
    setEventToEdit(event);
    setEditEventModalOpen(true);
  };

  return (
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
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Configure quais registros diários devem ser realizados e com qual
              frequência
            </p>
            {canManage && (
              <Button
                onClick={handleAddConfig}
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Configuração
              </Button>
            )}
          </div>

          <ScheduleConfigList
            residentId={residentId}
            canManage={canManage}
            onEdit={handleEditConfig}
          />
        </TabsContent>

        {/* TAB: Agendamentos Pontuais */}
        <TabsContent value="events" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Agende vacinas, consultas, exames e outros eventos pontuais
            </p>
            {canManage && (
              <Button onClick={handleAddEvent} size="sm">
                <Plus className="mr-2 h-4 w-4" />
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

      {/* Modais de Criação */}
      <CreateScheduleConfigModal
        open={createConfigModalOpen}
        onOpenChange={setCreateConfigModalOpen}
        residentId={residentId}
        residentName={residentName}
      />

      <CreateScheduledEventModal
        open={createEventModalOpen}
        onOpenChange={setCreateEventModalOpen}
        residentId={residentId}
        residentName={residentName}
      />

      {/* Modais de Edição */}
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
    </div>
  );
}
