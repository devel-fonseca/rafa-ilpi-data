/* eslint-disable no-restricted-syntax */
// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - ShiftDetailsModal (Modal de Detalhes do Plantão)
// ──────────────────────────────────────────────────────────────────────────────

import { Clock, Users, Calendar, FileText, ClipboardCheck, BarChart3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { CoverageStatusBadge } from '../compliance/CoverageStatusBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateTimeSafe } from '@/utils/dateHelpers';
import { formatShiftStatusLabel } from '@/utils/shiftStatus';
import { POSITION_CODE_LABELS, PositionCode } from '@/types/permissions';
import type { Shift } from '@/types/care-shifts/care-shifts';

interface ShiftDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift | undefined;
  minimumRequired?: number;
}

/**
 * Modal com detalhes completos do plantão
 */
export function ShiftDetailsModal({
  open,
  onOpenChange,
  shift,
  minimumRequired = 0,
}: ShiftDetailsModalProps) {
  if (!shift) return null;

  const activeMembers = shift.members?.filter((m) => !m.removedAt) || [];
  const assignedCount = activeMembers.length;

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    try {
      // Extrair apenas YYYY-MM-DD se vier com timestamp
      const dateOnly = dateString.split('T')[0];
      const date = new Date(dateOnly + 'T12:00:00.000Z');
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Plantão</DialogTitle>
          <DialogDescription>
            Informações completas do plantão e equipe designada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações básicas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Data</span>
              </div>
              <p className="font-medium">{formatDate(shift.date)}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Turno</span>
              </div>
              <p className="font-medium">{shift.shiftTemplate?.name}</p>
              <p className="text-sm text-muted-foreground">
                {shift.shiftTemplate?.startTime} - {shift.shiftTemplate?.endTime}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Status</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{formatShiftStatusLabel(shift.status)}</Badge>
              <CoverageStatusBadge
                assignedCount={assignedCount}
                minimumRequired={minimumRequired}
              />
            </div>
          </div>

          <Separator />

          {/* Equipe */}
          {shift.team && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Equipe</p>
                <div
                  className="flex items-center gap-2 p-3 border rounded-lg"
                  style={{ borderColor: shift.team.color || undefined }}
                >
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: shift.team.color || '#3B82F6' }}
                  />
                  <div>
                    <p className="font-medium">{shift.team.name}</p>
                    {shift.team.description && (
                      <p className="text-sm text-muted-foreground">
                        {shift.team.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Membros */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Cuidadores Designados
              </p>
              <Badge variant="secondary">
                <Users className="h-3 w-3 mr-1" />
                {assignedCount}
              </Badge>
            </div>

            {activeMembers.length > 0 ? (
              <div className="space-y-2">
                {activeMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-2 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(member.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.user.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.user.profile?.positionCode
                          ? POSITION_CODE_LABELS[member.user.profile.positionCode as PositionCode]
                          : 'Cuidador'}
                      </p>
                    </div>
                    {!member.isFromTeam && (
                      <Badge variant="outline" className="text-xs">
                        Extra
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border rounded-lg border-dashed">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum cuidador designado para este plantão
                </p>
              </div>
            )}
          </div>

          {/* Ocorrências do Turno */}
          {shift.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Ocorrências do Turno</span>
                </div>
                <p className="text-sm p-3 bg-muted rounded-lg whitespace-pre-wrap">{shift.notes}</p>
              </div>
            </>
          )}

          {/* Relatório de Passagem (Handover) */}
          {shift.handover && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ClipboardCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span>Relatório de Passagem</span>
                </div>

                {/* Metadados do handover */}
                <div className="text-xs text-muted-foreground">
                  Realizado por{' '}
                  <span className="font-medium text-foreground">
                    {shift.handover.handedOverByUser?.name || 'Usuário'}
                  </span>
                  {shift.handover.createdAt && (
                    <> em {formatDateTimeSafe(shift.handover.createdAt)}</>
                  )}
                </div>

                {/* Relatório */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{shift.handover.report}</p>
                </div>

                {/* Snapshot de Atividades */}
                {shift.handover.activitiesSnapshot && shift.handover.activitiesSnapshot.totalRecords > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <BarChart3 className="h-3 w-3" />
                      <span>Resumo de Atividades ({shift.handover.activitiesSnapshot.totalRecords} registros)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {shift.handover.activitiesSnapshot.byType.map((item) => (
                        <Badge key={item.type} variant="secondary" className="text-xs">
                          {item.type}: {item.count}
                        </Badge>
                      ))}
                    </div>

                    {shift.handover.activitiesSnapshot.totals && (
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          Intercorrências: {shift.handover.activitiesSnapshot.totals.intercurrences}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Medicações: {shift.handover.activitiesSnapshot.totals.medicationAdministrations.total}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Equipe do plantão: {shift.handover.activitiesSnapshot.totals.bySource.shiftMembers}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Outros usuários: {shift.handover.activitiesSnapshot.totals.bySource.others}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Metadados */}
          <Separator />
          <div className="text-xs text-muted-foreground space-y-1">
            {shift.isFromPattern && (
              <p>✓ Gerado automaticamente do padrão semanal</p>
            )}
            <p>
              Criado em: {formatDateTimeSafe(shift.createdAt)}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
