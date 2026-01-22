// ──────────────────────────────────────────────────────────────────────────────
//  PAGE - ShiftsViewTab (Aba de Visualização de Plantões)
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Loader2 } from 'lucide-react';
import { getCurrentDate } from '@/utils/dateHelpers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SeverityAlert } from '@/design-system/components';
import { ShiftCard } from '@/components/care-shifts/shifts/ShiftCard';
import { ShiftDetailsModal } from '@/components/care-shifts/shifts/ShiftDetailsModal';
import { AssignTeamModal } from '@/components/care-shifts/shifts/AssignTeamModal';
import { useShifts } from '@/hooks/care-shifts/useShifts';
import { useRDCCalculation } from '@/hooks/care-shifts/useRDCCalculation';
import { usePermissions, PermissionType } from '@/hooks/usePermissions';
import type { Shift } from '@/types/care-shifts/care-shifts';

export function ShiftsViewTab() {
  const today = getCurrentDate();
  const nextWeek = format(addDays(parseISO(today), 14), 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextWeek);
  const [selectedShift, setSelectedShift] = useState<Shift | undefined>(undefined);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PermissionType.UPDATE_CARE_SHIFTS);

  // Buscar plantões
  const { data: shifts, isLoading } = useShifts({ startDate, endDate });

  // Buscar cálculo RDC para a data inicial
  const { data: rdcCalculation } = useRDCCalculation({ date: startDate });

  // Agrupar plantões por data
  const shiftsByDate = (shifts || []).reduce(
    (acc, shift) => {
      const dateKey = shift.date;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(shift);
      return acc;
    },
    {} as Record<string, Shift[]>,
  );

  const sortedDates = Object.keys(shiftsByDate).sort();

  const handleViewDetails = (shift: Shift) => {
    setSelectedShift(shift);
    setDetailsOpen(true);
  };

  const handleAssignTeam = (shift: Shift) => {
    setSelectedShift(shift);
    setAssignOpen(true);
  };

  // Função para obter o mínimo RDC para um turno específico
  const getMinimumRequired = (shiftTemplateId: string): number => {
    if (!rdcCalculation) return 0;
    const calc = rdcCalculation.calculations.find(
      (c) => c.shiftTemplate.id === shiftTemplateId,
    );
    return calc?.minimumRequired || 0;
  };

  return (
    <div className="space-y-6">
      {/* Filtros de Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plantões Agendados
          </CardTitle>
          <CardDescription>
            Visualize e gerencie os plantões dos próximos dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerta de Residentes sem Grau */}
      {rdcCalculation?.warnings && rdcCalculation.warnings.length > 0 && (
        <SeverityAlert
          severity="warning"
          title="Atenção: Cálculo RDC Parcial"
          message={rdcCalculation.warnings.join(' ')}
        />
      )}

      {/* Lista de Plantões */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : sortedDates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Nenhum plantão encontrado para o período selecionado.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Os plantões são gerados automaticamente do padrão semanal.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => {
            const dateShifts = shiftsByDate[dateKey];
            const formattedDate = format(
              new Date(dateKey + 'T12:00:00'),
              "EEEE, dd 'de' MMMM 'de' yyyy",
              { locale: ptBR },
            );

            return (
              <div key={dateKey} className="space-y-3">
                {/* Cabeçalho da Data (sticky) */}
                <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 py-2">
                  <h3 className="text-lg font-semibold capitalize">{formattedDate}</h3>
                </div>

                {/* Grid de Plantões */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dateShifts.map((shift) => (
                    <ShiftCard
                      key={shift.id}
                      shift={shift}
                      minimumRequired={getMinimumRequired(shift.shiftTemplateId)}
                      onViewDetails={() => handleViewDetails(shift)}
                      onAssignTeam={() => handleAssignTeam(shift)}
                      canManage={canManage}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <ShiftDetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        shift={selectedShift}
        minimumRequired={
          selectedShift
            ? getMinimumRequired(selectedShift.shiftTemplateId)
            : 0
        }
      />

      <AssignTeamModal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        shift={selectedShift}
      />
    </div>
  );
}
