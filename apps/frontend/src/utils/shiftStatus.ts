import { ShiftStatus } from '@/types/care-shifts/care-shifts';

const SHIFT_STATUS_LABELS: Record<ShiftStatus, string> = {
  [ShiftStatus.SCHEDULED]: 'Agendado',
  [ShiftStatus.CONFIRMED]: 'Confirmado',
  [ShiftStatus.IN_PROGRESS]: 'Em progresso',
  [ShiftStatus.COMPLETED]: 'Concluído',
  [ShiftStatus.CANCELLED]: 'Cancelado',
};

export function formatShiftStatusLabel(status: string | ShiftStatus): string {
  return SHIFT_STATUS_LABELS[status as ShiftStatus] ?? status;
}
