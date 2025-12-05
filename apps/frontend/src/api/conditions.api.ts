import { api } from '@/services/api'

// ==================== TYPES ====================

export interface Condition {
  id: string
  tenantId: string
  residentId: string
  condition: string
  icdCode: string | null
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

export interface CreateConditionDto {
  residentId: string
  condition: string
  icdCode?: string
  notes?: string
}

export interface UpdateConditionDto {
  condition?: string
  icdCode?: string
  notes?: string
}

// ==================== API FUNCTIONS ====================

/**
 * Cria um novo registro de condição crônica / diagnóstico
 */
export async function createCondition(data: CreateConditionDto): Promise<Condition> {
  const response = await api.post('/conditions', data)
  return response.data
}

/**
 * Lista todas as condições de um residente específico
 */
export async function getConditionsByResident(residentId: string): Promise<Condition[]> {
  const response = await api.get(`/conditions/resident/${residentId}`)
  return response.data
}

/**
 * Busca uma condição por ID
 */
export async function getCondition(id: string): Promise<Condition> {
  const response = await api.get(`/conditions/${id}`)
  return response.data
}

/**
 * Atualiza uma condição
 */
export async function updateCondition(id: string, data: UpdateConditionDto): Promise<Condition> {
  const response = await api.patch(`/conditions/${id}`, data)
  return response.data
}

/**
 * Soft delete de uma condição
 */
export async function deleteCondition(id: string): Promise<void> {
  await api.delete(`/conditions/${id}`)
}
