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

export interface CreateDietaryRestrictionDto {
  residentId: string
  restrictionType: RestrictionType
  description: string
  notes?: string
}

export interface UpdateDietaryRestrictionDto {
  restrictionType?: RestrictionType
  description?: string
  notes?: string
}

// ==================== API FUNCTIONS ====================

/**
 * Cria um novo registro de restrição alimentar
 */
export async function createDietaryRestriction(
  data: CreateDietaryRestrictionDto
): Promise<DietaryRestriction> {
  const response = await api.post('/dietary-restrictions', data)
  return response.data
}

/**
 * Lista todas as restrições alimentares de um residente específico
 */
export async function getDietaryRestrictionsByResident(
  residentId: string
): Promise<DietaryRestriction[]> {
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
 * Atualiza uma restrição alimentar
 */
export async function updateDietaryRestriction(
  id: string,
  data: UpdateDietaryRestrictionDto
): Promise<DietaryRestriction> {
  const response = await api.patch(`/dietary-restrictions/${id}`, data)
  return response.data
}

/**
 * Soft delete de uma restrição alimentar
 */
export async function deleteDietaryRestriction(id: string): Promise<void> {
  await api.delete(`/dietary-restrictions/${id}`)
}
