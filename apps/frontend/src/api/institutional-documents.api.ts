import { api } from '@/services/api'
import type { LegalNature } from '@/api/institutional-profile.api'

// ──────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ──────────────────────────────────────────────────────────────────────────────

export type DocumentStatus = 'OK' | 'PENDENTE' | 'VENCENDO' | 'VENCIDO'

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
  documentNumber?: string
  issuerEntity?: string
  tags?: string[]
  notes?: string
  version: number
  replacedById?: string
  replacedAt?: string

  // Arquivo original (backup auditoria)
  originalFileUrl?: string
  originalFileKey?: string
  originalFileName?: string
  originalFileSize?: number
  originalFileMimeType?: string
  originalFileHash?: string

  // Arquivo processado (PDF com carimbo)
  processedFileUrl?: string
  processedFileKey?: string
  processedFileName?: string
  processedFileSize?: number
  processedFileHash?: string

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

class InstitutionalDocumentsAPI {
  private baseUrl = '/institutional-documents'

  async getDocuments(filters?: { type?: string; status?: DocumentStatus }): Promise<TenantDocument[]> {
    const response = await api.get<TenantDocument[]>(`${this.baseUrl}`, {
      params: filters,
    })
    return response.data
  }

  async getDocument(documentId: string): Promise<TenantDocument> {
    const response = await api.get<TenantDocument>(`${this.baseUrl}/${documentId}`)
    return response.data
  }

  async uploadDocument(file: File, metadata: CreateTenantDocumentDto): Promise<TenantDocument> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', metadata.type)
    if (metadata.issuedAt) formData.append('issuedAt', metadata.issuedAt)
    if (metadata.expiresAt) formData.append('expiresAt', metadata.expiresAt)
    if (metadata.documentNumber) formData.append('documentNumber', metadata.documentNumber)
    if (metadata.issuerEntity) formData.append('issuerEntity', metadata.issuerEntity)
    if (metadata.tags && metadata.tags.length > 0) formData.append('tags', JSON.stringify(metadata.tags))
    if (metadata.notes) formData.append('notes', metadata.notes)

    const response = await api.post<TenantDocument>(`${this.baseUrl}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

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

    const response = await api.post<TenantDocument>(`${this.baseUrl}/with-file-url`, payload)
    return response.data
  }

  async updateDocumentMetadata(documentId: string, data: UpdateTenantDocumentDto): Promise<TenantDocument> {
    const response = await api.patch<TenantDocument>(`${this.baseUrl}/${documentId}`, data)
    return response.data
  }

  async replaceDocumentFile(documentId: string, file: File): Promise<TenantDocument> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post<TenantDocument>(`${this.baseUrl}/${documentId}/file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  async deleteDocument(documentId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`${this.baseUrl}/${documentId}`)
    return response.data
  }

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

export const institutionalDocumentsAPI = new InstitutionalDocumentsAPI()
