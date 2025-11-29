import { api } from '@/services/api'

export interface ResidentDocument {
  id: string
  tenantId: string
  residentId: string
  type: string
  fileUrl: string
  fileKey: string | null
  fileName: string
  fileSize: number | null
  mimeType: string | null
  details: string | null
  uploadedBy: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface CreateResidentDocumentDto {
  type: string
  details?: string
}

export interface UpdateResidentDocumentDto {
  type?: string
  details?: string
}

export const RESIDENT_DOCUMENT_TYPES = [
  { value: 'CARTAO_CONVENIO', label: 'Cartão do convênio' },
  { value: 'COMPROVANTE_RESIDENCIA_RESIDENTE', label: 'Comprovante de residência do residente' },
  { value: 'DOCUMENTOS_RESPONSAVEL_LEGAL', label: 'Documentos do responsável legal' },
  { value: 'COMPROVANTE_RESIDENCIA_RESPONSAVEL', label: 'Comprovante de residência do responsável legal' },
  { value: 'DOCUMENTOS_PESSOAIS', label: 'Documentos pessoais do residente' },
  { value: 'LAUDO_MEDICO', label: 'Laudo médico do residente' },
  { value: 'PRESCRICAO_MEDICA', label: 'Prescrição médica' },
  { value: 'TERMO_ADMISSAO', label: 'Termo de admissão do residente' },
  { value: 'TERMO_CONSENTIMENTO_IMAGEM', label: 'Termo de consentimento de imagem' },
  { value: 'TERMO_CONSENTIMENTO_LGPD', label: 'Termo de consentimento LGPD' },
] as const

class ResidentDocumentsAPI {
  /**
   * Lista documentos de um residente
   */
  async getDocuments(residentId: string, type?: string): Promise<ResidentDocument[]> {
    const params = type ? { type } : {}
    const response = await api.get<ResidentDocument[]>(`/residents/${residentId}/documents`, {
      params,
    })
    return response.data
  }

  /**
   * Busca um documento específico
   */
  async getDocument(residentId: string, documentId: string): Promise<ResidentDocument> {
    const response = await api.get<ResidentDocument>(
      `/residents/${residentId}/documents/${documentId}`
    )
    return response.data
  }

  /**
   * Faz upload de um novo documento
   */
  async uploadDocument(
    residentId: string,
    file: File,
    metadata: CreateResidentDocumentDto
  ): Promise<ResidentDocument> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', metadata.type)
    if (metadata.details) {
      formData.append('details', metadata.details)
    }

    const response = await api.post<ResidentDocument>(
      `/residents/${residentId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  }

  /**
   * Atualiza metadados de um documento
   */
  async updateDocumentMetadata(
    residentId: string,
    documentId: string,
    data: UpdateResidentDocumentDto
  ): Promise<ResidentDocument> {
    const response = await api.patch<ResidentDocument>(
      `/residents/${residentId}/documents/${documentId}`,
      data
    )
    return response.data
  }

  /**
   * Substitui o arquivo de um documento
   */
  async replaceDocumentFile(
    residentId: string,
    documentId: string,
    file: File
  ): Promise<ResidentDocument> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.patch<ResidentDocument>(
      `/residents/${residentId}/documents/${documentId}/file`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  }

  /**
   * Deleta um documento
   */
  async deleteDocument(
    residentId: string,
    documentId: string
  ): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(
      `/residents/${residentId}/documents/${documentId}`
    )
    return response.data
  }
}

export const residentDocumentsAPI = new ResidentDocumentsAPI()
