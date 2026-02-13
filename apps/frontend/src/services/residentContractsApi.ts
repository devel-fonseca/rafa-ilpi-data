import { api } from './api'

export interface ResidentContract {
  id: string
  tenantId: string
  residentId: string
  contractNumber: string
  startDate: string
  endDate: string
  monthlyAmount: number
  dueDay: number
  lateFeePercent: number
  interestMonthlyPercent: number
  status: 'VIGENTE' | 'VENCENDO_EM_30_DIAS' | 'VENCIDO'
  adjustmentIndex?: string
  adjustmentRate?: number
  lastAdjustmentDate?: string
  signatories: Array<{
    name: string
    cpf?: string
    role: 'RESIDENTE' | 'RESPONSAVEL_LEGAL' | 'RESPONSAVEL_CONTRATUAL' | 'TESTEMUNHA' | 'ILPI'
  }>
  notes?: string
  originalFileUrl?: string | null
  originalFileName?: string | null
  originalFileSize?: number | null
  originalFileMimeType?: string | null
  originalFileHash?: string | null
  processedFileUrl?: string | null
  processedFileName?: string | null
  processedFileSize?: number | null
  processedFileHash?: string | null
  version: number
  replacedById?: string
  replacedAt?: string
  uploadedBy: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  resident?: {
    id: string
    fullName: string
    cpf?: string
    status: string
  }
  uploader?: {
    id: string
    name: string
    email: string
  }
}

export interface ContractHistory {
  id: string
  action: 'CREATED' | 'UPDATED' | 'REPLACED' | 'DELETED'
  reason?: string
  previousData?: Record<string, unknown>
  newData?: Record<string, unknown>
  changedFields: string[]
  changedBy: string
  changedAt: string
  user?: {
    id: string
    name: string
    email: string
  }
}

export interface CreateContractDto {
  contractNumber: string
  startDate: string
  endDate: string
  monthlyAmount: number
  dueDay: number
  lateFeePercent?: number
  interestMonthlyPercent?: number
  adjustmentIndex?: string
  adjustmentRate?: number
  lastAdjustmentDate?: string
  signatories: Array<{
    name: string
    cpf?: string
    role: string
  }>
  notes?: string
}

export interface UpdateContractDto {
  monthlyAmount?: number
  dueDay?: number
  lateFeePercent?: number
  interestMonthlyPercent?: number
  adjustmentIndex?: string
  adjustmentRate?: number
  lastAdjustmentDate?: string
  notes?: string
}

export interface ReplaceContractFileDto {
  reason: string
}

export interface ValidateContractDto {
  hash: string
}

/**
 * Listar todos os contratos com filtros opcionais
 */
export async function listResidentContracts(params?: {
  residentId?: string
  status?: string
  search?: string
}): Promise<ResidentContract[]> {
  const response = await api.get('/resident-contracts', { params })
  return response.data
}

/**
 * Buscar contratos de um residente específico
 */
export async function getResidentContracts(residentId: string): Promise<ResidentContract[]> {
  const response = await api.get(`/residents/${residentId}/contracts`)
  return response.data
}

/**
 * Buscar detalhes de um contrato específico
 */
export async function getContractDetails(residentId: string, contractId: string): Promise<ResidentContract> {
  const response = await api.get(`/residents/${residentId}/contracts/${contractId}`)
  return response.data
}

/**
 * Upload de novo contrato (com arquivo)
 */
export async function uploadContract(
  residentId: string,
  file: File | null | undefined,
  data: CreateContractDto
): Promise<ResidentContract> {
  const formData = new FormData()
  if (file) {
    formData.append('file', file)
  }

  // Adicionar campos do DTO ao FormData
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (key === 'signatories') {
        // Garantir que signatories seja sempre um array (mesmo que vazio)
        const signatories = Array.isArray(value) ? value : []
        formData.append(key, JSON.stringify(signatories))
      } else {
        formData.append(key, value.toString())
      }
    }
  })

  const response = await api.post(`/residents/${residentId}/contracts`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

/**
 * Atualizar metadados do contrato (sem arquivo)
 */
export async function updateContract(
  residentId: string,
  contractId: string,
  data: UpdateContractDto
): Promise<ResidentContract> {
  const response = await api.patch(`/residents/${residentId}/contracts/${contractId}`, data)
  return response.data
}

/**
 * Substituir arquivo do contrato (nova versão)
 */
export async function replaceContractFile(
  residentId: string,
  contractId: string,
  file: File,
  reason: string
): Promise<ResidentContract> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('reason', reason)

  const response = await api.post(`/residents/${residentId}/contracts/${contractId}/file`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

/**
 * Deletar contrato
 */
export async function deleteContract(residentId: string, contractId: string): Promise<void> {
  await api.delete(`/residents/${residentId}/contracts/${contractId}`)
}

/**
 * Buscar histórico de alterações do contrato
 */
export async function getContractHistory(residentId: string, contractId: string): Promise<ContractHistory[]> {
  const response = await api.get(`/residents/${residentId}/contracts/${contractId}/history`)
  return response.data
}

/**
 * Validar contrato por hash (endpoint público)
 */
export async function validateContract(contractId: string, hash: string): Promise<{
  valid: boolean
  contract?: {
    id: string
    contractNumber: string
    version: number
    residentName: string
    tenantName: string
    uploadDate: string
  }
}> {
  const response = await api.get(`/contracts/validate/${contractId}`, {
    params: { hash },
  })
  return response.data
}
