import { api } from '../services/api'
import type { Allergy } from './residents.api'

// ========== TYPES & INTERFACES ==========

export type PrescriptionType = 'ROTINA' | 'ALTERACAO_PONTUAL' | 'ANTIBIOTICO' | 'ALTO_RISCO' | 'CONTROLADO' | 'OUTRO'
export type AdministrationRoute = 'VO' | 'IM' | 'EV' | 'SC' | 'TOPICA' | 'SL' | 'RETAL' | 'OCULAR' | 'NASAL' | 'INALATORIA' | 'OUTRA'
export type MedicationPresentation = 'COMPRIMIDO' | 'CAPSULA' | 'AMPOLA' | 'GOTAS' | 'SOLUCAO' | 'SUSPENSAO' | 'POMADA' | 'CREME' | 'SPRAY' | 'INALADOR' | 'ADESIVO' | 'SUPOSITORIO' | 'OUTRO'
export type NotificationType = 'AMARELA' | 'AZUL' | 'BRANCA_ESPECIAL' | 'NAO_APLICA'
export type ControlledClass = 'BZD' | 'PSICOFARMACO' | 'OPIOIDE' | 'ANTICONVULSIVANTE' | 'OUTRO'
export type MedicationFrequency = 'UMA_VEZ_DIA' | 'DUAS_VEZES_DIA' | 'SEIS_SEIS_H' | 'OITO_OITO_H' | 'DOZE_DOZE_H' | 'PERSONALIZADO'
export type SOSIndicationType = 'DOR' | 'FEBRE' | 'ANSIEDADE' | 'AGITACAO' | 'NAUSEA' | 'INSONIA' | 'OUTRO'

export interface MedicationAdministration {
  id: string
  date: string
  scheduledTime: string
  actualTime?: string
  wasAdministered: boolean
  reason?: string
  administeredBy: string
  createdAt: string
}

export interface Medication {
  id: string
  name: string
  presentation: MedicationPresentation
  concentration: string
  dose: string
  route: AdministrationRoute
  frequency: MedicationFrequency
  scheduledTimes: string[]
  startDate: string
  endDate?: string
  isControlled: boolean
  isHighRisk: boolean
  requiresDoubleCheck: boolean
  instructions?: string
  administrations?: MedicationAdministration[] // Registros de administração
  createdAt: string
  updatedAt: string
}

export interface SOSMedication {
  id: string
  name: string
  presentation: MedicationPresentation
  concentration: string
  dose: string
  route: AdministrationRoute
  indication: SOSIndicationType
  indicationDetails?: string
  minInterval: string
  maxDailyDoses: number
  startDate: string
  endDate?: string
  instructions?: string
  createdAt: string
  updatedAt: string
}

export interface Prescription {
  id: string
  tenantId: string
  residentId: string
  doctorName: string
  doctorCrm: string
  doctorCrmState: string
  prescriptionDate: string
  prescriptionType: PrescriptionType
  validUntil?: string
  reviewDate?: string
  controlledClass?: ControlledClass
  notificationNumber?: string
  notificationType?: NotificationType
  prescriptionImageUrl?: string
  notes?: string
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  resident?: {
    id: string
    fullName: string
    fotoUrl?: string
    roomId?: string
    bedId?: string
    allergies?: Allergy[]
    chronicConditions?: string
  }
  medications: Medication[]
  sosMedications: SOSMedication[]
}

export interface CreateMedicationDto {
  name: string
  presentation: MedicationPresentation
  concentration: string
  dose: string
  route: AdministrationRoute
  frequency: MedicationFrequency
  scheduledTimes: string[]
  startDate: string
  endDate?: string
  isControlled?: boolean
  isHighRisk?: boolean
  requiresDoubleCheck?: boolean
  instructions?: string
}

export interface CreateSOSMedicationDto {
  name: string
  presentation: MedicationPresentation
  concentration: string
  dose: string
  route: AdministrationRoute
  indication: SOSIndicationType
  indicationDetails?: string
  minInterval: string
  maxDailyDoses: number
  startDate: string
  endDate?: string
  instructions?: string
}

