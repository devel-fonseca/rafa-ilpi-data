import { api } from '@/services/api'

// ==================== TYPES ====================

export type AllergySeverity = 'LEVE' | 'MODERADA' | 'GRAVE' | 'ANAFILAXIA'

export interface Allergy {
  id: string
  tenantId: string
  residentId: string
  substance: string
  reaction: string | null
  severity: AllergySeverity | null
  notes: string | null
  contraindications: string | null
  recordedBy: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  user: {
    id: string
    name: string
    email: string
  }
}

export interface CreateAllergyDto {
  residentId: string
  substance: string
  reaction?: string
  severity?: AllergySeverity
  notes?: string
  contraindications?: string
}

export interface UpdateAllergyDto {
  substance?: string
  reaction?: string
  severity?: AllergySeverity
  notes?: string
  contraindications?: string
}

/**
 * DTO para atualizar alergia com versionamento
 */
export interface UpdateAllergyVersionedDto extends UpdateAllergyDto {
  changeReason: string
}

/**
 * Entrada de histórico de alergia
 */
export interface AllergyHistoryEntry {
  id: string
  tenantId: string
  allergyId: string
  versionNumber: number
  changeType: 'CREATE' | 'UPDATE' | 'DELETE'
  changeReason: string
  previousData: Partial<Allergy> | null
  newData: Partial<Allergy>
  changedFields: string[]
  changedAt: string
  changedBy: string
  changedByName?: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Resposta de histórico de alergia
 */
export interface AllergyHistoryResponse {
  allergyId: string
  currentVersion: number
  totalVersions: number
  history: AllergyHistoryEntry[]
}

// ==================== API FUNCTIONS ====================

/**
 * Cria um novo registro de alergia
 */
export async function createAllergy(data: CreateAllergyDto): Promise<Allergy> {
  const response = await api.post('/allergies', data)
  return response.data
}

/**
 * Lista todas as alergias de um residente específico
 */
export async function getAllergiesByResident(residentId: string): Promise<Allergy[]> {
  const response = await api.get(`/allergies/resident/${residentId}`)
  return response.data
}

/**
 * Busca uma alergia por ID
 */
export async function getAllergy(id: string): Promise<Allergy> {
  const response = await api.get(`/allergies/${id}`)
  return response.data
}

/**
 * Atualiza uma alergia com versionamento
 */
export async function updateAllergy(id: string, data: UpdateAllergyVersionedDto): Promise<Allergy> {
  const response = await api.patch(`/allergies/${id}`, data)
  return response.data
}

/**
 * Soft delete de uma alergia com versionamento
 */
export async function deleteAllergy(id: string, deleteReason: string): Promise<{ message: string }> {
  const response = await api.delete(`/allergies/${id}`, {
    data: { deleteReason },
  })
  return response.data
}

/**
 * Consultar histórico completo de alterações de uma alergia
 */
export async function getAllergyHistory(id: string): Promise<AllergyHistoryResponse> {
  const response = await api.get(`/allergies/${id}/history`)
  return response.data
}

/**
 * Consultar versão específica do histórico de uma alergia
 */
export async function getAllergyHistoryVersion(id: string, version: number): Promise<AllergyHistoryEntry> {
  const response = await api.get(`/allergies/${id}/history/${version}`)
  return response.data
}
