// ──────────────────────────────────────────────────────────────────────────────
// COMPONENT - BulkAssignModal (Modal para Designação em Lote)
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ShiftTemplate } from '@/types/care-shifts/shift-templates';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

interface BulkAssignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dates: Date[];
  shiftTemplates: ShiftTemplate[];
  teams: Array<{ id: string; name: string; color?: string | null }>;
  onConfirm: (assignments: Array<{ date: string; shiftTemplateId: string; teamId: string }>) => void;
  isSubmitting: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export function BulkAssignModal({
  open,
  onOpenChange,
  dates,
  shiftTemplates,
  teams,
  onConfirm,
  isSubmitting,
}: BulkAssignModalProps) {
  const [selectedShiftTemplateId, setSelectedShiftTemplateId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  // Resetar ao fechar
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedShiftTemplateId('');
      setSelectedTeamId('');
    }
    onOpenChange(newOpen);
  };

  // Handler de confirmação
  const handleConfirm = () => {
    if (!selectedShiftTemplateId || !selectedTeamId) return;

    // Gerar combinações (dates × 1 turno)
    const assignments: Array<{ date: string; shiftTemplateId: string; teamId: string }> = [];

    dates.forEach((date) => {
      assignments.push({
        date: format(date, 'yyyy-MM-dd'),
        shiftTemplateId: selectedShiftTemplateId,
        teamId: selectedTeamId,
      });
    });

    onConfirm(assignments);
  };

  const canConfirm = !!selectedShiftTemplateId && !!selectedTeamId;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Designar Equipe em Lote</DialogTitle>
          <DialogDescription>
            Crie plantões para os dias selecionados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dias selecionados */}
          <div className="bg-muted p-3 rounded-lg space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">
                {dates.length} dia(s) selecionado(s)
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {dates.slice(0, 5).map((date) => (
                <span key={date.toISOString()} className="text-xs text-muted-foreground">
                  {format(date, 'dd/MM', { locale: ptBR })}
                </span>
              ))}
              {dates.length > 5 && (
                <span className="text-xs text-muted-foreground">
                  +{dates.length - 5}
                </span>
              )}
            </div>
          </div>

          {/* Selecionar turno */}
          <div className="space-y-2">
            <Label>Turno</Label>
            <div className="space-y-2 border rounded-lg p-3">
              <RadioGroup
                value={selectedShiftTemplateId}
                onValueChange={setSelectedShiftTemplateId}
                className="space-y-2"
              >
                {shiftTemplates
                  .filter((st) => st.isActive && st.tenantConfig?.isEnabled !== false)
                  .map((template) => (
                    <div key={template.id} className="flex items-center gap-2">
                      <RadioGroupItem id={template.id} value={template.id} />
                      <label htmlFor={template.id} className="text-sm flex-1 cursor-pointer">
                        {template.name} ({template.startTime} - {template.endTime})
                      </label>
                    </div>
                  ))}
              </RadioGroup>
              {shiftTemplates.filter((st) => st.isActive && st.tenantConfig?.isEnabled !== false)
                .length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhum turno disponível. Configure os turnos na aba "Configurar Turnos".
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Selecione um turno para criação em lote
            </p>
          </div>

          {/* Selecionar equipe */}
          <div className="space-y-2">
            <Label htmlFor="team">Equipe</Label>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger id="team">
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
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resumo */}
          {canConfirm && (
            <div className="bg-primary/10 p-3 rounded-lg">
              <p className="text-sm font-medium text-primary">
                Total: {dates.length} dia(s) × 1 turno = {dates.length} plantão(ões)
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || isSubmitting}
          >
            {isSubmitting ? 'Criando...' : 'Criar Plantão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
