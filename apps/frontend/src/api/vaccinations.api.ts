import { api } from '@/services/api'

/**
 * Tipo de registro de vacinação
 */
export interface Vaccination {
  id: string
  tenantId: string
  residentId: string
  // Campos obrigatórios (RDC 502/2021)
  vaccine: string // Nome da vacina/profilaxia
  dose: string // Dose (ex: "1ª dose", "Reforço")
  date: string // Data da vacinação (ISO string)
  batch: string // Lote do imunizante
  manufacturer: string // Fabricante
  cnes: string // CNES do estabelecimento
  healthUnit: string // Nome do estabelecimento de saúde
  municipality: string // Município
  state: string // UF (2 caracteres)
  certificateUrl?: string | null // URL do comprovante - DEPRECATED: usar processedFileUrl
  notes?: string | null // Observações
  // Arquivo original (backup para auditoria)
  originalFileUrl?: string | null
  originalFileKey?: string | null
  originalFileName?: string | null
  originalFileSize?: number | null
  originalFileMimeType?: string | null
  originalFileHash?: string | null
  // Arquivo processado (PDF com carimbo institucional)
  processedFileUrl?: string | null
  processedFileKey?: string | null
  processedFileName?: string | null
  processedFileSize?: number | null
  processedFileHash?: string | null
  // Token público para validação
  publicToken?: string | null
  // Metadados do processamento
  processingMetadata?: Record<string, unknown> | null
  // Auditoria
  userId: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

/**
 * DTO para criar vacinação
 */
export interface CreateVaccinationDto {
  residentId: string
  vaccine: string
  dose: string
  date: string // ISO string
  batch: string
  manufacturer: string
  cnes: string
  healthUnit: string
  municipality: string
  state: string
  certificateUrl?: string
  notes?: string
}

/**
 * DTO para atualizar vacinação
 */
export interface UpdateVaccinationDto {
  vaccine?: string
  dose?: string
  date?: string
  batch?: string
  manufacturer?: string
  cnes?: string
  healthUnit?: string
  municipality?: string
  state?: string
  certificateUrl?: string
  notes?: string
}

/**
 * DTO para atualizar vacinação com versionamento
 */
export interface UpdateVaccinationVersionedDto extends UpdateVaccinationDto {
  changeReason: string
}

/**
 * Entrada de histórico de vacinação
 */
export interface VaccinationHistoryEntry {
  id: string
  tenantId: string
  vaccinationId: string
  versionNumber: number
  changeType: 'CREATE' | 'UPDATE' | 'DELETE'
  changeReason: string
  previousData: Partial<Vaccination> | null
  newData: Partial<Vaccination>
  changedFields: string[]
  changedAt: string
  changedBy: string
  changedByName?: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Resposta de histórico de vacinação
 */
export interface VaccinationHistoryResponse {
  vaccinationId: string
  currentVersion: number
  totalVersions: number
  history: VaccinationHistoryEntry[]
}

/**
 * Resposta do upload de comprovante processado
 */
export interface UploadProofResponse {
  message: string
  vaccination: Vaccination
  publicToken: string
  validationUrl: string
}

/**
 * API de Vacinações
 */
export const vaccinationsAPI = {
  /**
   * Criar novo registro de vacinação
   */
  async create(data: CreateVaccinationDto): Promise<Vaccination> {
    const response = await api.post('/vaccinations', data)
    return response.data
  },

  /**
   * Listar vacinações de um residente
   */
  async findByResident(residentId: string): Promise<Vaccination[]> {
    const response = await api.get(`/vaccinations/resident/${residentId}`)
    return response.data
  },

  /**
   * Obter detalhes de uma vacinação
   */
  async findOne(id: string): Promise<Vaccination> {
    const response = await api.get(`/vaccinations/${id}`)
    return response.data
  },

  /**
   * Atualizar vacinação com versionamento
   */
  async update(id: string, data: UpdateVaccinationVersionedDto): Promise<Vaccination> {
    const response = await api.patch(`/vaccinations/${id}`, data)
    return response.data
  },

  /**
   * Remover vacinação (soft delete) com versionamento
   */
  async remove(id: string, deleteReason: string): Promise<{ message: string }> {
    const response = await api.delete(`/vaccinations/${id}`, {
      data: { deleteReason },
    })
    return response.data
  },

  /**
   * Consultar histórico completo de alterações
   */
  async getHistory(id: string): Promise<VaccinationHistoryResponse> {
    const response = await api.get(`/vaccinations/${id}/history`)
    return response.data
  },

  /**
   * Consultar versão específica do histórico
   */
  async getHistoryVersion(id: string, version: number): Promise<VaccinationHistoryEntry> {
    const response = await api.get(`/vaccinations/${id}/history/${version}`)
    return response.data
  },

  /**
   * Upload de comprovante de vacinação com processamento institucional
   *
   * Envia arquivo (imagem ou PDF) que será:
   * 1. Convertido para PDF (se for imagem)
   * 2. Carimbado com dados institucionais
   * 3. Armazenado com hash SHA-256
   * 4. Associado a um token público para validação
   */
  async uploadProof(vaccinationId: string, file: File): Promise<UploadProofResponse> {
    const formData = new FormData()
    formData.append('file', file)

    // Não definir Content-Type manualmente - deixar o browser definir com boundary correto
    const response = await api.post(`/vaccinations/${vaccinationId}/proof`, formData)
    return response.data
  },
}
