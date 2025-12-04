import api from './axiosConfig'

/**
 * Tipos de dados de sinais vitais
 */
export interface VitalSign {
  id: string
  timestamp: string
  systolicBloodPressure: number | null
  diastolicBloodPressure: number | null
  temperature: number | null
  heartRate: number | null
  oxygenSaturation: number | null
  bloodGlucose: number | null
  recordedBy?: string
  notes?: string
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
