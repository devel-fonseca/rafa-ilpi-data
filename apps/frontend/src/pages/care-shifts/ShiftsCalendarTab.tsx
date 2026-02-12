// ──────────────────────────────────────────────────────────────────────────────
// PAGE - ShiftsCalendarTab (Aba de Calendário de Plantões)
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { Loader2, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ShiftsCalendar } from '@/components/care-shifts/calendar/ShiftsCalendar';
import { BulkAssignModal } from '@/components/care-shifts/calendar/BulkAssignModal';
import { useShifts } from '@/hooks/care-shifts/useShifts';
import { useShiftTemplates } from '@/hooks/care-shifts/useShiftTemplates';
import { useTeams } from '@/hooks/care-shifts/useTeams';
import { useBulkCreateShifts } from '@/hooks/care-shifts/useShiftsBulk';
import { usePermissions, PermissionType } from '@/hooks/usePermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ShiftsCalendarTab() {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [currentMonth] = useState(new Date());

  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PermissionType.CREATE_CARE_SHIFTS);

  // Calcular startDate e endDate do mês atual para buscar plantões
  const dateRange = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, [currentMonth]);

  // Queries
  const { data: shiftsData, isLoading: isLoadingShifts } = useShifts(dateRange);
  const { data: templatesData, isLoading: isLoadingTemplates } = useShiftTemplates();
  const { data: teamsData, isLoading: isLoadingTeams } = useTeams({ isActive: true });

  // Mutation
  const bulkCreateMutation = useBulkCreateShifts();

  const shifts = shiftsData || []; // API retorna array diretamente
  const shiftTemplates = templatesData || [];
  const teams = teamsData?.data || [];

  // Handler quando usuário seleciona datas no calendário
  const handleDatesSelect = (dates: Date[]) => {
    setSelectedDates(dates);
    setBulkModalOpen(true);
  };

  // Handler de confirmação do modal
  const handleBulkConfirm = async (
    assignments: Array<{ date: string; shiftTemplateId: string; teamId: string }>,
  ) => {
    await bulkCreateMutation.mutateAsync(assignments);
    setBulkModalOpen(false);
    setSelectedDates([]);
  };

  if (isLoadingShifts || isLoadingTemplates || isLoadingTeams) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Calendário de Plantões</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Selecione os dias no calendário para criar plantões em lote com uma equipe e um turno
        </p>
      </div>

      {/* Alert de instruções */}
      {canManage && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            <strong>Como usar:</strong> Clique nos dias do calendário para selecioná-los. Após
            selecionar, clique em "Designar Equipe" para criar plantões em lote.
          </AlertDescription>
        </Alert>
      )}

      {/* Calendário */}
      <ShiftsCalendar
        shifts={shifts}
        onDatesSelect={handleDatesSelect}
        canManage={canManage}
      />

      {/* Modal de designação em lote */}
      <BulkAssignModal
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        dates={selectedDates}
        shiftTemplates={shiftTemplates}
        teams={teams}
        onConfirm={handleBulkConfirm}
        isSubmitting={bulkCreateMutation.isPending}
      />
    </div>
  );
}
