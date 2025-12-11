import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  CreatePopDto,
  UpdatePopDto,
  CreatePopVersionDto,
  MarkObsoleteDto,
  FilterPopsDto,
  AddAttachmentDto,
  PopCategory,
} from '../types/pop.types'
import * as popsApi from '../api/pops.api'

/**
 * Hooks React Query para módulo de POPs
 */

// ═══════════════════════════════════════════════════════════════════════════
// QUERIES (GET)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para listar POPs com filtros
 */
export function usePops(filters?: FilterPopsDto) {
  return useQuery({
    queryKey: ['pops', filters],
    queryFn: () => popsApi.getPops(filters),
  })
}

/**
 * Hook para listar apenas POPs publicados (vigentes)
 */
export function usePublishedPops() {
  return useQuery({
    queryKey: ['pops', 'published'],
    queryFn: () => popsApi.getPublishedPops(),
  })
}

/**
 * Hook para buscar POP específico
 */
export function usePop(id: string | undefined) {
  return useQuery({
    queryKey: ['pops', id],
    queryFn: () => popsApi.getPop(id!),
    enabled: !!id,
  })
}

/**
 * Hook para buscar histórico de versões de um POP
 */
export function usePopVersions(id: string | undefined) {
  return useQuery({
    queryKey: ['pops', id, 'versions'],
    queryFn: () => popsApi.getPopVersions(id!),
    enabled: !!id,
  })
}

/**
 * Hook para buscar histórico de alterações de um POP
 */
export function usePopHistory(id: string | undefined) {
  return useQuery({
    queryKey: ['pops', id, 'history'],
    queryFn: () => popsApi.getPopHistory(id!),
    enabled: !!id,
  })
}

/**
 * Hook para listar todos os templates
 */
export function usePopTemplates() {
  return useQuery({
    queryKey: ['pops', 'templates'],
    queryFn: () => popsApi.getAllTemplates(),
  })
}

/**
 * Hook para listar templates por categoria
 */
export function usePopTemplatesByCategory(category: PopCategory | undefined) {
  return useQuery({
    queryKey: ['pops', 'templates', category],
    queryFn: () => popsApi.getTemplatesByCategory(category!),
    enabled: !!category,
  })
}

/**
 * Hook para buscar template específico
 */
export function usePopTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: ['pops', 'templates', templateId],
    queryFn: () => popsApi.getTemplateById(templateId!),
    enabled: !!templateId,
  })
}

/**
 * Hook para listar categorias únicas do tenant
 */
export function usePopCategories() {
  return useQuery({
    queryKey: ['pops', 'categories'],
    queryFn: () => popsApi.getCategories(),
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS (POST, PATCH, DELETE)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para criar novo POP
 */
export function useCreatePop() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreatePopDto) => popsApi.createPop(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pops'] })
      toast.success('POP criado com sucesso')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erro ao criar POP'
      )
    },
  })
}

/**
 * Hook para atualizar POP (apenas DRAFT)
 */
export function useUpdatePop() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePopDto }) =>
      popsApi.updatePop(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pops'] })
      queryClient.invalidateQueries({ queryKey: ['pops', data.id] })
      toast.success('POP atualizado com sucesso')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erro ao atualizar POP'
      )
    },
  })
}

/**
 * Hook para remover POP (soft delete, apenas DRAFT)
 */
export function useDeletePop() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => popsApi.deletePop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pops'] })
      toast.success('POP removido com sucesso')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erro ao remover POP'
      )
    },
  })
}

/**
 * Hook para criar nova versão de POP
 */
export function useCreatePopVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string
      dto: CreatePopVersionDto
    }) => popsApi.createPopVersion(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pops'] })
      queryClient.invalidateQueries({ queryKey: ['pops', data.id] })
      toast.success('Nova versão do POP criada com sucesso')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erro ao criar nova versão'
      )
    },
  })
}

/**
 * Hook para publicar POP (DRAFT → PUBLISHED)
 */
export function usePublishPop() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => popsApi.publishPop(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pops'] })
      queryClient.invalidateQueries({ queryKey: ['pops', data.id] })
      toast.success('POP publicado com sucesso')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erro ao publicar POP'
      )
    },
  })
}

/**
 * Hook para marcar POP como obsoleto
 */
export function useMarkPopObsolete() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: MarkObsoleteDto }) =>
      popsApi.markPopObsolete(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pops'] })
      queryClient.invalidateQueries({ queryKey: ['pops', data.id] })
      toast.success('POP marcado como obsoleto')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          'Erro ao marcar POP como obsoleto'
      )
    },
  })
}

/**
 * Hook para marcar POP como revisado
 */
export function useMarkPopReviewed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => popsApi.markPopReviewed(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pops'] })
      queryClient.invalidateQueries({ queryKey: ['pops', data.id] })
      toast.success('POP marcado como revisado')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          'Erro ao marcar POP como revisado'
      )
    },
  })
}

/**
 * Hook para adicionar anexo a um POP
 */
export function useAddPopAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      popId,
      file,
      metadata,
    }: {
      popId: string
      file: File
      metadata?: AddAttachmentDto
    }) => popsApi.addPopAttachment(popId, file, metadata),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pops'] })
      queryClient.invalidateQueries({
        queryKey: ['pops', variables.popId],
      })
      toast.success('Anexo adicionado com sucesso')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erro ao adicionar anexo'
      )
    },
  })
}

/**
 * Hook para remover anexo de um POP
 */
export function useDeletePopAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      attachmentId,
    }: {
      attachmentId: string
      popId: string
    }) => popsApi.deletePopAttachment(attachmentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pops'] })
      queryClient.invalidateQueries({
        queryKey: ['pops', variables.popId],
      })
      toast.success('Anexo removido com sucesso')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erro ao remover anexo'
      )
    },
  })
}
