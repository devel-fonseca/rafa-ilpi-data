import { ShiftStatus, type Shift } from '@/types/care-shifts/care-shifts';
import { extractDateOnly, SYSTEM_TIMEZONE } from '@/utils/dateHelpers';
import { addDays, differenceInMinutes, isAfter, isBefore, parse } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';

const SHIFT_STATUS_LABELS: Record<ShiftStatus, string> = {
  [ShiftStatus.SCHEDULED]: 'Agendado',
  [ShiftStatus.CONFIRMED]: 'Confirmado',
  [ShiftStatus.IN_PROGRESS]: 'Em Andamento',
  [ShiftStatus.PENDING_CLOSURE]: 'Encerramento Pendente',
  [ShiftStatus.COMPLETED]: 'Concluído',
  [ShiftStatus.ADMIN_CLOSED]: 'Encerrado Administrativamente',
  [ShiftStatus.CANCELLED]: 'Cancelado',
};

export function formatShiftStatusLabel(status: string | ShiftStatus): string {
  return SHIFT_STATUS_LABELS[status as ShiftStatus] ?? status;
}

function getShiftWindowUtc(shift: Shift): { start: Date; end: Date } | null {
  const template = shift.shiftTemplate;
  if (!template) return null;

  const startTime = template.tenantConfig?.customStartTime || template.startTime;
  const endTime = template.tenantConfig?.customEndTime || template.endTime;
  if (!startTime || !endTime) return null;

  // Padrão DATETIME: shift.date é DATE civil; combina com HH:mm local do tenant.
  const shiftDate = extractDateOnly(shift.date);
  const localStart = parse(`${shiftDate} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
  let localEnd = parse(`${shiftDate} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date());

  // Turno noturno (ex: 19:00 → 07:00): fim no dia seguinte.
  if (!isAfter(localEnd, localStart)) {
    localEnd = addDays(localEnd, 1);
  }

  return {
    start: fromZonedTime(localStart, SYSTEM_TIMEZONE),
    end: fromZonedTime(localEnd, SYSTEM_TIMEZONE),
  };
}

export function isShiftInCurrentWindow(shift: Shift): boolean {
  const window = getShiftWindowUtc(shift);
  if (!window) return false;

  const now = new Date();
  return !isBefore(now, window.start) && isBefore(now, window.end);
}

/**
 * Verifica se um plantão IN_PROGRESS deveria estar com encerramento pendente
 * baseado no horário atual vs horário de término do plantão.
 *
 * Regra: Se o horário atual > endTime do plantão, o encerramento está pendente.
 *
 * @param shift - O plantão a ser verificado
 * @returns true se o plantão deveria estar pendente de encerramento
 */
export function isShiftPendingClosure(shift: Shift): boolean {
  // Só verifica plantões IN_PROGRESS
  if (shift.status !== ShiftStatus.IN_PROGRESS) {
    return false;
  }

  const window = getShiftWindowUtc(shift);
  if (!window) return false;

  return isAfter(new Date(), window.end);
}

/**
 * Calcula há quanto tempo o plantão deveria ter sido encerrado
 *
 * @param shift - O plantão
 * @returns Número de minutos desde o término esperado, ou 0 se ainda não terminou
 */
export function getMinutesSinceExpectedEnd(shift: Shift): number {
  const window = getShiftWindowUtc(shift);
  if (!window) return 0;

  const now = new Date();
  if (!isAfter(now, window.end)) return 0;

  return differenceInMinutes(now, window.end);
}

/**
 * Obtém o status "efetivo" do plantão, considerando detecção de encerramento pendente
 *
 * Isso permite que o frontend mostre "Encerramento Pendente" mesmo que o banco
 * ainda tenha o status como IN_PROGRESS (até que o backend atualize).
 *
 * @param shift - O plantão
 * @returns O status efetivo para exibição
 */
export function getEffectiveShiftStatus(shift: Shift): ShiftStatus {
  // Se já está com status de encerrado/pendente, retorna como está
  if (
    shift.status === ShiftStatus.PENDING_CLOSURE ||
    shift.status === ShiftStatus.COMPLETED ||
    shift.status === ShiftStatus.ADMIN_CLOSED ||
    shift.status === ShiftStatus.CANCELLED
  ) {
    return shift.status;
  }

  // Se está IN_PROGRESS mas passou do horário, considera como PENDING_CLOSURE
  if (shift.status === ShiftStatus.IN_PROGRESS && isShiftPendingClosure(shift)) {
    return ShiftStatus.PENDING_CLOSURE;
  }

  return shift.status;
}

/**
 * Verifica se o plantão pode receber novos registros diários
 *
 * @param shift - O plantão
 * @param toleranceMinutes - Tolerância em minutos após o término (padrão: 30)
 * @returns true se ainda pode registrar
 */
export function canRegisterInShift(shift: Shift, toleranceMinutes = 30): boolean {
  // Plantões concluídos/cancelados não aceitam mais registros
  if (
    shift.status === ShiftStatus.COMPLETED ||
    shift.status === ShiftStatus.ADMIN_CLOSED ||
    shift.status === ShiftStatus.CANCELLED
  ) {
    return false;
  }

  // Plantões agendados/confirmados ainda não começaram
  if (
    shift.status === ShiftStatus.SCHEDULED ||
    shift.status === ShiftStatus.CONFIRMED
  ) {
    return false;
  }

  // Para IN_PROGRESS e PENDING_CLOSURE, verifica a tolerância
  const minutesSinceEnd = getMinutesSinceExpectedEnd(shift);
  return minutesSinceEnd <= toleranceMinutes;
}
