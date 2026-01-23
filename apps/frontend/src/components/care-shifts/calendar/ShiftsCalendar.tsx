// ──────────────────────────────────────────────────────────────────────────────
// COMPONENT - ShiftsCalendar (Calendário de Plantões com Seleção Múltipla)
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Shift } from '@/types/care-shifts/care-shifts';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

interface ShiftsCalendarProps {
  shifts: Shift[];
  onDatesSelect: (dates: Date[]) => void;
  canManage?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export function ShiftsCalendar({
  shifts,
  onDatesSelect,
  canManage = false,
}: ShiftsCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  // Obter todos os dias do mês atual + dias do mês anterior/próximo
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(calendarStart.getDate() - monthStart.getDay());
  const calendarEnd = new Date(monthEnd);
  calendarEnd.setDate(calendarEnd.getDate() + (6 - monthEnd.getDay()));

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Obter plantões de um dia específico
  const getDayShifts = (date: Date): Shift[] => {
    return shifts.filter((shift) => {
      // shift.date pode vir como "2026-01-23" ou "2026-01-23T00:00:00.000Z"
      const dateStr = shift.date.split('T')[0]; // Extrai apenas YYYY-MM-DD
      const shiftDate = new Date(dateStr + 'T12:00:00');
      return isSameDay(startOfDay(shiftDate), startOfDay(date));
    });
  };

  // Verificar se dia está selecionado
  const isDateSelected = (date: Date): boolean => {
    return selectedDates.some((d) => isSameDay(d, date));
  };

  // Handler de clique no dia
  const handleDayClick = (date: Date) => {
    if (!canManage) return;

    // Não permitir seleção de datas passadas
    const today = startOfDay(new Date());
    if (date < today) return;

    const isSelected = isDateSelected(date);

    let newSelection: Date[];
    if (isSelected) {
      // Deselecionar
      newSelection = selectedDates.filter((d) => !isSameDay(d, date));
    } else {
      // Selecionar
      newSelection = [...selectedDates, date];
    }

    setSelectedDates(newSelection);
  };

  // Limpar seleção
  const clearSelection = () => {
    setSelectedDates([]);
  };

  // Confirmar seleção
  const confirmSelection = () => {
    if (selectedDates.length > 0) {
      onDatesSelect(selectedDates);
      clearSelection();
    }
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
              onClick={() => setCurrentMonth(startOfMonth(new Date()))}
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

        {/* Barra de seleção */}
        {canManage && selectedDates.length > 0 && (
          <div className="mb-4 p-3 bg-primary/10 rounded-lg flex items-center justify-between">
            <p className="text-sm font-medium">
              {selectedDates.length} dia(s) selecionado(s)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Limpar
              </Button>
              <Button size="sm" onClick={confirmSelection}>
                Designar Equipes
              </Button>
            </div>
          </div>
        )}

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
            const dayShifts = getDayShifts(date);
            const isSelected = isDateSelected(date);
            const isToday = isSameDay(date, new Date());
            const isPast = date < startOfDay(new Date());
            const isDisabled = !canManage || isPast;

            return (
              <button
                key={date.toISOString()}
                onClick={() => handleDayClick(date)}
                disabled={isDisabled}
                className={cn(
                  'min-h-[80px] p-2 border rounded-lg text-left transition-all',
                  canManage && !isPast && 'hover:bg-accent hover:border-primary cursor-pointer',
                  isDisabled && 'cursor-not-allowed',
                  !isCurrentMonth && 'opacity-40',
                  isPast && 'opacity-50',
                  isToday && 'ring-2 ring-primary ring-offset-1',
                  isSelected && 'bg-primary/20 border-2 border-primary',
                  dayShifts.length > 0 && 'bg-accent/50 border-accent',
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
                  {dayShifts.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {dayShifts.length}
                    </span>
                  )}
                </div>

                {/* Indicadores coloridos das equipes */}
                {dayShifts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {dayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className={cn(
                          'w-2 h-2 rounded-full',
                          isPast && 'opacity-100', // Manter bolinhas visíveis em dias passados
                        )}
                        style={{
                          backgroundColor: shift.team?.color || '#64748b',
                        }}
                        title={`${shift.shiftTemplate?.name || 'Turno'} - ${shift.team?.name || 'Sem equipe'}`}
                      />
                    ))}
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
              <div className="h-4 w-4 border border-accent rounded bg-accent/50" />
              <span>Dia com plantões</span>
            </div>
            {canManage && (
              <>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-primary rounded bg-primary/20" />
                  <span>Dia selecionado</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  💡 Clique nos dias para selecionar múltiplos
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
