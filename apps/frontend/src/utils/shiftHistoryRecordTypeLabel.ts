import { getRecordTypeLabel, isRecordType } from '@/utils/recordTypeLabels'

const EXTRA_TYPE_LABELS: Record<string, string> = {
  MEDICACAO_CONTINUA: 'Medicação Contínua',
  MEDICACAO_SOS: 'Medicação SOS',
  REGISTRO_DIARIO: 'Registro Diário',
}

export function getShiftHistoryRecordTypeLabel(type: string): string {
  if (isRecordType(type)) {
    return getRecordTypeLabel(type).label
  }

  return EXTRA_TYPE_LABELS[type] || type
}

