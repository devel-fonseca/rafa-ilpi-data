import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  institutionalProfileAPI,
  type LegalNature,
  type UpdateInstitutionalProfileDto,
} from '@/api/institutional-profile.api'
import {
  institutionalDocumentsAPI,
  type CreateTenantDocumentDto,
  type UpdateTenantDocumentDto,
  type DocumentStatus,
} from '@/api/institutional-documents.api'

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
    queryFn: () => institutionalProfileAPI.getProfile(),
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
    queryFn: () => institutionalDocumentsAPI.getDocuments(filters),
  })
}

/**
 * Hook para buscar um documento específico
 */
export function useDocument(documentId: string) {
  return useQuery({
    queryKey: institutionalProfileKeys.document(documentId),
    queryFn: () => institutionalDocumentsAPI.getDocument(documentId),
    enabled: !!documentId,
  })
}

/**
 * Hook para upload de novo documento
 * Usa uploadDocument() que processa o arquivo com carimbo institucional
 */
export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ file, metadata }: { file: File; metadata: CreateTenantDocumentDto }) => {
      // Usa o método que processa o arquivo com carimbo institucional
      return institutionalDocumentsAPI.uploadDocument(file, metadata)
    },
    onSuccess: () => {
      // Invalidar TODAS as queries que começam com documents() - isso pega documentsList com qualquer filtro
      queryClient.invalidateQueries({
        queryKey: institutionalProfileKeys.documents(),
        exact: false  // Invalidar todas as queries que começam com 'documents'
      })
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
      institutionalDocumentsAPI.updateDocumentMetadata(documentId, data),
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
      institutionalDocumentsAPI.replaceDocumentFile(documentId, file),
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
    mutationFn: (documentId: string) => institutionalDocumentsAPI.deleteDocument(documentId),
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
    queryFn: () => institutionalDocumentsAPI.getComplianceDashboard(),
  })
}

/**
 * Hook para buscar requisitos de documentos por natureza jurídica
 */
export function useDocumentRequirements(legalNature: LegalNature | null | undefined) {
  return useQuery({
    queryKey: institutionalProfileKeys.requirements(legalNature!),
    queryFn: () => institutionalDocumentsAPI.getDocumentRequirements(legalNature!),
    enabled: !!legalNature,
  })
}

/**
 * Hook para buscar TODOS os tipos de documentos (obrigatórios + opcionais)
 */
export function useAllDocumentTypes(legalNature: LegalNature | null | undefined) {
  return useQuery({
    queryKey: institutionalProfileKeys.allTypes(legalNature!),
    queryFn: () => institutionalDocumentsAPI.getAllDocumentTypes(legalNature!),
    enabled: !!legalNature,
  })
}

/**
 * Hook para atualizar status de todos os documentos (admin only)
 */
export function useUpdateDocumentsStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => institutionalDocumentsAPI.updateDocumentsStatus(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: institutionalProfileKeys.documents() })
      queryClient.invalidateQueries({ queryKey: institutionalProfileKeys.compliance() })
    },
  })
}
