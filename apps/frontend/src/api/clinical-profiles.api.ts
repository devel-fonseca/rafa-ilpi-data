import { api } from '@/services/api'

// ==================== TYPES ====================

export interface ClinicalProfile {
  id: string
  tenantId: string
  residentId: string
  healthStatus: string | null
  specialNeeds: string | null
  functionalAspects: string | null
  versionNumber: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  createdBy: string | null
  updatedBy: string | null
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

export interface CreateClinicalProfileDto {
  residentId: string
  healthStatus?: string
  specialNeeds?: string
  functionalAspects?: string
}

export interface UpdateClinicalProfileDto {
  healthStatus?: string
  specialNeeds?: string
  functionalAspects?: string
  mobilityAid?: boolean
  changeReason: string
}

/**
 * DTO para atualizar perfil clínico com versionamento
 */
export type UpdateClinicalProfileVersionedDto = UpdateClinicalProfileDto

/**
 * Entrada de histórico de perfil clínico
 */
export interface ClinicalProfileHistoryEntry {
  id: string
  tenantId: string
  clinicalProfileId: string
  versionNumber: number
  changeType: 'CREATE' | 'UPDATE' | 'DELETE'
  changeReason: string
  previousData: Partial<ClinicalProfile> | null
  newData: Partial<ClinicalProfile>
  changedFields: string[]
  changedAt: string
  changedBy: string
  changedByName?: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Resposta de histórico de perfil clínico
 */
export interface ClinicalProfileHistoryResponse {
  clinicalProfileId: string
  currentVersion: number
  totalVersions: number
  history: ClinicalProfileHistoryEntry[]
}

// ==================== API FUNCTIONS ====================

/**
 * Cria um novo perfil clínico
 */
export async function createClinicalProfile(data: CreateClinicalProfileDto): Promise<ClinicalProfile> {
  const response = await api.post('/clinical-profiles', data)
  return response.data
}

/**
 * Busca perfil clínico de um residente específico
 */
export async function getClinicalProfileByResident(
  residentId: string
): Promise<ClinicalProfile | null> {
  try {
    const response = await api.get(`/clinical-profiles/resident/${residentId}`)
    return response.data
  } catch (error: unknown) {
    if ((error as { response?: { status?: number } }).response?.status === 404) {
      return null
    }
    throw error
  }
}

/**
 * Busca um perfil clínico por ID
 */
export async function getClinicalProfile(id: string): Promise<ClinicalProfile> {
  const response = await api.get(`/clinical-profiles/${id}`)
  return response.data
}

/**
 * Atualiza um perfil clínico com versionamento
 */
export async function updateClinicalProfile(
  id: string,
  data: UpdateClinicalProfileVersionedDto
): Promise<ClinicalProfile> {
  const response = await api.patch(`/clinical-profiles/${id}`, data)
  return response.data
}

/**
 * Soft delete de um perfil clínico com versionamento
 */
export async function deleteClinicalProfile(id: string, deleteReason: string): Promise<{ message: string }> {
  const response = await api.delete(`/clinical-profiles/${id}`, {
    data: { deleteReason },
  })
  return response.data
}

/**
 * Consultar histórico completo de alterações de um perfil clínico
 */
export async function getClinicalProfileHistory(id: string): Promise<ClinicalProfileHistoryResponse> {
  const response = await api.get(`/clinical-profiles/${id}/history`)
  return response.data
}

/**
 * Consultar versão específica do histórico de um perfil clínico
 */
export async function getClinicalProfileHistoryVersion(id: string, version: number): Promise<ClinicalProfileHistoryEntry> {
  const response = await api.get(`/clinical-profiles/${id}/history/${version}`)
  return response.data
}
