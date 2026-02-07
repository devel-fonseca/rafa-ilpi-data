// ============================================================================
// TIPOS COMPARTILHADOS PARA RESIDENT SCHEDULE (Programação da Rotina)
// ============================================================================
// Este arquivo centraliza as interfaces para o módulo de programação de rotina,
// incluindo configurações recorrentes e agendamentos pontuais.

import type { SchedulableRecordType } from './daily-records'

// ============================================================================
// ENUMS E TIPOS BASE
// ============================================================================

export type ScheduleFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'

export type ScheduledEventType =
  | 'VACCINATION'
  | 'CONSULTATION'
  | 'EXAM'
  | 'PROCEDURE'
  | 'OTHER'

export type ScheduledEventStatus =
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'MISSED'

// Re-exporta para conveniência
export type { SchedulableRecordType }

// ============================================================================
// INTERFACES DE CONFIGURAÇÃO DE ROTINA
// ============================================================================

export interface ResidentScheduleConfig {
  id: string
  residentId: string
  recordType: SchedulableRecordType
  frequency: ScheduleFrequency
  dayOfWeek?: number
  dayOfMonth?: number
  suggestedTimes: string[]
  isActive: boolean
  notes?: string
  metadata?: {
    mealType?: string // Tipo de refeição (para ALIMENTACAO)
  }
  createdAt: string
  updatedAt: string
  resident?: {
    id: string
    fullName: string
  }
  createdByUser?: {
    id: string
    name: string
  }
}

// ============================================================================
// INTERFACES DE AGENDAMENTOS PONTUAIS
// ============================================================================

export interface VaccineData {
  name: string
  dose: string
  manufacturer?: string
  batchNumber?: string
}

export interface ResidentScheduledEvent {
  id: string
  residentId: string
  eventType: ScheduledEventType
  scheduledDate: string
  scheduledTime: string
  title: string
  description?: string
  vaccineData?: VaccineData
  status: ScheduledEventStatus
  completedRecordId?: string
  completedAt?: string
  notes?: string
  createdAt: string
  updatedAt: string
  resident?: {
    id: string
    fullName: string
  }
  createdByUser?: {
    id: string
    name: string
  }
}

// ============================================================================
// INTERFACES DE TAREFAS DIÁRIAS
// ============================================================================

export interface DailyTask {
  type: 'RECURRING' | 'EVENT'
  residentId: string
  residentName: string
  // Recurring task fields
  recordType?: string
  suggestedTimes?: string[]
  configId?: string
  isCompleted?: boolean
  completedAt?: string
  completedBy?: string
  mealType?: string // Tipo de refeição (apenas para ALIMENTACAO)
  // Event fields
  eventId?: string
  eventType?: string
  scheduledTime?: string
  title?: string
  status?: string
  description?: string
}

// ============================================================================
// DTOs - INPUTS PARA MUTAÇÕES
// ============================================================================

export interface CreateScheduleConfigInput {
  residentId: string
  recordType: SchedulableRecordType
  frequency: ScheduleFrequency
  dayOfWeek?: number
  dayOfMonth?: number
  suggestedTimes: string[]
  isActive?: boolean
  notes?: string
}

export interface UpdateScheduleConfigInput {
  recordType?: SchedulableRecordType
  frequency?: ScheduleFrequency
  dayOfWeek?: number
  dayOfMonth?: number
  suggestedTimes?: string[]
  isActive?: boolean
  notes?: string
}

export interface CreateScheduledEventInput {
  residentId: string
  eventType: ScheduledEventType
  scheduledDate: string
  scheduledTime: string
  title: string
  description?: string
  vaccineData?: VaccineData
  notes?: string
}

export interface UpdateScheduledEventInput {
  eventType?: ScheduledEventType
  scheduledDate?: string
  scheduledTime?: string
  title?: string
  description?: string
  vaccineData?: VaccineData
  status?: ScheduledEventStatus
  completedRecordId?: string
  completedAt?: string
  notes?: string
}

// ============================================================================
// ALIMENTAÇÃO - CONFIGURAÇÃO EM BATCH
// ============================================================================

export interface MealTimesInput {
  cafeDaManha: string
  colacao: string
  almoco: string
  lanche: string
  jantar: string
  ceia: string
}

export interface CreateAlimentacaoConfigInput {
  residentId: string
  mealTimes: MealTimesInput
  isActive?: boolean
  notes?: string
}

export interface UpdateAlimentacaoConfigInput {
  mealTimes: MealTimesInput
  isActive?: boolean
  notes?: string
}
