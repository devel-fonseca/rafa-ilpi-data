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
}

export interface UpdateAllergyDto {
  substance?: string
  reaction?: string
  severity?: AllergySeverity
  notes?: string
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
 * Atualiza uma alergia
 */
export async function updateAllergy(id: string, data: UpdateAllergyDto): Promise<Allergy> {
  const response = await api.patch(`/allergies/${id}`, data)
  return response.data
}

/**
 * Soft delete de uma alergia
 */
export async function deleteAllergy(id: string): Promise<void> {
  await api.delete(`/allergies/${id}`)
}
