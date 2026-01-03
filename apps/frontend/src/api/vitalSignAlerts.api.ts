import { api } from '@/services/api'

// Types importados do backend (copiados para evitar dependência direta de @prisma/client)
export enum VitalSignAlertType {
  PRESSURE_HIGH = 'PRESSURE_HIGH',
  PRESSURE_LOW = 'PRESSURE_LOW',
  GLUCOSE_HIGH = 'GLUCOSE_HIGH',
  GLUCOSE_LOW = 'GLUCOSE_LOW',
  TEMPERATURE_HIGH = 'TEMPERATURE_HIGH',
  TEMPERATURE_LOW = 'TEMPERATURE_LOW',
  OXYGEN_LOW = 'OXYGEN_LOW',
  HEART_RATE_HIGH = 'HEART_RATE_HIGH',
  HEART_RATE_LOW = 'HEART_RATE_LOW',
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  IN_TREATMENT = 'IN_TREATMENT',
  MONITORING = 'MONITORING',
  RESOLVED = 'RESOLVED',
  IGNORED = 'IGNORED',
}

// ──────────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────────

export interface VitalSignAlert {
  id: string
  tenantId: string
  residentId: string
  vitalSignId: string
  notificationId?: string
  type: VitalSignAlertType
  severity: AlertSeverity
  title: string
  description: string
  value: string
  metadata: {
    threshold: string
    expectedRange: string
    detectedAt: Date
    [key: string]: any
  }
  status: AlertStatus
  priority: number
  assignedTo?: string
  medicalNotes?: string
  actionTaken?: string
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
  resolvedBy?: string
  createdBy?: string
  resident?: {
    id: string
    fullName: string
    bedId?: string
  }
  vitalSign?: {
    id: string
    timestamp: Date
    systolicBloodPressure?: number
    diastolicBloodPressure?: number
    bloodGlucose?: number
    temperature?: number
    oxygenSaturation?: number
    heartRate?: number
  }
  assignedUser?: {
    id: string
    name: string
    profile?: {
      positionCode?: string
    }
  }
  resolvedUser?: {
    id: string
    name: string
  }
  clinicalNotes?: Array<{
    id: string
    noteDate: Date
    profession: string
  }>
}

export interface CreateVitalSignAlertDto {
  residentId: string
  vitalSignId: string
  notificationId?: string
  type: VitalSignAlertType
  severity: AlertSeverity
  title: string
  description: string
  value: string
  metadata: Record<string, any>
  status?: AlertStatus
  priority?: number
  assignedTo?: string
}

export interface UpdateVitalSignAlertDto {
  status?: AlertStatus
  assignedTo?: string
  medicalNotes?: string
  actionTaken?: string
}

export interface QueryVitalSignAlertsDto {
  residentId?: string
  status?: AlertStatus
  type?: VitalSignAlertType
  severity?: AlertSeverity
  assignedTo?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export interface VitalSignAlertsResponse {
  data: VitalSignAlert[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface AlertStats {
  active: number
  inTreatment: number
  monitoring: number
  resolved: number
  ignored: number
  total: number
}

export interface PrefillData {
  objective: string
  assessment: string
  residentId: string
  suggestedTags: string[]
}

// ──────────────────────────────────────────────────────────────────────────────
// API FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Criar novo alerta médico de sinal vital
 */
export const createVitalSignAlert = async (
  data: CreateVitalSignAlertDto,
): Promise<VitalSignAlert> => {
  const response = await api.post('/vital-sign-alerts', data)
  return response.data
}

/**
 * Listar alertas com filtros e paginação
 */
export const getVitalSignAlerts = async (
  params?: QueryVitalSignAlertsDto,
): Promise<VitalSignAlertsResponse> => {
  const response = await api.get('/vital-sign-alerts', { params })
  return response.data
}

/**
 * Buscar estatísticas de alertas por status
 */
export const getAlertStats = async (): Promise<AlertStats> => {
  const response = await api.get('/vital-sign-alerts/stats')
  return response.data
}

/**
 * Buscar alertas ativos de um residente específico
 */
export const getActiveAlertsByResident = async (
  residentId: string,
): Promise<VitalSignAlert[]> => {
  const response = await api.get(
    `/vital-sign-alerts/resident/${residentId}/active`,
  )
  return response.data
}

/**
 * Buscar alerta por ID
 */
export const getVitalSignAlert = async (
  id: string,
): Promise<VitalSignAlert> => {
  const response = await api.get(`/vital-sign-alerts/${id}`)
  return response.data
}

/**
 * Atualizar alerta (status, atribuição, notas médicas)
 */
export const updateVitalSignAlert = async (
  id: string,
  data: UpdateVitalSignAlertDto,
): Promise<VitalSignAlert> => {
  const response = await api.patch(`/vital-sign-alerts/${id}`, data)
  return response.data
}

/**
 * Pré-preencher evolução clínica a partir de alerta
 */
export const prefillFromAlert = async (
  alertId: string,
): Promise<PrefillData> => {
  const response = await api.get(
    `/clinical-notes/prefill-from-alert/${alertId}`,
  )
  return response.data
}
