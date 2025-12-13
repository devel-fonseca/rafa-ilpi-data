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

/**
 * DTO para atualizar condição com versionamento
 */
export interface UpdateConditionVersionedDto extends UpdateConditionDto {
  changeReason: string
}

/**
 * Entrada de histórico de condição
 */
export interface ConditionHistoryEntry {
  id: string
  tenantId: string
  conditionId: string
  versionNumber: number
  changeType: 'CREATE' | 'UPDATE' | 'DELETE'
  changeReason: string
  previousData: Partial<Condition> | null
  newData: Partial<Condition>
  changedFields: string[]
  changedAt: string
  changedBy: string
  changedByName?: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Resposta de histórico de condição
 */
export interface ConditionHistoryResponse {
  conditionId: string
  currentVersion: number
  totalVersions: number
  history: ConditionHistoryEntry[]
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
 * Atualiza uma condição com versionamento
 */
export async function updateCondition(id: string, data: UpdateConditionVersionedDto): Promise<Condition> {
  const response = await api.patch(`/conditions/${id}`, data)
  return response.data
}

/**
 * Soft delete de uma condição com versionamento
 */
export async function deleteCondition(id: string, deleteReason: string): Promise<{ message: string }> {
  const response = await api.delete(`/conditions/${id}`, {
    data: { deleteReason },
  })
  return response.data
}

/**
 * Consultar histórico completo de alterações de uma condição
 */
export async function getConditionHistory(id: string): Promise<ConditionHistoryResponse> {
  const response = await api.get(`/conditions/${id}/history`)
  return response.data
}

/**
 * Consultar versão específica do histórico de uma condição
 */
export async function getConditionHistoryVersion(id: string, version: number): Promise<ConditionHistoryEntry> {
  const response = await api.get(`/conditions/${id}/history/${version}`)
  return response.data
}
