// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - DayAssignmentModal (Modal de Designação por Dia)
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { WeeklySchedulePattern } from '@/types/care-shifts/weekly-schedule';
import type { ShiftTemplate } from '@/types/care-shifts/shift-templates';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

interface DayAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  pattern: WeeklySchedulePattern;
  shiftTemplates: ShiftTemplate[];
  teams: Array<{ id: string; name: string; color?: string | null; members?: Array<{ removedAt: string | null }> }>;
  onAssign: (shiftTemplateId: string, teamId: string) => Promise<void>;
  onRemove: (assignmentId: string) => Promise<void>;
  isAssigning: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Calcula weekNumber baseado no startDate do padrão
 */
function calculateWeekNumber(date: Date, startDate: string, numberOfWeeks: number): number {
  const patternStart = new Date(startDate + 'T12:00:00');
  const daysDiff = Math.floor((date.getTime() - patternStart.getTime()) / (1000 * 60 * 60 * 24));
  const weeksSinceStart = Math.floor(daysDiff / 7);
  return weeksSinceStart % numberOfWeeks;
}

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export function DayAssignmentModal({
  open,
  onOpenChange,
  date,
  pattern,
  shiftTemplates,
  teams,
  onAssign,
  onRemove,
  isAssigning,
}: DayAssignmentModalProps) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  // Carregar assignments existentes quando abrir o modal
  useEffect(() => {
    if (!open || !date) {
      setAssignments({});
      return;
    }

    const dayOfWeek = date.getDay();
    const weekNumber = calculateWeekNumber(date, pattern.startDate, pattern.numberOfWeeks);

    const existing: Record<string, string> = {};
    pattern.assignments?.forEach((assignment) => {
      if (assignment.weekNumber === weekNumber && assignment.dayOfWeek === dayOfWeek) {
        existing[assignment.shiftTemplateId] = assignment.teamId || '';
      }
    });

    setAssignments(existing);
  }, [open, date, pattern]);

  if (!date) return null;

  const dayOfWeek = date.getDay();
  const weekNumber = calculateWeekNumber(date, pattern.startDate, pattern.numberOfWeeks);

  // Handler para salvar todas as designações
  const handleSave = async () => {
    for (const shiftTemplateId of Object.keys(assignments)) {
      const teamId = assignments[shiftTemplateId];
      if (teamId) {
        await onAssign(shiftTemplateId, teamId);
      }
    }
    onOpenChange(false);
  };

  // Handler para remover assignment
  const handleRemoveAssignment = async (shiftTemplateId: string) => {
    const assignment = pattern.assignments?.find(
      (a) =>
        a.weekNumber === weekNumber &&
        a.dayOfWeek === dayOfWeek &&
        a.shiftTemplateId === shiftTemplateId,
    );

    if (assignment) {
      await onRemove(assignment.id);
      setAssignments((prev) => {
        const updated = { ...prev };
        delete updated[shiftTemplateId];
        return updated;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Designar Equipes</DialogTitle>
          <DialogDescription>
            Configure as equipes para cada turno deste dia
          </DialogDescription>
        </DialogHeader>

        {/* Info do dia */}
        <div className="bg-muted p-3 rounded-lg space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">
              {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Padrão: Semana {weekNumber + 1} de {pattern.numberOfWeeks}
          </p>
        </div>

        {/* Designações por turno */}
        <div className="space-y-4">
          {shiftTemplates
            .filter((st) => st.isActive !== false)
            .map((shiftTemplate) => {
              const currentAssignment = pattern.assignments?.find(
                (a) =>
                  a.weekNumber === weekNumber &&
                  a.dayOfWeek === dayOfWeek &&
                  a.shiftTemplateId === shiftTemplate.id,
              );
              const selectedTeamId = assignments[shiftTemplate.id] || '';

              return (
                <div key={shiftTemplate.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`shift-${shiftTemplate.id}`}>
                      <div>
                        <p className="font-medium">{shiftTemplate.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {shiftTemplate.startTime} - {shiftTemplate.endTime}
                        </p>
                      </div>
                    </Label>
                    {currentAssignment && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAssignment(shiftTemplate.id)}
                        disabled={isAssigning}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <Select
                    value={selectedTeamId}
                    onValueChange={(value) =>
                      setAssignments((prev) => ({
                        ...prev,
                        [shiftTemplate.id]: value,
                      }))
                    }
                  >
                    <SelectTrigger id={`shift-${shiftTemplate.id}`}>
                      <SelectValue placeholder="Selecione uma equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            {team.color && (
                              <div
                                className="h-3 w-3 rounded-full border"
                                style={{ backgroundColor: team.color }}
                              />
                            )}
                            <span>{team.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({team.members?.filter((m) => !m.removedAt).length || 0}{' '}
                              membros)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAssigning}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isAssigning}>
            {isAssigning ? 'Salvando...' : 'Salvar Designações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
