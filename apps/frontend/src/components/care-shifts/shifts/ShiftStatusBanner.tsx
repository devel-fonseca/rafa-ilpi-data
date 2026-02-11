// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - ShiftStatusBanner (Banner Operacional do Plantão do Cuidador)
// ──────────────────────────────────────────────────────────────────────────────

import { Clock, AlertCircle, PlayCircle, Users, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckInButton } from './CheckInButton';
import { HandoverDialog } from './HandoverDialog';
import { ShiftNotesEditor } from './ShiftNotesEditor';
import type { Shift, ShiftStatus } from '@/types/care-shifts/care-shifts';

interface ShiftStatusBannerProps {
  shift: Shift | null;
  isLeaderOrSubstitute?: boolean;
  loading?: boolean;
  onCheckInSuccess?: () => void;
  onHandoverSuccess?: () => void;
}

/**
 * Banner operacional que mostra o plantão atual do cuidador
 * Design com alto protagonismo visual para comunicar claramente o status
 */
export function ShiftStatusBanner({
  shift,
  isLeaderOrSubstitute = false,
  loading = false,
  onCheckInSuccess,
  onHandoverSuccess,
}: ShiftStatusBannerProps) {
  // ──────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ──────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // NO SHIFT STATE
  // ──────────────────────────────────────────────────────────────────────────
  if (!shift) {
    return (
      <div className="rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/50">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">
              Sem Plantão Ativo
            </h3>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              Você não está escalado para nenhum plantão no momento.
              Entre em contato com seu supervisor se acredita que deveria estar escalado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SHIFT DATA
  // ──────────────────────────────────────────────────────────────────────────
  const status = shift.status as ShiftStatus;
  const template = shift.shiftTemplate;
  const team = shift.team;
  const startTime = template?.tenantConfig?.customStartTime || template?.startTime;
  const endTime = template?.tenantConfig?.customEndTime || template?.endTime;
  const shiftName = template?.tenantConfig?.customName || template?.name;
  const memberCount = shift.members?.filter(m => !m.removedAt).length || 0;

  // ──────────────────────────────────────────────────────────────────────────
  // IN_PROGRESS - Banner verde com destaque máximo
  // ──────────────────────────────────────────────────────────────────────────
  if (status === 'IN_PROGRESS') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border-2 border-green-500 dark:border-green-600 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Indicador pulsante */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-25" />
                <div className="relative p-3 rounded-full bg-green-500 dark:bg-green-600">
                  <PlayCircle className="w-6 h-6 text-white" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
                    Seu Plantão Está Em Andamento
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h3 className="text-xl font-bold text-green-900 dark:text-green-100">
                    {team?.name || 'Equipe'}
                  </h3>
                  <span className="text-green-700 dark:text-green-300">•</span>
                  <span className="text-green-700 dark:text-green-300 font-medium">
                    {shiftName}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1 text-sm text-green-600 dark:text-green-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {startTime} - {endTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {memberCount} cuidador{memberCount !== 1 ? 'es' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações para Líder/Suplente */}
            {isLeaderOrSubstitute && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <HandoverDialog
                  shift={shift}
                  onSuccess={onHandoverSuccess}
                />
              </div>
            )}
          </div>
        </div>

        {/* Editor de Ocorrências - apenas para líder/suplente */}
        {isLeaderOrSubstitute && (
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 p-4">
            <ShiftNotesEditor
              shiftId={shift.id}
              initialNotes={shift.notes}
            />
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CONFIRMED - Banner âmbar aguardando check-in
  // ──────────────────────────────────────────────────────────────────────────
  if (status === 'CONFIRMED') {
    return (
      <div className="rounded-xl border-2 border-amber-400 dark:border-amber-600 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Indicador de atenção */}
            <div className="p-3 rounded-full bg-amber-500 dark:bg-amber-600 flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Aguardando Check-in
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h3 className="text-xl font-bold text-amber-900 dark:text-amber-100">
                  {team?.name || 'Equipe'}
                </h3>
                <span className="text-amber-700 dark:text-amber-300">•</span>
                <span className="text-amber-700 dark:text-amber-300 font-medium">
                  {shiftName}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1 text-sm text-amber-600 dark:text-amber-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {startTime} - {endTime}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {memberCount} cuidador{memberCount !== 1 ? 'es' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Ações para Líder/Suplente */}
          {isLeaderOrSubstitute && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <CheckInButton
                shift={shift}
                size="default"
                variant="default"
                onSuccess={onCheckInSuccess}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SCHEDULED - Banner neutro (plantão agendado mas não confirmado ainda)
  // ──────────────────────────────────────────────────────────────────────────
  if (status === 'SCHEDULED') {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-5">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-muted flex-shrink-0">
            <Clock className="w-6 h-6 text-muted-foreground" />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Plantão Agendado
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h3 className="text-lg font-semibold text-foreground">
                {team?.name || 'Equipe'}
              </h3>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground font-medium">
                {shiftName}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {startTime} - {endTime}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {memberCount} cuidador{memberCount !== 1 ? 'es' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // COMPLETED / CANCELLED - Estado final
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-5">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-muted flex-shrink-0">
          <Clock className="w-6 h-6 text-muted-foreground" />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {status === 'COMPLETED' ? 'Plantão Concluído' : 'Plantão Cancelado'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h3 className="text-lg font-semibold text-muted-foreground">
              {team?.name || 'Equipe'}
            </h3>
            <span className="text-muted-foreground/60">•</span>
            <span className="text-muted-foreground/80">
              {shiftName}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1 text-sm text-muted-foreground/70">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {startTime} - {endTime}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
