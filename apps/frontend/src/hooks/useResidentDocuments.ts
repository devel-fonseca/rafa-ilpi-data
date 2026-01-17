import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  residentDocumentsAPI,
  type CreateResidentDocumentDto,
  type UpdateResidentDocumentDto,
} from '@/api/resident-documents.api'

// ──────────────────────────────────────────────────────────────────────────────
// QUERY KEYS
// ──────────────────────────────────────────────────────────────────────────────

export const residentDocumentsKeys = {
  all: ['resident-documents'] as const,
  lists: () => [...residentDocumentsKeys.all, 'list'] as const,
  list: (residentId: string, type?: string) =>
    [...residentDocumentsKeys.lists(), residentId, type] as const,
  details: () => [...residentDocumentsKeys.all, 'detail'] as const,
  detail: (residentId: string, documentId: string) =>
    [...residentDocumentsKeys.details(), residentId, documentId] as const,
}

// ──────────────────────────────────────────────────────────────────────────────
// HOOKS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Hook para listar documentos de um residente
 */
export function useResidentDocuments(residentId: string, type?: string) {
  return useQuery({
    queryKey: residentDocumentsKeys.list(residentId, type),
    queryFn: () => residentDocumentsAPI.getDocuments(residentId, type),
    enabled: !!residentId,
  })
}

/**
 * Hook para buscar um documento específico
 */
export function useResidentDocument(residentId: string, documentId: string) {
  return useQuery({
    queryKey: residentDocumentsKeys.detail(residentId, documentId),
    queryFn: () => residentDocumentsAPI.getDocument(residentId, documentId),
    enabled: !!residentId && !!documentId,
  })
}

/**
 * Hook para fazer upload de um documento
 */
export function useUploadResidentDocument(residentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ file, metadata }: { file: File; metadata: CreateResidentDocumentDto }) =>
      residentDocumentsAPI.uploadDocument(residentId, file, metadata),
    onSuccess: () => {
      // Invalidar lista de documentos
      queryClient.invalidateQueries({ queryKey: residentDocumentsKeys.lists() })
    },
  })
}

/**
 * Hook para atualizar metadados de um documento
 */
export function useUpdateResidentDocumentMetadata(residentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      documentId,
      data,
    }: {
      documentId: string
      data: UpdateResidentDocumentDto
    }) => residentDocumentsAPI.updateDocumentMetadata(residentId, documentId, data),
    onSuccess: (_, variables) => {
      // Invalidar documento específico e lista
      queryClient.invalidateQueries({
        queryKey: residentDocumentsKeys.detail(residentId, variables.documentId),
      })
      queryClient.invalidateQueries({ queryKey: residentDocumentsKeys.lists() })
    },
  })
}

/**
 * Hook para substituir arquivo de um documento
 */
export function useReplaceResidentDocumentFile(residentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ documentId, file }: { documentId: string; file: File }) =>
      residentDocumentsAPI.replaceDocumentFile(residentId, documentId, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: residentDocumentsKeys.detail(residentId, variables.documentId),
      })
      queryClient.invalidateQueries({ queryKey: residentDocumentsKeys.lists() })
    },
  })
}

/**
 * Hook para deletar um documento
 */
export function useDeleteResidentDocument(residentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: string) =>
      residentDocumentsAPI.deleteDocument(residentId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: residentDocumentsKeys.lists() })
    },
  })
}
