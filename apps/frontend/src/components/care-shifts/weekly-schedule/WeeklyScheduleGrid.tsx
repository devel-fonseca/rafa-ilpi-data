// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - WeeklyScheduleGrid (Grid Matricial 7×N Turnos)
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Calendar, Users, Plus, X, MousePointerClick } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTeams } from '@/hooks/care-shifts/useTeams';
import {
  useAssignTeamToPattern,
  useRemovePatternAssignment,
} from '@/hooks/care-shifts/useWeeklySchedule';
import type {
  WeeklySchedulePattern,
  WeeklySchedulePatternAssignment,
} from '@/types/care-shifts/weekly-schedule';
import type { ShiftTemplate } from '@/types/care-shifts/shift-templates';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

interface WeeklyScheduleGridProps {
  pattern: WeeklySchedulePattern;
  shiftTemplates: ShiftTemplate[];
  canManage?: boolean;
}

interface CellData {
  weekNumber: number;
  dayOfWeek: number;
  shiftTemplateId: string;
  assignment?: WeeklySchedulePatternAssignment;
}

// ────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  { index: 0, label: 'Dom', fullLabel: 'Domingo' },
  { index: 1, label: 'Seg', fullLabel: 'Segunda' },
  { index: 2, label: 'Ter', fullLabel: 'Terça' },
  { index: 3, label: 'Qua', fullLabel: 'Quarta' },
  { index: 4, label: 'Qui', fullLabel: 'Quinta' },
  { index: 5, label: 'Sex', fullLabel: 'Sexta' },
  { index: 6, label: 'Sáb', fullLabel: 'Sábado' },
];

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export function WeeklyScheduleGrid({
  pattern,
  shiftTemplates,
  canManage = false,
}: WeeklyScheduleGridProps) {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null);
  const [selectedCells, setSelectedCells] = useState<CellData[]>([]); // ✨ NOVO: Seleção múltipla
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  const { data: teamsData } = useTeams({ isActive: true });
  const assignMutation = useAssignTeamToPattern();
  const removeMutation = useRemovePatternAssignment();

  const teams = teamsData?.data || [];
  const activeShiftTemplates = shiftTemplates.filter(
    (st) => st.isActive !== false,
  );

  const numberOfWeeks = pattern.numberOfWeeks || 1;

  // Função para buscar assignment (inclui weekNumber)
  const getAssignment = (
    weekNumber: number,
    dayOfWeek: number,
    shiftTemplateId: string,
  ): WeeklySchedulePatternAssignment | undefined => {
    return pattern.assignments?.find(
      (a) =>
        a.weekNumber === weekNumber &&
        a.dayOfWeek === dayOfWeek &&
        a.shiftTemplateId === shiftTemplateId,
    );
  };

  // Helper para verificar se célula está selecionada
  const isCellSelected = (weekNumber: number, dayOfWeek: number, shiftTemplateId: string): boolean => {
    return selectedCells.some(
      (cell) =>
        cell.weekNumber === weekNumber &&
        cell.dayOfWeek === dayOfWeek &&
        cell.shiftTemplateId === shiftTemplateId,
    );
  };

  // Handler de clique na célula (com suporte a Ctrl+Click)
  const handleCellClick = (
    weekNumber: number,
    dayOfWeek: number,
    shiftTemplateId: string,
    event: React.MouseEvent,
  ) => {
    if (!canManage) return;

    const assignment = getAssignment(weekNumber, dayOfWeek, shiftTemplateId);
    const cellData: CellData = { weekNumber, dayOfWeek, shiftTemplateId, assignment };

    // ✨ CTRL+CLICK: Seleção múltipla
    if (event.ctrlKey || event.metaKey) {
      const isAlreadySelected = isCellSelected(weekNumber, dayOfWeek, shiftTemplateId);

      if (isAlreadySelected) {
        // Remover da seleção
        setSelectedCells((prev) =>
          prev.filter(
            (cell) =>
              !(
                cell.weekNumber === weekNumber &&
                cell.dayOfWeek === dayOfWeek &&
                cell.shiftTemplateId === shiftTemplateId
              ),
          ),
        );
      } else {
        // Adicionar à seleção
        setSelectedCells((prev) => [...prev, cellData]);
      }
    } else {
      // CLIQUE NORMAL: Seleção única
      setSelectedCell(cellData);
      setSelectedCells([cellData]);
      setSelectedTeamId(assignment?.teamId || '');
      setDialogOpen(true);
    }
  };

  // Handler de designar equipe (suporta múltiplas células)
  const handleAssignTeam = async () => {
    if (selectedCells.length === 0 || !selectedTeamId) return;

    // ✨ Aplicar equipe a todas as células selecionadas
    for (const cell of selectedCells) {
      await assignMutation.mutateAsync({
        patternId: pattern.id,
        data: {
          weekNumber: cell.weekNumber,
          dayOfWeek: cell.dayOfWeek,
          shiftTemplateId: cell.shiftTemplateId,
          teamId: selectedTeamId,
        },
      });
    }

    setDialogOpen(false);
    setSelectedCell(null);
    setSelectedCells([]);
    setSelectedTeamId('');
  };

  // Handler de remover designação (suporta múltiplas células)
  const handleRemoveAssignment = async () => {
    // ✨ Remover todas as designações das células selecionadas
    for (const cell of selectedCells) {
      if (cell.assignment) {
        await removeMutation.mutateAsync({
          patternId: pattern.id,
          assignmentId: cell.assignment.id,
        });
      }
    }

    setDialogOpen(false);
    setSelectedCell(null);
    setSelectedCells([]);
  };

  // Encontrar equipe por ID
  const getTeamById = (teamId: string | null | undefined) => {
    if (!teamId) return null;
    return teams.find((t: { id: string }) => t.id === teamId);
  };

  // Renderizar grid para uma semana específica
  const renderWeekGrid = (weekNumber: number) => {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              {/* Header com dias da semana */}
              <thead>
                <tr>
                  <th className="border border-border bg-muted/50 p-3 text-left font-semibold sticky left-0 z-10">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="hidden sm:inline">Turno</span>
                    </div>
                  </th>
                  {DAYS_OF_WEEK.map((day) => (
                    <th
                      key={day.index}
                      className="border border-border bg-muted/50 p-3 text-center font-semibold min-w-[120px]"
                    >
                      <div>
                        <span className="sm:hidden">{day.label}</span>
                        <span className="hidden sm:inline">{day.fullLabel}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Body com turnos × dias */}
              <tbody>
                {activeShiftTemplates.map((shiftTemplate) => (
                  <tr key={shiftTemplate.id}>
                    {/* Coluna de turno (sticky) */}
                    <td className="border border-border bg-muted/20 p-3 font-medium sticky left-0 z-10">
                      <div>
                        <div className="text-sm font-semibold">
                          {shiftTemplate.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {shiftTemplate.startTime} - {shiftTemplate.endTime}
                        </div>
                      </div>
                    </td>

                    {/* Células de cada dia */}
                    {DAYS_OF_WEEK.map((day) => {
                      const assignment = getAssignment(
                        weekNumber,
                        day.index,
                        shiftTemplate.id,
                      );
                      const team = getTeamById(assignment?.teamId);

                      const isSelected = isCellSelected(weekNumber, day.index, shiftTemplate.id);

                      return (
                        <td
                          key={`${weekNumber}-${day.index}-${shiftTemplate.id}`}
                          className={cn(
                            'border border-border p-2 text-center align-middle transition-colors',
                            canManage &&
                              'cursor-pointer hover:bg-accent/50 active:bg-accent',
                            team && 'bg-accent/20',
                            // ✨ NOVO: Highlight para células selecionadas
                            isSelected && 'ring-2 ring-primary ring-inset bg-primary/10',
                          )}
                          onClick={(e) =>
                            handleCellClick(weekNumber, day.index, shiftTemplate.id, e)
                          }
                        >
                          {team ? (
                            <div className="flex flex-col items-center gap-1">
                              <Badge
                                variant="secondary"
                                className="text-xs font-medium"
                                style={{
                                  backgroundColor: team.color
                                    ? `${team.color}20`
                                    : undefined,
                                  borderColor: team.color || undefined,
                                  color: team.color || undefined,
                                }}
                              >
                                {team.name}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                <span>
                                  {team.members?.filter((m: { removedAt: string | null }) => !m.removedAt)
                                    .length || 0}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center text-muted-foreground/40">
                              {canManage ? (
                                <Plus className="h-4 w-4" />
                              ) : (
                                <span className="text-xs">-</span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {/* Se padrão é de 1 semana, renderizar grid direto */}
      {numberOfWeeks === 1 ? (
        renderWeekGrid(0)
      ) : (
        /* Se padrão é de múltiplas semanas, renderizar com tabs */
        <Tabs value={selectedWeek.toString()} onValueChange={(v) => setSelectedWeek(Number(v))}>
          <TabsList className="mb-4">
            {Array.from({ length: numberOfWeeks }, (_, i) => i).map((weekNum) => (
              <TabsTrigger key={weekNum} value={weekNum.toString()}>
                Semana {weekNum + 1}
              </TabsTrigger>
            ))}
          </TabsList>

          {Array.from({ length: numberOfWeeks }, (_, i) => i).map((weekNum) => (
            <TabsContent key={weekNum} value={weekNum.toString()}>
              {renderWeekGrid(weekNum)}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Legenda (após o grid) */}
      <Card>
        <CardContent className="py-4">
          <div className="space-y-3">
            {/* Legenda Visual */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 border border-border rounded flex items-center justify-center bg-accent/20">
                  <Calendar className="h-4 w-4" />
                </div>
                <span>Célula com equipe designada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 border border-border rounded flex items-center justify-center">
                  <span className="text-muted-foreground/40">-</span>
                </div>
                <span>Célula vazia (sem equipe)</span>
              </div>
              {canManage && (
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 border border-border ring-2 ring-primary ring-inset bg-primary/10 rounded flex items-center justify-center">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span>Célula selecionada</span>
                </div>
              )}
            </div>

            {/* Instruções de Seleção Múltipla */}
            {canManage && (
              <div className="pt-2 border-t">
                <div className="flex items-start gap-2">
                  <MousePointerClick className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      <strong>Seleção múltipla:</strong> Segure <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl</kbd> e clique em múltiplas células para designar a mesma equipe de uma só vez
                    </p>
                    {selectedCells.length > 0 && (
                      <p className="text-xs font-medium text-primary">
                        {selectedCells.length} {selectedCells.length === 1 ? 'célula selecionada' : 'células selecionadas'}
                        {selectedCells.length > 1 && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 ml-2 text-xs"
                            onClick={() => {
                              setSelectedCells([]);
                              setSelectedCell(null);
                            }}
                          >
                            Limpar seleção
                          </Button>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Designação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Designar Equipe</DialogTitle>
            <DialogDescription>
              {selectedCells.length > 1 ? (
                // ✨ NOVO: Mensagem para múltiplas células
                <>
                  Atribuir equipe para <strong>{selectedCells.length} células selecionadas</strong>
                </>
              ) : selectedCell ? (
                // Mensagem para célula única
                <>
                  {numberOfWeeks > 1 && (
                    <>
                      <strong>Semana {selectedCell.weekNumber + 1}</strong> -{' '}
                    </>
                  )}
                  Atribuir equipe para{' '}
                  <strong>
                    {
                      DAYS_OF_WEEK.find((d) => d.index === selectedCell.dayOfWeek)
                        ?.fullLabel
                    }
                  </strong>{' '}
                  -{' '}
                  <strong>
                    {
                      shiftTemplates.find(
                        (st) => st.id === selectedCell.shiftTemplateId,
                      )?.name
                    }
                  </strong>
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team">Equipe</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger id="team">
                  <SelectValue placeholder="Selecione uma equipe" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team: { id: string; name: string; color?: string | null; members?: Array<{ removedAt: string | null }> }) => (
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

            <div className="flex items-center justify-between gap-2 pt-2">
              {/* ✨ ATUALIZADO: Mostrar botão Remover se qualquer célula selecionada tiver assignment */}
              {selectedCells.some((cell) => cell.assignment) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveAssignment}
                  disabled={removeMutation.isPending}
                >
                  <X className="mr-2 h-4 w-4" />
                  {selectedCells.length > 1 ? `Remover (${selectedCells.filter((c) => c.assignment).length})` : 'Remover'}
                </Button>
              )}
              <div className="flex-1" />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleAssignTeam}
                disabled={!selectedTeamId || assignMutation.isPending}
              >
                Designar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
