import { RecordType, ScheduledEventType } from '@prisma/client';

export enum AgendaItemType {
  MEDICATION = 'MEDICATION',
  SCHEDULED_EVENT = 'SCHEDULED_EVENT',
  RECURRING_RECORD = 'RECURRING_RECORD',
}

export interface VaccineData {
  name: string;
  dose?: string;
  manufacturer?: string;
  batchNumber?: string;
}

export interface AgendaItem {
  id: string;
  type: AgendaItemType;
  category: string;
  residentId: string;
  residentName: string;
  title: string;
  description?: string;
  scheduledDate: Date;
  scheduledTime: string;
  status: 'pending' | 'completed' | 'missed' | 'cancelled';
  completedAt?: Date;
  completedBy?: string;
  metadata?: Record<string, unknown>;

  // Específico para medicamentos
  medicationName?: string;
  dosage?: string;
  prescriptionId?: string;

  // Específico para eventos agendados
  eventType?: ScheduledEventType;
  vaccineData?: VaccineData;
  eventId?: string;

  // Específico para registros recorrentes
  recordType?: RecordType;
  suggestedTimes?: string[];
  configId?: string;
  mealType?: string;
}
