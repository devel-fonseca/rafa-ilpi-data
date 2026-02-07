/**
 * @fileoverview API de Prescrições Médicas
 *
 * Este é o arquivo PRINCIPAL para tipos relacionados a prescrições.
 * Contém tipos para Prescription, Medication (aninhado), SOSMedication (aninhado),
 * e todos os DTOs necessários para operações CRUD.
 *
 * IMPORTANTE - Duplicação de Tipos:
 * Os tipos `Medication` e `SOSMedication` aqui representam as entidades ANINHADAS
 * dentro de uma Prescription (como retornado pelo endpoint GET /prescriptions/:id).
 *
 * Existem versões diferentes destes tipos em:
 * - medications.api.ts: `Medication` como entidade independente com campos de versionamento
 * - sos-medications.api.ts: `SOSMedication` como entidade independente com campos de versionamento
 *
 * QUANDO USAR CADA UM:
 * - Use tipos DESTE arquivo quando trabalhar com prescrições e seus medicamentos aninhados
 * - Use tipos de medications.api.ts para operações CRUD diretas em medicamentos individuais
 *
 * TODO (Refatoração Futura):
 * Considerar renomear para maior clareza:
 * - Medication → PrescriptionMedication (este arquivo)
 * - Medication → MedicationEntity (medications.api.ts)
 */
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
  checkedBy?: string
  notes?: string
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
  notes?: string
  // Campos de Processamento de Arquivo (novo padrão)
  originalFileUrl?: string | null
  originalFileKey?: string | null
  originalFileName?: string | null
  originalFileSize?: number | null
  originalFileMimeType?: string | null
  originalFileHash?: string | null
  processedFileUrl?: string | null
  processedFileKey?: string | null
  processedFileName?: string | null
  processedFileSize?: number | null
  processedFileHash?: string | null
  publicToken?: string | null
  processingMetadata?: Record<string, unknown> | null
  // Campos de Revisão Médica
  lastMedicalReviewDate?: string
  lastReviewedByDoctor?: string
  lastReviewDoctorCrm?: string
  lastReviewDoctorState?: string
  lastReviewNotes?: string
  // Status e Auditoria
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
    birthDate?: string
    allergies?: Allergy[]
    chronicConditions?: string
    bed?: {
      id: string
      code: string
      room?: {
        id: string
        code: string
        floor?: {
          id: string
          code: string
          building?: {
            id: string
            name: string
          }
        }
      }
    }
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

export interface MedicalReviewPrescriptionDto {
  medicalReviewDate: string // Data da consulta médica (YYYY-MM-DD)
  reviewedByDoctor: string // Nome do médico que revisou
  reviewDoctorCrm: string // CRM do médico revisor
  reviewDoctorState: string // UF do CRM (2 caracteres)
  newReviewDate?: string // Nova data de revisão (YYYY-MM-DD)
  reviewNotes: string // Observações da revisão (mínimo 10 caracteres)
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

// ========== RESPONSES DE ADMINISTRAÇÃO ==========

export interface MedicationAdministrationResponse {
  id: string
  medicationId: string
  date: string
  scheduledTime: string
  actualTime?: string
  wasAdministered: boolean
  reason?: string
  administeredBy: string
  notes?: string
  createdAt: string
}

export interface SOSAdministrationResponse {
  id: string
  sosMedicationId: string
  date: string
  time: string
  indication: string
  administeredBy: string
  notes?: string
  createdAt: string
}

// ========== VERSIONAMENTO ==========

export type ChangeType = 'CREATE' | 'UPDATE' | 'DELETE'

export interface PrescriptionHistoryEntry {
  id: string
  versionNumber: number
  changeType: ChangeType
  changeReason: string
  previousData: Record<string, unknown> | null
  newData: Record<string, unknown>
  changedFields: string[]
  changedAt: string
  changedBy: {
    id: string
    name: string
    email: string
  }
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

export interface PrescriptionHistoryResponse {
  prescription: Prescription
  history: PrescriptionHistoryEntry[]
  totalVersions: number
}

// ========== UPLOAD ==========

export interface UploadPrescriptionResponse {
  message: string
  prescription: Prescription
  publicToken: string
  validationUrl: string
}

// ========== API METHODS ==========

export const prescriptionsApi = {
  // CRUD
  async create(data: CreatePrescriptionDto): Promise<Prescription> {
    const response = await api.post<Prescription>('/prescriptions', data)
    return response.data
  },

  async findAll(params?: QueryPrescriptionParams): Promise<PrescriptionsResponse> {
    const response = await api.get<PrescriptionsResponse>('/prescriptions', { params })
    return response.data
  },

  async findOne(id: string): Promise<Prescription> {
    const response = await api.get<Prescription>(`/prescriptions/${id}`)
    return response.data
  },

  async update(id: string, data: UpdatePrescriptionDto): Promise<Prescription> {
    const response = await api.patch<Prescription>(`/prescriptions/${id}`, data)
    return response.data
  },

  async recordMedicalReview(id: string, data: MedicalReviewPrescriptionDto): Promise<Prescription> {
    const response = await api.patch<Prescription>(`/prescriptions/${id}/medical-review`, data)
    return response.data
  },

  async remove(id: string, deleteReason: string): Promise<{ message: string }> {
    const response = await api.delete(`/prescriptions/${id}`, {
      data: { deleteReason }
    })
    return response.data
  },

  // Versionamento
  async getHistory(id: string): Promise<PrescriptionHistoryResponse> {
    const response = await api.get<PrescriptionHistoryResponse>(`/prescriptions/${id}/history`)
    return response.data
  },

  async getHistoryVersion(id: string, versionNumber: number): Promise<PrescriptionHistoryEntry> {
    const response = await api.get<PrescriptionHistoryEntry>(`/prescriptions/${id}/history/${versionNumber}`)
    return response.data
  },

  // Dashboard & Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/prescriptions/stats/dashboard')
    return response.data
  },

  async getCriticalAlerts(): Promise<CriticalAlert[]> {
    const response = await api.get<CriticalAlert[]>('/prescriptions/alerts/critical')
    return response.data
  },

  async getExpiringPrescriptions(days: number = 5): Promise<ExpiringPrescription[]> {
    const response = await api.get<ExpiringPrescription[]>('/prescriptions/expiring/list', {
      params: { days }
    })
    return response.data
  },

  async getResidentsWithControlled(): Promise<ResidentWithControlled[]> {
    const response = await api.get<ResidentWithControlled[]>('/prescriptions/controlled/residents')
    return response.data
  },

  // Administration
  async administerMedication(data: AdministerMedicationDto): Promise<MedicationAdministrationResponse> {
    const response = await api.post<MedicationAdministrationResponse>('/prescriptions/administer', data)
    return response.data
  },

  async administerSOS(data: AdministerSOSDto): Promise<SOSAdministrationResponse> {
    const response = await api.post<SOSAdministrationResponse>('/prescriptions/administer-sos', data)
    return response.data
  },

  // Upload
  uploadPrescription: async (prescriptionId: string, file: File): Promise<UploadPrescriptionResponse> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post<UploadPrescriptionResponse>(
      `/prescriptions/${prescriptionId}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    )
    return response.data
  },
}
