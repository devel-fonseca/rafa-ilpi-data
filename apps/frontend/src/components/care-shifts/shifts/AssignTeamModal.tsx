// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - AssignTeamModal (Modal para Designar Equipe)
// ──────────────────────────────────────────────────────────────────────────────

import { Loader2, Users } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useTeams } from '@/hooks/care-shifts/useTeams';
import { useAssignTeam } from '@/hooks/care-shifts/useShifts';
import type { Shift } from '@/types/care-shifts/care-shifts';

const assignTeamSchema = z.object({
  teamId: z.string().min(1, 'Selecione uma equipe'),
});

type AssignTeamFormData = z.infer<typeof assignTeamSchema>;

interface AssignTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift | undefined;
}

/**
 * Modal para designar equipe a um plantão
 */
export function AssignTeamModal({
  open,
  onOpenChange,
  shift,
}: AssignTeamModalProps) {
  const assignMutation = useAssignTeam();
  const { data: teamsData, isLoading: isLoadingTeams } = useTeams({
    isActive: true,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AssignTeamFormData>({
    resolver: zodResolver(assignTeamSchema),
    defaultValues: {
      teamId: '',
    },
  });

  const teams = teamsData?.data || [];
  const isLoading = assignMutation.isPending;

  const onSubmit = async (data: AssignTeamFormData) => {
    if (!shift) return;

    try {
      await assignMutation.mutateAsync({
        shiftId: shift.id,
        data: {
          teamId: data.teamId,
          reason: 'Designação de equipe ao plantão'
        },
      });
      onOpenChange(false);
      reset();
    } catch (error) {
      // Erro tratado pelo hook
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        onOpenChange(newOpen);
        if (!newOpen) reset();
      }}
    >
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Designar Equipe</DialogTitle>
          <DialogDescription>
            Selecione a equipe que será designada para este plantão. Todos os
            membros ativos da equipe serão adicionados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Informações do Plantão */}
          {shift && (
            <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
              <p>
                <span className="font-medium">Data:</span>{' '}
                {new Date(shift.date).toLocaleDateString('pt-BR')}
              </p>
              <p>
                <span className="font-medium">Turno:</span>{' '}
                {shift.shiftTemplate?.name} ({shift.shiftTemplate?.startTime} -{' '}
                {shift.shiftTemplate?.endTime})
              </p>
            </div>
          )}

          {/* Seleção de Equipe */}
          <div className="space-y-2">
            <Label htmlFor="teamId">
              Equipe <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="teamId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLoading || isLoadingTeams}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => {
                      const activeMembers = team.members.filter(
                        (m) => !m.removedAt,
                      ).length;
                      return (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full border"
                              style={{
                                backgroundColor: team.color || '#3B82F6',
                              }}
                            />
                            <span>{team.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({activeMembers} {activeMembers === 1 ? 'membro' : 'membros'})
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.teamId && (
              <p className="text-sm text-destructive">{errors.teamId.message}</p>
            )}
          </div>

          {/* Informação adicional */}
          <div className="p-3 bg-info/10 rounded-lg text-sm text-info flex items-start gap-2">
            <Users className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Todos os membros ativos da equipe selecionada serão automaticamente
              adicionados a este plantão.
            </p>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || teams.length === 0}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Designar Equipe
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