export interface CreatePrescriptionDto {
  residentId: string
  doctorName: string
  doctorCrm: string
  doctorCrmState: string
  prescriptionDate: string
  prescriptionType: PrescriptionType
  validUntil?: string
  reviewDate?: string
  controlledClass?: ControlledClass
  notificationNumber?: string
  notificationType?: NotificationType
  prescriptionImageUrl?: string
  notes?: string
  medications: CreateMedicationDto[]
  sosMedications?: CreateSOSMedicationDto[]
}

export interface UpdatePrescriptionDto extends Partial<CreatePrescriptionDto> {
  changeReason: string // Obrigatório (mínimo 10 caracteres)
  isActive?: boolean
}

export interface DeletePrescriptionDto {
  deleteReason: string // Obrigatório (mínimo 10 caracteres)
}

export interface QueryPrescriptionParams {
  page?: number
  limit?: number
  residentId?: string
  prescriptionType?: PrescriptionType
  isActive?: boolean
  expiringInDays?: number
  hasControlled?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PrescriptionsResponse {
  data: Prescription[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface DashboardStats {
  totalActive: number
  expiringIn5Days: number
  activeAntibiotics: number
  activeControlled: number
}

export interface CriticalAlert {
  prescriptionId: string
  residentName: string
  doctorName: string
  message: string
  type: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  daysUntilExpiry?: number
}

export interface ExpiringPrescription {
  residentName: string
  daysUntilExpiry: number
  type: PrescriptionType
  validUntil: string
}

export interface ResidentWithControlled {
  residentName: string
  medication: string
  scheduledTimes: string[]
}

export interface AdministerMedicationDto {
  medicationId: string
  date: string
  scheduledTime: string
  actualTime?: string
  wasAdministered: boolean
  reason?: string
  administeredBy: string
  checkedBy?: string
  checkedByUserId?: string
  notes?: string
}

export interface AdministerSOSDto {
  sosMedicationId: string
  date: string
  time: string
  indication: string
  administeredBy: string
  notes?: string
}

// ========== VERSIONAMENTO ==========

export type ChangeType = 'CREATE' | 'UPDATE' | 'DELETE'

export interface PrescriptionHistoryEntry {
  id: string
  versionNumber: number
  changeType: ChangeType
  changeReason: string
  previousData: any | null
  newData: any
  changedFields: string[]
  changedAt: string
  changedBy: {
    id: string
    name: string
    email: string
  }
  ipAddress?: string
  userAgent?: string
  metadata?: any
}

export interface PrescriptionHistoryResponse {
  prescription: Prescription
  history: PrescriptionHistoryEntry[]
  totalVersions: number
}

// ========== API METHODS ==========

export const prescriptionsApi = {
  // CRUD
  create: (data: CreatePrescriptionDto) =>
    api.post<Prescription>('/prescriptions', data),

  findAll: (params?: QueryPrescriptionParams) =>
    api.get<PrescriptionsResponse>('/prescriptions', { params }),

  findOne: (id: string) =>
    api.get<Prescription>(`/prescriptions/${id}`),

  update: (id: string, data: UpdatePrescriptionDto) =>
    api.patch<Prescription>(`/prescriptions/${id}`, data),

  remove: (id: string, deleteReason: string) =>
    api.delete(`/prescriptions/${id}`, {
      data: { deleteReason }
    }),

  // Versionamento
  getHistory: (id: string) =>
    api.get<PrescriptionHistoryResponse>(`/prescriptions/${id}/history`),

  getHistoryVersion: (id: string, versionNumber: number) =>
    api.get<PrescriptionHistoryEntry>(`/prescriptions/${id}/history/${versionNumber}`),

  // Dashboard & Stats
  getDashboardStats: () =>
    api.get<DashboardStats>('/prescriptions/stats/dashboard'),

  getCriticalAlerts: () =>
    api.get<CriticalAlert[]>('/prescriptions/alerts/critical'),

  getExpiringPrescriptions: (days: number = 5) =>
    api.get<ExpiringPrescription[]>('/prescriptions/expiring/list', {
      params: { days }
    }),

  getResidentsWithControlled: () =>
    api.get<ResidentWithControlled[]>('/prescriptions/controlled/residents'),

  // Administration
  administerMedication: (data: AdministerMedicationDto) =>
    api.post('/prescriptions/administer', data),

  administerSOS: (data: AdministerSOSDto) =>
    api.post('/prescriptions/administer-sos', data),
}
