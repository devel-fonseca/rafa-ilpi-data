/**
 * @fileoverview API de Medicamentos SOS (Entidade Independente com Versionamento)
 *
 * Este arquivo contém tipos e funções para operações CRUD diretas em medicamentos SOS,
 * incluindo campos de versionamento e auditoria.
 *
 * IMPORTANTE - Duplicação de Tipos:
 * O tipo `SOSMedication` aqui é DIFERENTE do tipo em prescriptions.api.ts:
 * - ESTE arquivo: Medicamento SOS como entidade independente (para edição/versionamento)
 * - prescriptions.api.ts: Medicamento SOS aninhado em Prescription (para leitura)
 *
 * QUANDO USAR:
 * - Use tipos DESTE arquivo para operações de edição/exclusão de medicamentos SOS individuais
 * - Use tipos de prescriptions.api.ts quando listar prescrições com medicamentos SOS aninhados
 *
 * TODO (Refatoração Futura):
 * Considerar renomear `SOSMedication` → `SOSMedicationEntity` para maior clareza
 */
import { api } from '@/services/api'

// ==================== TYPES ====================

export type MedicationPresentation =
  | 'COMPRIMIDO'
  | 'CAPSULA'
  | 'AMPOLA'
  | 'GOTAS'
  | 'SOLUCAO'
  | 'SUSPENSAO'
  | 'POMADA'
  | 'CREME'
  | 'SPRAY'
  | 'INALADOR'

export type AdministrationRoute =
  | 'VO'
  | 'IM'
  | 'EV'
  | 'SC'
  | 'TOPICA'
  | 'SL'
  | 'RETAL'
  | 'OCULAR'
  | 'NASAL'
  | 'INALATORIA'

export type SOSIndicationType =
  | 'DOR'
  | 'FEBRE'
  | 'ANSIEDADE'
  | 'AGITACAO'
  | 'NAUSEA'
  | 'INSONIA'
  | 'OUTRO'

export interface SOSMedication {
  id: string
  prescriptionId: string
  name: string
  presentation: MedicationPresentation
  concentration: string
  dose: string
  route: AdministrationRoute
  indication: SOSIndicationType
  indicationDetails: string | null
  minInterval: string
  maxDailyDoses: number
  startDate: string
  endDate: string | null
  instructions: string | null
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

export interface CreateSOSMedicationDto {
  prescriptionId: string
  name: string
  presentation: MedicationPresentation
  concentration: string
  dose: string
  route: AdministrationRoute
  indication: SOSIndicationType
  indicationDetails?: string
  minInterval: string
  maxDailyDoses: number
  startDate: string
  endDate?: string
  instructions?: string
}

export interface UpdateSOSMedicationDto {
  name?: string
  presentation?: MedicationPresentation
  concentration?: string
  dose?: string
  route?: AdministrationRoute
  indication?: SOSIndicationType
  indicationDetails?: string
  minInterval?: string
  maxDailyDoses?: number
  startDate?: string
  endDate?: string
  instructions?: string
}

/**
 * DTO para atualizar medicamento SOS com versionamento
 */
export interface UpdateSOSMedicationVersionedDto extends UpdateSOSMedicationDto {
  changeReason: string
}

/**
 * Entrada de histórico de medicamento SOS
 */
export interface SOSMedicationHistoryEntry {
  id: string
  tenantId: string
  sosMedicationId: string
  versionNumber: number
  changeType: 'CREATE' | 'UPDATE' | 'DELETE'
  changeReason: string
  previousData: Partial<SOSMedication> | null
  newData: Partial<SOSMedication>
  changedFields: string[]
  changedAt: string
  changedBy: string
  changedByName?: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Resposta de histórico de medicamento SOS
 */
export interface SOSMedicationHistoryResponse {
  sosMedicationId: string
  currentVersion: number
  totalVersions: number
  history: SOSMedicationHistoryEntry[]
}

// ==================== API FUNCTIONS ====================

/**
 * Cria um novo medicamento SOS
 */
export async function createSOSMedication(data: CreateSOSMedicationDto): Promise<SOSMedication> {
  const response = await api.post('/sos-medications', data)
  return response.data
}

/**
 * Lista todos os medicamentos SOS de uma prescrição específica
 */
export async function getSOSMedicationsByPrescription(prescriptionId: string): Promise<SOSMedication[]> {
  const response = await api.get(`/sos-medications/prescription/${prescriptionId}`)
  return response.data
}

/**
 * Busca um medicamento SOS por ID
 */
export async function getSOSMedication(id: string): Promise<SOSMedication> {
  const response = await api.get(`/sos-medications/${id}`)
  return response.data
}

/**
 * Atualiza um medicamento SOS com versionamento
 */
export async function updateSOSMedication(id: string, data: UpdateSOSMedicationVersionedDto): Promise<SOSMedication> {
  const response = await api.patch(`/sos-medications/${id}`, data)
  return response.data
}

/**
 * Soft delete de um medicamento SOS com versionamento
 */
export async function deleteSOSMedication(id: string, deleteReason: string): Promise<{ message: string }> {
  const response = await api.delete(`/sos-medications/${id}`, {
    data: { deleteReason },
  })
  return response.data
}

/**
 * Consultar histórico completo de alterações de um medicamento SOS
 */
export async function getSOSMedicationHistory(id: string): Promise<SOSMedicationHistoryResponse> {
  const response = await api.get(`/sos-medications/${id}/history`)
  return response.data
}

/**
 * Consultar versão específica do histórico de um medicamento SOS
 */
export async function getSOSMedicationHistoryVersion(id: string, version: number): Promise<SOSMedicationHistoryEntry> {
  const response = await api.get(`/sos-medications/${id}/history/${version}`)
  return response.data
}
