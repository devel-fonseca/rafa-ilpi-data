import { api } from '@/services/api'

// ==================== TYPES ====================

export type RestrictionType =
  | 'ALERGIA_ALIMENTAR'
  | 'INTOLERANCIA'
  | 'RESTRICAO_MEDICA'
  | 'RESTRICAO_RELIGIOSA'
  | 'DISFAGIA'
  | 'DIABETES'
  | 'HIPERTENSAO'
  | 'OUTRA'

export interface DietaryRestriction {
  id: string
  tenantId: string
  residentId: string
  restrictionType: RestrictionType
  description: string
  notes: string | null
  contraindications: string | null
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

export interface CreateDietaryRestrictionDto {
  residentId: string
  restrictionType: RestrictionType
  description: string
  notes?: string
  contraindications?: string
}

export interface UpdateDietaryRestrictionDto {
  restrictionType?: RestrictionType
  description?: string
  notes?: string
  contraindications?: string
}

/**
 * DTO para atualizar restrição alimentar com versionamento
 */
export interface UpdateDietaryRestrictionVersionedDto extends UpdateDietaryRestrictionDto {
  changeReason: string
}

/**
 * Entrada de histórico de restrição alimentar
 */
export interface DietaryRestrictionHistoryEntry {
  id: string
  tenantId: string
  dietaryRestrictionId: string
  versionNumber: number
  changeType: 'CREATE' | 'UPDATE' | 'DELETE'
  changeReason: string
  previousData: Partial<DietaryRestriction> | null
  newData: Partial<DietaryRestriction>
  changedFields: string[]
  changedAt: string
  changedBy: string
  changedByName?: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Resposta de histórico de restrição alimentar
 */
export interface DietaryRestrictionHistoryResponse {
  dietaryRestrictionId: string
  currentVersion: number
  totalVersions: number
  history: DietaryRestrictionHistoryEntry[]
}

// ==================== API FUNCTIONS ====================

/**
 * Cria uma nova restrição alimentar
 */
export async function createDietaryRestriction(data: CreateDietaryRestrictionDto): Promise<DietaryRestriction> {
  const response = await api.post('/dietary-restrictions', data)
  return response.data
}

/**
 * Lista todas as restrições alimentares de um residente específico
 */
export async function getDietaryRestrictionsByResident(residentId: string): Promise<DietaryRestriction[]> {
  const response = await api.get(`/dietary-restrictions/resident/${residentId}`)
  return response.data
}

/**
 * Busca uma restrição alimentar por ID
 */
export async function getDietaryRestriction(id: string): Promise<DietaryRestriction> {
  const response = await api.get(`/dietary-restrictions/${id}`)
  return response.data
}

/**
 * Atualiza uma restrição alimentar com versionamento
 */
export async function updateDietaryRestriction(id: string, data: UpdateDietaryRestrictionVersionedDto): Promise<DietaryRestriction> {
  const response = await api.patch(`/dietary-restrictions/${id}`, data)
  return response.data
}

/**
 * Soft delete de uma restrição alimentar com versionamento
 */
export async function deleteDietaryRestriction(id: string, deleteReason: string): Promise<{ message: string }> {
  const response = await api.delete(`/dietary-restrictions/${id}`, {
    data: { deleteReason },
  })
  return response.data
}

/**
 * Consultar histórico completo de alterações de uma restrição alimentar
 */
export async function getDietaryRestrictionHistory(id: string): Promise<DietaryRestrictionHistoryResponse> {
  const response = await api.get(`/dietary-restrictions/${id}/history`)
  return response.data
}

/**
 * Consultar versão específica do histórico de uma restrição alimentar
 */
export async function getDietaryRestrictionHistoryVersion(id: string, version: number): Promise<DietaryRestrictionHistoryEntry> {
  const response = await api.get(`/dietary-restrictions/${id}/history/${version}`)
  return response.data
}
