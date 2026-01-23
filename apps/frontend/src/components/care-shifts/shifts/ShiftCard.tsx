// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - ShiftCard (Card de Plantão Individual)
// ──────────────────────────────────────────────────────────────────────────────

import { Clock, Users, MoreVertical, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CoverageStatusBadge } from '../compliance/CoverageStatusBadge';
import type { Shift } from '@/types/care-shifts/care-shifts';

interface ShiftCardProps {
  shift: Shift;
  minimumRequired?: number;
  onViewDetails?: () => void;
  onAssignTeam?: () => void;
  onSubstitute?: () => void;
  onDelete?: () => void;
  canManage?: boolean;
}

/**
 * Card visual de plantão individual com status de conformidade
 */
export function ShiftCard({
  shift,
  minimumRequired = 0,
  onViewDetails,
  onAssignTeam,
  onSubstitute,
  onDelete,
  canManage = false,
}: ShiftCardProps) {
  const activeMembers = shift.members?.filter((m) => !m.removedAt) || [];
  const assignedCount = activeMembers.length;

  // Pegar as iniciais do nome para o avatar
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          {/* Cabeçalho */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base">
                {shift.shiftTemplate?.name || 'Turno'}
              </h3>
              <CoverageStatusBadge
                assignedCount={assignedCount}
                minimumRequired={minimumRequired}
                showIcon={true}
                showCount={false}
              />
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {shift.shiftTemplate?.startTime} - {shift.shiftTemplate?.endTime}
              </span>
            </div>
          </div>

          {/* Menu de ações */}
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onViewDetails}>
                  Ver Detalhes
                </DropdownMenuItem>
                {assignedCount === 0 && (
                  <DropdownMenuItem onClick={onAssignTeam}>
                    Designar Equipe
                  </DropdownMenuItem>
                )}
                {assignedCount > 0 && (
                  <DropdownMenuItem onClick={onSubstitute}>
                    Substituir
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Plantão
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Equipe */}
        {shift.team && (
          <div className="mb-3">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Equipe:
            </p>
            <div
              className="flex items-center gap-2 text-sm"
              style={{ color: shift.team.color || undefined }}
            >
              <div
                className="w-3 h-3 rounded-full border"
                style={{ backgroundColor: shift.team.color || '#3B82F6' }}
              />
              <span className="font-medium">{shift.team.name}</span>
            </div>
          </div>
        )}

        {/* Membros */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>
              {assignedCount}/{minimumRequired} cuidador{minimumRequired !== 1 ? 'es' : ''}
            </span>
          </div>

          {activeMembers.length > 0 ? (
            <div className="flex items-center gap-2 flex-wrap">
              {activeMembers.slice(0, 4).map((member) => (
                <div key={member.id} className="flex items-center gap-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(member.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{member.user.name.split(' ')[0]}</span>
                </div>
              ))}
              {activeMembers.length > 4 && (
                <span className="text-xs text-muted-foreground">
                  +{activeMembers.length - 4}
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Nenhum cuidador designado
            </p>
          )}
        </div>

        {/* Botão Ver Detalhes (se não tiver menu) */}
        {!canManage && onViewDetails && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={onViewDetails}
          >
            Ver Detalhes
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
