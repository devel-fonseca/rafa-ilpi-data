import { api } from '@/services/api'

// ==================== TYPES ====================

export type MedicationPresentation =
  | 'COMPRIMIDO'
  | 'CAPSULA'
  | 'AMPOLA'
  | 'GOTAS'
  | 'SOLUCAO'
  | 'SUSPENSAO'
  | 'POMADA'
  | 'CREME'
  | 'SPRAY'
  | 'INALADOR'

export type AdministrationRoute =
  | 'VO'
  | 'IM'
  | 'EV'
  | 'SC'
  | 'TOPICA'
  | 'SL'
  | 'RETAL'
  | 'OCULAR'
  | 'NASAL'
  | 'INALATORIA'

export type MedicationFrequency =
  | 'UMA_VEZ_DIA'
  | 'DUAS_VEZES_DIA'
  | 'SEIS_SEIS_H'
  | 'OITO_OITO_H'
  | 'DOZE_DOZE_H'
  | 'PERSONALIZADO'

export interface Medication {
  id: string
  prescriptionId: string
  name: string
  presentation: MedicationPresentation
  concentration: string
  dose: string
  route: AdministrationRoute
  frequency: MedicationFrequency
  scheduledTimes: string[] // Array de horários
  startDate: string
  endDate: string | null
  isControlled: boolean
  isHighRisk: boolean
  requiresDoubleCheck: boolean
  instructions: string | null
  versionNumber: number
  createdBy: string
  updatedBy: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  creator?: {
    id: string
    name: string
    email: string
  }
  updater?: {
    id: string
    name: string
    email: string
  }
}

export interface CreateMedicationDto {
  prescriptionId: string
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

export interface UpdateMedicationDto {
  name?: string
  presentation?: MedicationPresentation
  concentration?: string
  dose?: string
  route?: AdministrationRoute
  frequency?: MedicationFrequency
  scheduledTimes?: string[]
  startDate?: string
  endDate?: string
  isControlled?: boolean
  isHighRisk?: boolean
  requiresDoubleCheck?: boolean
  instructions?: string
}

/**
 * DTO para atualizar medicamento com versionamento
 */
export interface UpdateMedicationVersionedDto extends UpdateMedicationDto {
  changeReason: string
}

/**
 * Entrada de histórico de medicamento
 */
export interface MedicationHistoryEntry {
  id: string
  tenantId: string
  medicationId: string
  versionNumber: number
  changeType: 'CREATE' | 'UPDATE' | 'DELETE'
  changeReason: string
  previousData: Partial<Medication> | null
  newData: Partial<Medication>
  changedFields: string[]
  changedAt: string
  changedBy: string
  changedByName?: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Resposta de histórico de medicamento
 */
export interface MedicationHistoryResponse {
  medicationId: string
  currentVersion: number
  totalVersions: number
  history: MedicationHistoryEntry[]
}

// ==================== API FUNCTIONS ====================

/**
 * Cria um novo medicamento
 */
export async function createMedication(data: CreateMedicationDto): Promise<Medication> {
  const response = await api.post('/medications', data)
  return response.data
}

/**
 * Lista todos os medicamentos de uma prescrição específica
 */
export async function getMedicationsByPrescription(prescriptionId: string): Promise<Medication[]> {
  const response = await api.get(`/medications/prescription/${prescriptionId}`)
  return response.data
}

/**
 * Busca um medicamento por ID
 */
export async function getMedication(id: string): Promise<Medication> {
  const response = await api.get(`/medications/${id}`)
  return response.data
}

/**
 * Atualiza um medicamento com versionamento
 */
export async function updateMedication(id: string, data: UpdateMedicationVersionedDto): Promise<Medication> {
  const response = await api.patch(`/medications/${id}`, data)
  return response.data
}

/**
 * Soft delete de um medicamento com versionamento
 */
export async function deleteMedication(id: string, deleteReason: string): Promise<{ message: string }> {
  const response = await api.delete(`/medications/${id}`, {
    data: { deleteReason },
  })
  return response.data
}

/**
 * Consultar histórico completo de alterações de um medicamento
 */
export async function getMedicationHistory(id: string): Promise<MedicationHistoryResponse> {
  const response = await api.get(`/medications/${id}/history`)
  return response.data
}

/**
 * Consultar versão específica do histórico de um medicamento
 */
export async function getMedicationHistoryVersion(id: string, version: number): Promise<MedicationHistoryEntry> {
  const response = await api.get(`/medications/${id}/history/${version}`)
  return response.data
}
