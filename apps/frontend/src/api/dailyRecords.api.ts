import { api } from '../services/api'

export type RecordType =
  | 'HIGIENE'
  | 'ALIMENTACAO'
  | 'HIDRATACAO'
  | 'MONITORAMENTO'
  | 'ELIMINACAO'
  | 'COMPORTAMENTO'
  | 'INTERCORRENCIA'
  | 'ATIVIDADES'
  | 'VISITA'
  | 'OUTROS'

export interface DailyRecord {
  id: string
  tenantId: string
  residentId: string
  type: RecordType
  date: string
  time: string
  data: any
  recordedBy: string
  userId: string
  notes?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  resident?: {
    id: string
    fullName: string
    fotoUrl?: string
  }
}

export interface DailyRecordHistoryVersion {
  id: string
  recordId: string
  tenantId: string
  versionNumber: number
  previousData: any
  newData: any
  changedFields: string[]
  changeType: 'UPDATE' | 'DELETE'
  changeReason: string
  changedBy: string
  changedByName: string
  changedAt: string
  ipAddress?: string
  userAgent?: string
}

export interface DailyRecordHistoryResponse {
  recordId: string
  recordType: RecordType
  totalVersions: number
  history: DailyRecordHistoryVersion[]
}

class DailyRecordsAPI {
  /**
   * Busca o histórico de versões de um registro diário
   */
  async getHistory(recordId: string): Promise<DailyRecordHistoryResponse> {
    const response = await api.get(`/daily-records/${recordId}/history`)
    return response.data
  }

  /**
   * Busca um registro diário por ID
   */
  async getById(id: string): Promise<DailyRecord> {
    const response = await api.get(`/daily-records/${id}`)
    return response.data
  }

  /**
   * Atualiza um registro diário (requer editReason)
   */
  async update(
    id: string,
    data: {
      type?: RecordType
      date?: string
      time?: string
      data?: any
      recordedBy?: string
      notes?: string
      editReason: string
    }
  ): Promise<DailyRecord> {
    const response = await api.patch(`/daily-records/${id}`, data)
    return response.data
  }

  /**
   * Remove um registro diário (soft delete, requer deleteReason)
   */
  async delete(id: string, deleteReason: string): Promise<{ message: string }> {
    const response = await api.delete(`/daily-records/${id}`, {
      data: { deleteReason },
    })
    return response.data
  }

  /**
   * Restaura um registro para uma versão anterior
   */
  async restoreVersion(
    recordId: string,
    versionId: string,
    restoreReason: string
  ): Promise<DailyRecord> {
    const response = await api.post(`/daily-records/${recordId}/restore`, {
      versionId,
      restoreReason,
    })
    return response.data
  }
}

export const dailyRecordsAPI = new DailyRecordsAPI()
