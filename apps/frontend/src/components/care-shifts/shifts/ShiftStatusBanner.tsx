/* eslint-disable no-restricted-syntax */
// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - ShiftStatusBanner (Banner Operacional do Plantão do Cuidador)
// ──────────────────────────────────────────────────────────────────────────────

import { Clock, AlertCircle, AlertTriangle, PlayCircle, Users, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckInButton } from './CheckInButton';
import { HandoverDialog } from './HandoverDialog';
import { ShiftNotesEditor } from './ShiftNotesEditor';
import { ShiftStatus } from '@/types/care-shifts/care-shifts';
import { isShiftPendingClosure, getMinutesSinceExpectedEnd } from '@/utils/shiftStatus';
import type { Shift } from '@/types/care-shifts/care-shifts';

interface ShiftStatusBannerProps {
  shift: Shift | null;
  isLeaderOrSubstitute?: boolean;
  loading?: boolean;
  timezone?: string;
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
  timezone,
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

  // Detectar se plantão IN_PROGRESS já passou do horário (PENDING_CLOSURE efetivo)
  const effectivePendingClosure = status === ShiftStatus.PENDING_CLOSURE ||
    (status === ShiftStatus.IN_PROGRESS && isShiftPendingClosure(shift, timezone));
  const minutesOverdue = getMinutesSinceExpectedEnd(shift, timezone);

  // Formatar tempo excedido
  const formatOverdueTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  // ──────────────────────────────────────────────────────────────────────────
  // PENDING_CLOSURE - Banner vermelho para encerramento pendente
  // ──────────────────────────────────────────────────────────────────────────
  if (effectivePendingClosure) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border-2 border-red-500 dark:border-red-600 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/40 p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Indicador de alerta pulsante */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-full bg-red-500 animate-pulse opacity-25" />
                <div className="relative p-3 rounded-full bg-red-500 dark:bg-red-600">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                    Encerramento Pendente
                  </span>
                  {minutesOverdue > 0 && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                      +{formatOverdueTime(minutesOverdue)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h3 className="text-xl font-bold text-red-900 dark:text-red-100">
                    {team?.name || 'Equipe'}
                  </h3>
                  <span className="text-red-700 dark:text-red-300">•</span>
                  <span className="text-red-700 dark:text-red-300 font-medium">
                    {shiftName}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1 text-sm text-red-600 dark:text-red-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {startTime} - {endTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {memberCount} cuidador{memberCount !== 1 ? 'es' : ''}
                  </span>
                </div>
                <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-2">
                  O horário do plantão já terminou. Faça a passagem de plantão para concluir.
                </p>
              </div>
            </div>

            {/* Ações para Líder/Suplente - permitir passagem de plantão */}
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

        {/* Editor de Ocorrências - ainda disponível para completar notas */}
        {isLeaderOrSubstitute && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-4">
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
  // IN_PROGRESS - Banner verde com destaque máximo
  // ──────────────────────────────────────────────────────────────────────────
  if (status === ShiftStatus.IN_PROGRESS) {
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
  if (status === ShiftStatus.CONFIRMED) {
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
  if (status === ShiftStatus.SCHEDULED) {
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
  // COMPLETED / ADMIN_CLOSED / CANCELLED - Estados finais
  // ──────────────────────────────────────────────────────────────────────────

  // Determinar label e ícone baseado no status
  const getFinalStatusInfo = () => {
    switch (status) {
      case ShiftStatus.COMPLETED:
        return {
          label: 'Plantão Concluído',
          icon: <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />,
          bgIcon: 'bg-green-100 dark:bg-green-900/50',
        };
      case ShiftStatus.ADMIN_CLOSED:
        return {
          label: 'Encerrado Administrativamente',
          icon: <XCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />,
          bgIcon: 'bg-orange-100 dark:bg-orange-900/50',
        };
      case ShiftStatus.CANCELLED:
        return {
          label: 'Plantão Cancelado',
          icon: <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />,
          bgIcon: 'bg-red-100 dark:bg-red-900/50',
        };
      default:
        return {
          label: 'Plantão Finalizado',
          icon: <Clock className="w-6 h-6 text-muted-foreground" />,
          bgIcon: 'bg-muted',
        };
    }
  };

  const finalInfo = getFinalStatusInfo();

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-5">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full flex-shrink-0 ${finalInfo.bgIcon}`}>
          {finalInfo.icon}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {finalInfo.label}
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
