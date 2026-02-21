// ──────────────────────────────────────────────────────────────────────────────
//  TYPES - Medical Record (Prontuário do Residente)
// ──────────────────────────────────────────────────────────────────────────────

import type { DailyRecord } from '@/api/dailyRecords.api'
import type { Resident } from '@/api/residents.api'

/**
 * Seções disponíveis no prontuário do residente
 */
export type MedicalSection =
  | 'personal'
  | 'alerts-occurrences'
  | 'clinical-profile'
  | 'vaccinations'
  | 'health-documents'
  | 'clinical-notes'
  | 'prescriptions'
  | 'medications'
  | 'daily-records'
  | 'schedule'

/**
 * Props base para todas as views do prontuário
 */
export interface MedicalViewProps {
  residentId: string
  residentName: string
}

/**
 * Residente com dados de acomodação expandidos (retornado pelo backend)
 */
export interface ResidentWithAccommodation extends Resident {
  bed?: {
    id?: string
    code?: string
    room?: {
      id?: string
      code?: string
      name?: string
      floor?: {
        id?: string
        code?: string
        name?: string
        building?: {
          id?: string
          code?: string
          name?: string
        }
      }
    }
  }
  room?: {
    id?: string
    name?: string
  }
  floor?: {
    id?: string
    name?: string
  }
  building?: {
    id?: string
    name?: string
  }
}

/**
 * Props para a view de sumário do residente
 * Usa ResidentWithAccommodation que inclui dados de acomodação
 */
export interface ResidentSummaryViewProps extends MedicalViewProps {
  resident: ResidentWithAccommodation
  onVitalSignsClick: () => void
  canLoadVitalSignAlerts: boolean
}

/**
 * Props para a view de alertas e intercorrências do residente
 */
export interface AlertsOccurrencesViewProps extends MedicalViewProps {
  onVitalSignsClick: () => void
  canLoadVitalSignAlerts: boolean
  onOpenIncidentManagement?: () => void
}

/**
 * Props para a view de registros diários
 */
export interface DailyRecordsViewProps extends MedicalViewProps {
  viewDate: string
  onDateChange: (date: string) => void
  onViewRecord: (record: DailyRecord) => void
  onEditRecord?: (record: DailyRecord) => void
  onHistoryRecord?: (recordId: string) => void
  onDeleteRecord?: (record: DailyRecord) => void
}

/**
 * Props para a view de prescrições
 */
export interface PrescriptionsViewProps extends MedicalViewProps {
  // Props específicas se necessário
}

/**
 * Administração de medicamento (estrutura retornada pela API)
 */
export interface MedicationAdministration {
  id: string
  type: 'ROUTINE' | 'SOS'
  wasAdministered: boolean
  scheduledTime?: string
  actualTime?: string
  administeredBy: string
  checkedBy?: string
  reason?: string
  notes?: string
  indication?: string
  createdAt: string
  updatedAt?: string
  medication?: {
    name: string
    concentration?: string
    dose: string
    route: string
    presentation?: string
  }
}

/**
 * Props para a view de medicações (administrações)
 */
export interface MedicationsViewProps extends MedicalViewProps {
  viewDate: string
  onDateChange: (date: string) => void
  onViewAdministration?: (administration: MedicationAdministration) => void
  onEditAdministration?: (administration: MedicationAdministration) => void
  onHistoryAdministration?: (administrationId: string) => void
  onDeleteAdministration?: (administration: MedicationAdministration) => void
}
