import { api } from '@/services/api'

// ──────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ──────────────────────────────────────────────────────────────────────────────

export type LegalNature = 'ASSOCIACAO' | 'FUNDACAO' | 'EMPRESA_PRIVADA' | 'MEI'
export type DocumentStatus = 'OK' | 'PENDENTE' | 'VENCENDO' | 'VENCIDO'

export interface TenantProfile {
  id: string
  tenantId: string
  logoUrl?: string
  logoKey?: string
  legalNature?: LegalNature
  tradeName?: string
  cnesCode?: string
  capacityDeclared?: number
  capacityLicensed?: number
  contactPhone?: string
  contactEmail?: string
  websiteUrl?: string
  foundedAt?: string
  mission?: string
  vision?: string
  values?: string
  notes?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface TenantDocument {
  id: string
  tenantId: string
  type: string
  fileUrl: string
  fileKey?: string
  fileName: string
  fileSize?: number
  mimeType?: string
  issuedAt?: string
  expiresAt?: string
  status: DocumentStatus
  documentNumber?: string         // Número do documento (protocolo, alvará, etc.)
  issuerEntity?: string           // Entidade emissora
  tags?: string[]                 // Tags para categorização
  notes?: string
  version: number                 // Versão do documento (incrementa a cada substituição)
  replacedById?: string           // ID do documento que substituiu este
  replacedAt?: string             // Data em que foi substituído

  // ========== PROCESSAMENTO COM CARIMBO INSTITUCIONAL ==========
  // Arquivo original (backup auditoria)
  originalFileUrl?: string
  originalFileKey?: string
  originalFileName?: string
  originalFileSize?: number
  originalFileMimeType?: string
  originalFileHash?: string       // SHA-256

  // Arquivo processado (PDF com carimbo)
  processedFileUrl?: string
  processedFileKey?: string
  processedFileName?: string
  processedFileSize?: number
  processedFileHash?: string      // SHA-256

  // Token público para validação externa
  publicToken?: string

  // Metadados do processamento (JSON)
  processingMetadata?: Record<string, unknown>

  uploadedBy: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface ComplianceDashboard {
  totalDocuments: number
  okDocuments: number
  expiringDocuments: number
  expiredDocuments: number
  pendingDocuments: number
  requiredDocuments: Array<{
    type: string
    label: string
    uploaded: boolean
  }>
  missingDocuments: Array<{
    type: string
    label: string
  }>
  alerts: Array<{
    id: string
    type: string
    typeLabel: string
    status: DocumentStatus
    expiresAt?: string
    fileName: string
  }>
  compliancePercentage: number
}

export interface DocumentRequirement {
  type: string
  label: string
}

export interface DocumentRequirementsResponse {
  legalNature: LegalNature
  required: DocumentRequirement[]
}

export interface DocumentType {
  type: string
  label: string
  required: boolean
}

export interface AllDocumentTypesResponse {
  legalNature: LegalNature
  documentTypes: DocumentType[]
}

export interface CreateTenantProfileDto {
  legalNature?: LegalNature
  tradeName?: string
  cnesCode?: string
  capacityDeclared?: number
  capacityLicensed?: number
  contactPhone?: string
  contactEmail?: string
  websiteUrl?: string
  foundedAt?: string
  mission?: string
  vision?: string
  values?: string
  notes?: string
}

export interface UpdateTenantProfileDto extends Partial<CreateTenantProfileDto> {}

export interface TenantData {
  id: string
  name: string
  cnpj?: string
  email: string
  phone?: string
  addressStreet?: string
  addressNumber?: string
  addressComplement?: string
  addressDistrict?: string
  addressCity?: string
  addressState?: string
  addressZipCode?: string
}

export interface FullProfile {
  tenant: TenantData
  profile: TenantProfile | null
}

export interface UpdateTenantDto {
  phone?: string
  email?: string
  addressZipCode?: string
  addressStreet?: string
  addressNumber?: string
  addressComplement?: string
  addressDistrict?: string
  addressCity?: string
  addressState?: string
}

export interface UpdateInstitutionalProfileDto {
  profile?: UpdateTenantProfileDto
  tenant?: UpdateTenantDto
}

export interface CreateTenantDocumentDto {
  type: string
  issuedAt?: string
  expiresAt?: string
  documentNumber?: string
  issuerEntity?: string
  tags?: string[]
  notes?: string
}

export interface UpdateTenantDocumentDto extends Partial<CreateTenantDocumentDto> {}

// ──────────────────────────────────────────────────────────────────────────────
// API CLIENT
// ──────────────────────────────────────────────────────────────────────────────

class InstitutionalProfileAPI {
  private baseUrl = '/institutional-profile'

  // ────────────────────────────────────────────────────────────────────────────
  // PROFILE
  // ────────────────────────────────────────────────────────────────────────────

  async getProfile(): Promise<FullProfile> {
    const response = await api.get<FullProfile>(`${this.baseUrl}`)
    return response.data
  }

  async createOrUpdateProfile(data: UpdateInstitutionalProfileDto): Promise<FullProfile> {
    const response = await api.post<FullProfile>(`${this.baseUrl}`, data)
    return response.data
  }

  async uploadLogo(file: File): Promise<TenantProfile> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post<TenantProfile>(`${this.baseUrl}/logo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  // ────────────────────────────────────────────────────────────────────────────
  // DOCUMENTS
  // ────────────────────────────────────────────────────────────────────────────

  async getDocuments(filters?: { type?: string; status?: DocumentStatus }): Promise<TenantDocument[]> {
    const response = await api.get<TenantDocument[]>(`${this.baseUrl}/documents`, {
      params: filters,
    })
    return response.data
  }

  async getDocument(documentId: string): Promise<TenantDocument> {
    const response = await api.get<TenantDocument>(`${this.baseUrl}/documents/${documentId}`)
    return response.data
  }

  async uploadDocument(file: File, metadata: CreateTenantDocumentDto): Promise<TenantDocument> {
    const formData = new FormData()
    formData.append('file', file)

    // Adicionar metadados como campos do FormData
    formData.append('type', metadata.type)
    if (metadata.issuedAt) formData.append('issuedAt', metadata.issuedAt)
    if (metadata.expiresAt) formData.append('expiresAt', metadata.expiresAt)
    if (metadata.documentNumber) formData.append('documentNumber', metadata.documentNumber)
    if (metadata.issuerEntity) formData.append('issuerEntity', metadata.issuerEntity)
    if (metadata.tags && metadata.tags.length > 0) formData.append('tags', JSON.stringify(metadata.tags))
    if (metadata.notes) formData.append('notes', metadata.notes)

    const response = await api.post<TenantDocument>(`${this.baseUrl}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  /**
   * Cria documento a partir de arquivo já enviado
   * (usado quando o arquivo é enviado primeiro via /files/upload)
   */
  async createDocumentWithFileUrl(
    fileUrl: string,
    fileKey: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
    metadata: CreateTenantDocumentDto
  ): Promise<TenantDocument> {
    const payload = {
      fileUrl,
      fileKey,
      fileName,
      fileSize,
      mimeType,
      ...metadata,
    }

    const response = await api.post<TenantDocument>(`${this.baseUrl}/documents/with-file-url`, payload)
    return response.data
  }

  async updateDocumentMetadata(documentId: string, data: UpdateTenantDocumentDto): Promise<TenantDocument> {
    const response = await api.patch<TenantDocument>(`${this.baseUrl}/documents/${documentId}`, data)
    return response.data
  }

  async replaceDocumentFile(documentId: string, file: File): Promise<TenantDocument> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post<TenantDocument>(`${this.baseUrl}/documents/${documentId}/file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  async deleteDocument(documentId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`${this.baseUrl}/documents/${documentId}`)
    return response.data
  }

  // ────────────────────────────────────────────────────────────────────────────
  // COMPLIANCE & REQUIREMENTS
  // ────────────────────────────────────────────────────────────────────────────

  async getComplianceDashboard(): Promise<ComplianceDashboard> {
    const response = await api.get<ComplianceDashboard>(`${this.baseUrl}/compliance`)
    return response.data
  }

  async getDocumentRequirements(legalNature: LegalNature): Promise<DocumentRequirementsResponse> {
    const response = await api.get<DocumentRequirementsResponse>(`${this.baseUrl}/requirements/${legalNature}`)
    return response.data
  }

  async getAllDocumentTypes(legalNature: LegalNature): Promise<AllDocumentTypesResponse> {
    const response = await api.get<AllDocumentTypesResponse>(`${this.baseUrl}/all-document-types/${legalNature}`)
    return response.data
  }

  async updateDocumentsStatus(): Promise<{ updated: number }> {
    const response = await api.post(`${this.baseUrl}/update-statuses`)
    return response.data
  }
}

export const institutionalProfileAPI = new InstitutionalProfileAPI()
