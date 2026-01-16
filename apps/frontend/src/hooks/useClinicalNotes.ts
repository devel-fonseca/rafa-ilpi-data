import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createClinicalNote,
  listClinicalNotes,
  listClinicalNotesByResident,
  getClinicalNote,
  getClinicalNoteHistory,
  updateClinicalNote,
  deleteClinicalNote,
  getClinicalNoteTags,
  getAuthorizedProfessions,
  getClinicalNoteDocumentsByResident,
  type ClinicalNote,
  type ClinicalNoteHistoryResponse,
  type ClinicalNoteDocument,
  type CreateClinicalNoteDto,
  type UpdateClinicalNoteDto,
  type QueryClinicalNoteDto,
  type DeleteClinicalNoteDto,
  type ClinicalProfession,
} from '@/api/clinicalNotes.api'
import { tenantKey } from '@/lib/query-keys'

// ==================== QUERY HOOKS ====================

/**
 * Hook para listar evoluções clínicas com filtros
 */
export function useClinicalNotes(query?: QueryClinicalNoteDto) {
  return useQuery<ClinicalNote[]>({
    queryKey: tenantKey('clinical-notes', 'list', JSON.stringify(query || {})),
    queryFn: () => listClinicalNotes(query),
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook para listar evoluções clínicas de um residente específico
 */
export function useClinicalNotesByResident(
  residentId: string | undefined,
  query?: QueryClinicalNoteDto
) {
  const enabled = !!residentId && residentId !== 'new'

  return useQuery<ClinicalNote[]>({
    queryKey: tenantKey('clinical-notes', 'resident', residentId, JSON.stringify(query || {})),
    queryFn: () => {
      if (!residentId) {
        throw new Error('residentId is required')
      }
      return listClinicalNotesByResident(residentId, query)
    },
    enabled,
    placeholderData: [],
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook para buscar uma evolução clínica por ID
 */
export function useClinicalNote(id: string | undefined) {
  const enabled = !!id

  return useQuery<ClinicalNote>({
    queryKey: tenantKey('clinical-notes', id),
    queryFn: () => {
      if (!id) {
        throw new Error('id is required')
      }
      return getClinicalNote(id)
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para buscar histórico de versões de uma evolução clínica
 */
export function useClinicalNoteHistory(id: string | undefined) {
  const enabled = !!id

  return useQuery<ClinicalNoteHistoryResponse>({
    queryKey: tenantKey('clinical-notes', id, 'history'),
    queryFn: () => {
      if (!id) {
        throw new Error('id is required')
      }
      return getClinicalNoteHistory(id)
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para buscar sugestões de tags
 */
export function useClinicalNoteTags() {
  return useQuery<string[]>({
    queryKey: tenantKey('clinical-notes', 'tags'),
    queryFn: getClinicalNoteTags,
    staleTime: 1000 * 60 * 10, // 10 minutos (tags mudam pouco)
  })
}

/**
 * Hook para buscar profissões que o usuário logado pode registrar
 * Baseado no cargo do usuário e competências legais dos conselhos profissionais
 */
export function useAuthorizedProfessions() {
  return useQuery<ClinicalProfession[]>({
    queryKey: tenantKey('clinical-notes', 'authorized-professions'),
    queryFn: getAuthorizedProfessions,
    staleTime: 1000 * 60 * 60, // 1 hora (profissões autorizadas mudam apenas se mudar cargo)
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook para buscar documentos clínicos (Tiptap) de um residente
 */
export function useClinicalNoteDocuments(residentId: string | undefined) {
  const enabled = !!residentId && residentId !== 'new'

  return useQuery<ClinicalNoteDocument[]>({
    queryKey: tenantKey('clinical-notes', 'documents', 'resident', residentId),
    queryFn: () => {
      if (!residentId) {
        throw new Error('residentId is required')
      }
      return getClinicalNoteDocumentsByResident(residentId)
    },
    enabled,
    placeholderData: [],
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchOnWindowFocus: true,
  })
}

// ==================== MUTATION HOOKS ====================

/**
 * Hook para criar nova evolução clínica
 */
export function useCreateClinicalNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateClinicalNoteDto) => createClinicalNote(data),
    onSuccess: (newNote) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: tenantKey('clinical-notes') })
      queryClient.invalidateQueries({
        queryKey: tenantKey('clinical-notes', 'resident', newNote.residentId),
      })
      queryClient.invalidateQueries({ queryKey: tenantKey('clinical-notes', 'tags') })

      toast.success('Evolução clínica criada com sucesso')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao criar evolução clínica'
      toast.error(message)
    },
  })
}

/**
 * Hook para atualizar evolução clínica
 */
export function useUpdateClinicalNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClinicalNoteDto }) =>
      updateClinicalNote(id, data),
    onSuccess: (updatedNote) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: tenantKey('clinical-notes') })
      queryClient.invalidateQueries({
        queryKey: tenantKey('clinical-notes', 'resident', updatedNote.residentId),
      })
      queryClient.invalidateQueries({ queryKey: tenantKey('clinical-notes', updatedNote.id) })
      queryClient.invalidateQueries({
        queryKey: tenantKey('clinical-notes', updatedNote.id, 'history'),
      })

      toast.success('Evolução clínica atualizada com sucesso')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao atualizar evolução clínica'
      toast.error(message)
    },
  })
}

/**
 * Hook para soft delete de evolução clínica
 */
export function useDeleteClinicalNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DeleteClinicalNoteDto }) =>
      deleteClinicalNote(id, data),
    onSuccess: (_, variables) => {
      // Invalidar todas as queries de clinical notes
      queryClient.invalidateQueries({ queryKey: tenantKey('clinical-notes') })

      toast.success('Evolução clínica excluída com sucesso')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao excluir evolução clínica'
      toast.error(message)
    },
  })
}
