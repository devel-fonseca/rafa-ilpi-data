// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - ScheduleCalendar (Calendário de Designação de Escalas)
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isBefore, startOfDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WeeklySchedulePattern } from '@/types/care-shifts/weekly-schedule';
import type { ShiftTemplate } from '@/types/care-shifts/shift-templates';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

interface ScheduleCalendarProps {
  pattern: WeeklySchedulePattern;
  shiftTemplates: ShiftTemplate[];
  teams: Array<{ id: string; name: string; color?: string | null }>;
  canManage?: boolean;
  onDayClick?: (date: Date) => void;
}

interface DayAssignments {
  [shiftTemplateId: string]: {
    teamId: string | null;
    teamName: string;
    teamColor?: string | null;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

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

export function ScheduleCalendar({
  pattern,
  shiftTemplates,
  teams,
  canManage = false,
  onDayClick,
}: ScheduleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));

  // Calcular data de início do padrão
  const patternStartDate = pattern.startDate
    ? new Date(pattern.startDate + 'T12:00:00')
    : new Date();

  // Atualizar currentMonth quando pattern.startDate carregar
  useEffect(() => {
    if (pattern.startDate) {
      const start = new Date(pattern.startDate + 'T12:00:00');
      setCurrentMonth(startOfMonth(start));
    }
  }, [pattern.startDate]);

  // Obter todos os dias do mês atual + dias do mês anterior/próximo para preencher o grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = addDays(monthStart, -monthStart.getDay()); // Voltar até domingo
  const calendarEnd = addDays(monthEnd, 6 - monthEnd.getDay()); // Avançar até sábado

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Função para obter assignments de um dia específico
  const getDayAssignments = (date: Date): DayAssignments => {
    const dayOfWeek = date.getDay();
    const weekNumber = calculateWeekNumber(date, pattern.startDate, pattern.numberOfWeeks);

    const assignments: DayAssignments = {};

    pattern.assignments?.forEach((assignment) => {
      if (assignment.weekNumber === weekNumber && assignment.dayOfWeek === dayOfWeek) {
        const team = teams.find((t) => t.id === assignment.teamId);
        const shiftTemplate = shiftTemplates.find((st) => st.id === assignment.shiftTemplateId);

        if (shiftTemplate) {
          assignments[assignment.shiftTemplateId] = {
            teamId: assignment.teamId || null,
            teamName: team?.name || 'Sem equipe',
            teamColor: team?.color,
          };
        }
      }
    });

    return assignments;
  };

  // Handler de clique no dia
  const handleDayClick = (date: Date) => {
    if (!canManage) return;
    if (isBefore(startOfDay(date), startOfDay(patternStartDate))) return; // Não permite antes do startDate
    onDayClick?.(date);
  };

  return (
    <Card>
      <CardContent className="p-6">
        {/* Header com navegação de mês */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(startOfMonth(patternStartDate))}
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Grid do calendário */}
        <div className="grid grid-cols-7 gap-1">
          {/* Header dos dias da semana */}
          {WEEKDAY_LABELS.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}

          {/* Células dos dias */}
          {calendarDays.map((date) => {
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isBeforeStart = isBefore(startOfDay(date), startOfDay(patternStartDate));
            const assignments = getDayAssignments(date);
            const hasAssignments = Object.keys(assignments).length > 0;
            const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

            return (
              <button
                key={date.toISOString()}
                onClick={() => handleDayClick(date)}
                disabled={!canManage || isBeforeStart}
                className={cn(
                  'min-h-[80px] p-2 border rounded-lg text-left transition-all',
                  'hover:bg-accent hover:border-primary',
                  !isCurrentMonth && 'opacity-40',
                  isBeforeStart && 'cursor-not-allowed opacity-20',
                  isToday && 'ring-2 ring-primary ring-offset-1',
                  !canManage && 'cursor-default hover:bg-transparent hover:border-border',
                )}
              >
                {/* Número do dia */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      !isCurrentMonth && 'text-muted-foreground',
                      isToday && 'text-primary font-bold',
                    )}
                  >
                    {format(date, 'd')}
                  </span>
                  {hasAssignments && (
                    <span className="text-xs text-muted-foreground">
                      {Object.keys(assignments).length}
                    </span>
                  )}
                </div>

                {/* Equipes designadas */}
                {hasAssignments && (
                  <div className="space-y-1">
                    {Object.values(assignments).slice(0, 2).map((assignment, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="w-full justify-start text-xs font-normal truncate"
                        style={{
                          backgroundColor: assignment.teamColor
                            ? `${assignment.teamColor}20`
                            : undefined,
                          borderColor: assignment.teamColor || undefined,
                          color: assignment.teamColor || undefined,
                        }}
                      >
                        {assignment.teamName}
                      </Badge>
                    ))}
                    {Object.keys(assignments).length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{Object.keys(assignments).length - 2}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="mt-6 pt-4 border-t space-y-2">
          <p className="text-sm font-medium">Legenda:</p>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-primary rounded" />
              <span>Hoje</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 border border-border rounded bg-accent" />
              <span>Dia com equipes designadas</span>
            </div>
            {canManage && (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border border-border rounded opacity-20" />
                <span>Dia anterior ao início do padrão</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
