import { api } from '@/services/api'

// ==================== TYPES ====================

export interface ClinicalProfile {
  id: string
  tenantId: string
  residentId: string
  healthStatus: string | null
  specialNeeds: string | null
  functionalAspects: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  updatedBy: string | null
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

// ==================== API FUNCTIONS ====================

/**
 * Cria um novo perfil clínico para um residente
 */
export async function createClinicalProfile(
  data: CreateClinicalProfileDto
): Promise<ClinicalProfile> {
  const response = await api.post('/clinical-profiles', data)
  return response.data
}

/**
 * Busca o perfil clínico de um residente específico
 */
export async function getClinicalProfileByResident(
  residentId: string
): Promise<ClinicalProfile | null> {
  try {
    const response = await api.get(`/clinical-profiles/resident/${residentId}`)
    return response.data
  } catch (error: any) {
    // Se retornar 404, significa que o residente não tem perfil clínico ainda
    if (error.response?.status === 404) {
      return null
    }
    throw error
  }
}

/**
 * Atualiza o perfil clínico
 */
export async function updateClinicalProfile(
  id: string,
  data: UpdateClinicalProfileDto
): Promise<ClinicalProfile> {
  const response = await api.patch(`/clinical-profiles/${id}`, data)
  return response.data
}

/**
 * Soft delete do perfil clínico com versionamento
 */
export async function deleteClinicalProfile(
  id: string,
  deleteReason: string
): Promise<void> {
  await api.delete(`/clinical-profiles/${id}`, {
    data: { deleteReason },
  })
}
