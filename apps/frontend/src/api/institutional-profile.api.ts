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
  notes?: string
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

export interface CreateTenantDocumentDto {
  type: string
  issuedAt?: string
  expiresAt?: string
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

  async getProfile(): Promise<TenantProfile | null> {
    const response = await api.get<TenantProfile>(`${this.baseUrl}`)
    return response.data
  }

  async createOrUpdateProfile(data: CreateTenantProfileDto | UpdateTenantProfileDto): Promise<TenantProfile> {
    const response = await api.post<TenantProfile>(`${this.baseUrl}`, data)
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
    if (metadata.notes) formData.append('notes', metadata.notes)

    const response = await api.post<TenantDocument>(`${this.baseUrl}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
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

  async updateDocumentsStatus(): Promise<{ updated: number }> {
    const response = await api.post(`${this.baseUrl}/update-statuses`)
    return response.data
  }
}

export const institutionalProfileAPI = new InstitutionalProfileAPI()
