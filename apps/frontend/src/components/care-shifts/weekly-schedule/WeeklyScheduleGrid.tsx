// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - WeeklyScheduleGrid (Calendário de Designação de Escalas)
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useTeams } from '@/hooks/care-shifts/useTeams';
import {
  useAssignTeamToPattern,
  useRemovePatternAssignment,
} from '@/hooks/care-shifts/useWeeklySchedule';
import type {
  WeeklySchedulePattern,
} from '@/types/care-shifts/weekly-schedule';
import type { ShiftTemplate } from '@/types/care-shifts/shift-templates';
import { ScheduleCalendar } from './ScheduleCalendar';
import { DayAssignmentModal } from './DayAssignmentModal';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

interface WeeklyScheduleGridProps {
  pattern: WeeklySchedulePattern;
  shiftTemplates: ShiftTemplate[];
  canManage?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export function WeeklyScheduleGrid({
  pattern,
  shiftTemplates,
  canManage = false,
}: WeeklyScheduleGridProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: teamsData } = useTeams({ isActive: true });
  const assignMutation = useAssignTeamToPattern();
  const removeMutation = useRemovePatternAssignment();

  const teams = teamsData?.data || [];

  // Handler para clique em um dia do calendário
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setModalOpen(true);
  };

  // Handler para designar equipe a um turno específico de um dia
  const handleAssignTeam = async (shiftTemplateId: string, teamId: string) => {
    if (!selectedDate) return;

    const dayOfWeek = selectedDate.getDay();
    const weekNumber = calculateWeekNumber(
      selectedDate,
      pattern.startDate,
      pattern.numberOfWeeks,
    );

    await assignMutation.mutateAsync({
      patternId: pattern.id,
      data: {
        weekNumber,
        dayOfWeek,
        shiftTemplateId,
        teamId,
      },
    });
  };

  // Handler para remover assignment
  const handleRemoveAssignment = async (assignmentId: string) => {
    await removeMutation.mutateAsync({
      patternId: pattern.id,
      assignmentId,
    });
  };

  return (
    <>
      <ScheduleCalendar
        pattern={pattern}
        shiftTemplates={shiftTemplates}
        teams={teams}
        canManage={canManage}
        onDayClick={handleDayClick}
      />

      <DayAssignmentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        date={selectedDate}
        pattern={pattern}
        shiftTemplates={shiftTemplates}
        teams={teams}
        onAssign={handleAssignTeam}
        onRemove={handleRemoveAssignment}
        isAssigning={assignMutation.isPending || removeMutation.isPending}
      />
    </>
  );
}

// Helper function (precisa estar fora do componente para ser usado pelo modal)
function calculateWeekNumber(date: Date, startDate: string, numberOfWeeks: number): number {
  const patternStart = new Date(startDate + 'T12:00:00');
  const daysDiff = Math.floor((date.getTime() - patternStart.getTime()) / (1000 * 60 * 60 * 24));
  const weeksSinceStart = Math.floor(daysDiff / 7);
  return weeksSinceStart % numberOfWeeks;
}
