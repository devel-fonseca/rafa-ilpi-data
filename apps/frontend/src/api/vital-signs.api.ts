import { api } from '@/services/api'

// ==================== TYPES ====================

export interface VitalSign {
  id: string
  tenantId: string
  residentId: string
  userId: string
  timestamp: string
  systolicBloodPressure: number | null
  diastolicBloodPressure: number | null
  temperature: number | null
  heartRate: number | null
  oxygenSaturation: number | null
  bloodGlucose: number | null
  versionNumber: number
  createdBy: string
  updatedBy: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  user: {
    id: string
    name: string
    email: string
  }
}

export interface CreateVitalSignDto {
  residentId: string
  timestamp: string
  systolicBloodPressure?: number
  diastolicBloodPressure?: number
  temperature?: number
  heartRate?: number
  oxygenSaturation?: number
  bloodGlucose?: number
}

export interface UpdateVitalSignDto {
  timestamp?: string
  systolicBloodPressure?: number
  diastolicBloodPressure?: number
  temperature?: number
  heartRate?: number
  oxygenSaturation?: number
  bloodGlucose?: number
}

/**
 * DTO para atualizar sinal vital com versionamento
 */
export interface UpdateVitalSignVersionedDto extends UpdateVitalSignDto {
  changeReason: string
}

/**
 * Entrada de histórico de sinal vital
 */
export interface VitalSignHistoryEntry {
  id: string
  tenantId: string
  vitalSignId: string
  versionNumber: number
  changeType: 'CREATE' | 'UPDATE' | 'DELETE'
  changeReason: string
  previousData: Partial<VitalSign> | null
  newData: Partial<VitalSign>
  changedFields: string[]
  changedAt: string
  changedBy: string
  changedByName?: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Resposta de histórico de sinal vital
 */
export interface VitalSignHistoryResponse {
  vitalSignId: string
  currentVersion: number
  totalVersions: number
  history: VitalSignHistoryEntry[]
}

/**
 * Buscar último sinal vital de um residente
 */
export async function getLastVitalSign(residentId: string): Promise<VitalSign | null> {
  const response = await api.get<VitalSign | null>(
    `/vital-signs/resident/${residentId}/last`
  )
  return response.data
}

/**
 * Buscar sinais vitais de um residente por período
 */
export async function getVitalSignsByResident(
  residentId: string,
  startDate?: string,
  endDate?: string
): Promise<VitalSign[]> {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)

  const response = await api.get<VitalSign[]>(
    `/vital-signs/resident/${residentId}?${params.toString()}`
  )
  return response.data
}

/**
 * Buscar estatísticas de sinais vitais
 */
export interface VitalSignsStatistics {
  avgSystolic: number
  avgDiastolic: number
  avgGlucose: number
  avgTemperature: number
  avgHeartRate: number
  avgOxygenSaturation: number
  criticalAlerts: number
  totalRecords: number
}

export async function getVitalSignsStatistics(
  residentId: string,
  days: number = 30
): Promise<VitalSignsStatistics> {
  const response = await api.get<VitalSignsStatistics>(
    `/vital-signs/resident/${residentId}/statistics?days=${days}`
  )
  return response.data
}

// ==================== API FUNCTIONS ====================

/**
 * Cria um novo registro de sinais vitais
 */
export async function createVitalSign(data: CreateVitalSignDto): Promise<VitalSign> {
  const response = await api.post('/vital-signs', data)
  return response.data
}

/**
 * Lista todos os sinais vitais de um residente específico
 */
/**
 * Busca um sinal vital por ID
 */
export async function getVitalSign(id: string): Promise<VitalSign> {
  const response = await api.get(`/vital-signs/${id}`)
  return response.data
}

/**
 * Atualiza um sinal vital com versionamento
 */
export async function updateVitalSign(id: string, data: UpdateVitalSignVersionedDto): Promise<VitalSign> {
  const response = await api.patch(`/vital-signs/${id}`, data)
  return response.data
}

/**
 * Soft delete de um sinal vital com versionamento
 */
export async function deleteVitalSign(id: string, deleteReason: string): Promise<{ message: string }> {
  const response = await api.delete(`/vital-signs/${id}`, {
    data: { deleteReason },
  })
  return response.data
}

/**
 * Consultar histórico completo de alterações de um sinal vital
 */
export async function getVitalSignHistory(id: string): Promise<VitalSignHistoryResponse> {
  const response = await api.get(`/vital-signs/${id}/history`)
  return response.data
}

/**
 * Consultar versão específica do histórico de um sinal vital
 */
export async function getVitalSignHistoryVersion(id: string, version: number): Promise<VitalSignHistoryEntry> {
  const response = await api.get(`/vital-signs/${id}/history/${version}`)
  return response.data
}
