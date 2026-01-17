import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadFileDetailed } from '@/services/upload'
import {
  institutionalProfileAPI,
  type CreateTenantDocumentDto,
  type UpdateTenantDocumentDto,
  type LegalNature,
  type DocumentStatus,
  type UpdateInstitutionalProfileDto,
} from '@/api/institutional-profile.api'

// ──────────────────────────────────────────────────────────────────────────────
// QUERY KEYS
// ──────────────────────────────────────────────────────────────────────────────

export const institutionalProfileKeys = {
  all: ['institutional-profile'] as const,
  profile: () => [...institutionalProfileKeys.all, 'profile'] as const,
  documents: () => [...institutionalProfileKeys.all, 'documents'] as const,
  documentsList: (filters?: { type?: string; status?: DocumentStatus }) =>
    [...institutionalProfileKeys.documents(), 'list', filters] as const,
  document: (id: string) => [...institutionalProfileKeys.documents(), 'detail', id] as const,
  compliance: () => [...institutionalProfileKeys.all, 'compliance'] as const,
  requirements: (legalNature: LegalNature) => [...institutionalProfileKeys.all, 'requirements', legalNature] as const,
  allTypes: (legalNature: LegalNature) => [...institutionalProfileKeys.all, 'all-types', legalNature] as const,
}

// ──────────────────────────────────────────────────────────────────────────────
// PROFILE HOOKS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Hook para buscar o perfil institucional
 */
export function useProfile() {
  return useQuery({
    queryKey: institutionalProfileKeys.profile(),
    queryFn: async () => {
      console.log('🌐 [useProfile] Chamando API getProfile...')
      const result = await institutionalProfileAPI.getProfile()
      console.log('✅ [useProfile] API retornou:', {
        legalNature: result.profile?.legalNature,
        tenantName: result.tenant.name,
        logoUrl: result.profile?.logoUrl,
        hasProfile: !!result.profile,
        timestamp: new Date().toISOString()
      })
      return result
    },
  })
}

/**
 * Hook para criar ou atualizar o perfil institucional completo (tenant + profile)
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateInstitutionalProfileDto) =>
      institutionalProfileAPI.createOrUpdateProfile(data),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: institutionalProfileKeys.profile() })
      queryClient.invalidateQueries({ queryKey: institutionalProfileKeys.compliance() })
    },
  })
}

/**
 * Hook para upload de logo
 */
export function useUploadLogo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => institutionalProfileAPI.uploadLogo(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: institutionalProfileKeys.profile() })
    },
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// DOCUMENTS HOOKS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Hook para listar documentos com filtros opcionais
 */
export function useDocuments(filters?: { type?: string; status?: DocumentStatus }) {
  return useQuery({
    queryKey: institutionalProfileKeys.documentsList(filters),
    queryFn: () => institutionalProfileAPI.getDocuments(filters),
  })
}

/**
 * Hook para buscar um documento específico
 */
export function useDocument(documentId: string) {
  return useQuery({
    queryKey: institutionalProfileKeys.document(documentId),
    queryFn: () => institutionalProfileAPI.getDocument(documentId),
    enabled: !!documentId,
  })
}

/**
 * Hook para upload de novo documento
 * Separa o upload do arquivo (usando /files/upload) dos metadados
 */
export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ file, metadata }: { file: File; metadata: CreateTenantDocumentDto }) => {
      // 1. Primeiro faz upload do arquivo usando o serviço genérico de files
      const uploadResult = await uploadFileDetailed(file, 'institutional-documents')

      // 2. Depois cria o registro do documento com a URL do arquivo e os metadados
      return institutionalProfileAPI.createDocumentWithFileUrl(
        uploadResult.fileUrl,
        uploadResult.fileId,
        uploadResult.fileName,
        uploadResult.fileSize,
        uploadResult.mimeType,
        metadata
      )
    },
    onSuccess: () => {
      // Invalidar todas as queries de documentos e compliance
      queryClient.invalidateQueries({ queryKey: institutionalProfileKeys.documents() })
      queryClient.invalidateQueries({ queryKey: institutionalProfileKeys.compliance() })
    },
  })
}

/**
 * Hook para atualizar metadados de um documento
 */
export function useUpdateDocumentMetadata() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ documentId, data }: { documentId: string; data: UpdateTenantDocumentDto }) =>
      institutionalProfileAPI.updateDocumentMetadata(documentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: institutionalProfileKeys.document(variables.documentId) })
      queryClient.invalidateQueries({ queryKey: institutionalProfileKeys.documents() })
      queryClient.invalidateQueries({ queryKey: institutionalProfileKeys.compliance() })
    },
  })
}

/**
 * Hook para substituir o arquivo de um documento
 */
export function useReplaceDocumentFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ documentId, file }: { documentId: string; file: File }) =>
      institutionalProfileAPI.replaceDocumentFile(documentId, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: institutionalProfileKeys.document(variables.documentId) })
      queryClient.invalidateQueries({ queryKey: institutionalProfileKeys.documents() })
    },
  })
}

/**
 * Hook para deletar um documento
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: string) => institutionalProfileAPI.deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: institutionalProfileKeys.documents() })
      queryClient.invalidateQueries({ queryKey: institutionalProfileKeys.compliance() })
    },
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// COMPLIANCE & REQUIREMENTS HOOKS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Hook para buscar dashboard de compliance
 */
export function useComplianceDashboard() {
  return useQuery({
    queryKey: institutionalProfileKeys.compliance(),
    queryFn: () => institutionalProfileAPI.getComplianceDashboard(),
  })
}

/**
 * Hook para buscar requisitos de documentos por natureza jurídica
 */
export function useDocumentRequirements(legalNature: LegalNature | null | undefined) {
  return useQuery({
    queryKey: institutionalProfileKeys.requirements(legalNature!),
    queryFn: () => institutionalProfileAPI.getDocumentRequirements(legalNature!),
    enabled: !!legalNature,
  })
}

/**
 * Hook para buscar TODOS os tipos de documentos (obrigatórios + opcionais)
 */
export function useAllDocumentTypes(legalNature: LegalNature | null | undefined) {
  return useQuery({
    queryKey: institutionalProfileKeys.allTypes(legalNature!),
    queryFn: () => institutionalProfileAPI.getAllDocumentTypes(legalNature!),
    enabled: !!legalNature,
  })
}

/**
 * Hook para atualizar status de todos os documentos (admin only)
 */
export function useUpdateDocumentsStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => institutionalProfileAPI.updateDocumentsStatus(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: institutionalProfileKeys.documents() })
      queryClient.invalidateQueries({ queryKey: institutionalProfileKeys.compliance() })
    },
  })
}
