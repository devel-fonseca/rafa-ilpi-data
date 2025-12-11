import { api } from '../services/api'
import type {
  Pop,
  PopTemplate,
  PopHistory,
  PopAttachment,
  CreatePopDto,
  UpdatePopDto,
  CreatePopVersionDto,
  MarkObsoleteDto,
  FilterPopsDto,
  AddAttachmentDto,
  PopCategory,
} from '../types/pop.types'

/**
 * API Client para POPs (Procedimentos Operacionais Padrão)
 */

// ═══════════════════════════════════════════════════════════════════════════
// CRUD BÁSICO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Criar novo POP (status=DRAFT)
 */
export const createPop = async (dto: CreatePopDto): Promise<Pop> => {
  const response = await api.post<Pop>('/pops', dto)
  return response.data
}

/**
 * Listar POPs com filtros
 */
export const getPops = async (filters?: FilterPopsDto): Promise<Pop[]> => {
  const response = await api.get<Pop[]>('/pops', { params: filters })
  return response.data
}

/**
 * Listar apenas POPs publicados (vigentes)
 */
export const getPublishedPops = async (): Promise<Pop[]> => {
  const response = await api.get<Pop[]>('/pops/published')
  return response.data
}

/**
 * Buscar POP específico
 */
export const getPop = async (id: string): Promise<Pop> => {
  const response = await api.get<Pop>(`/pops/${id}`)
  return response.data
}

/**
 * Atualizar POP (apenas DRAFT)
 */
export const updatePop = async (
  id: string,
  dto: UpdatePopDto
): Promise<Pop> => {
  const response = await api.patch<Pop>(`/pops/${id}`, dto)
  return response.data
}

/**
 * Remover POP (soft delete, apenas DRAFT)
 */
export const deletePop = async (id: string): Promise<void> => {
  await api.delete(`/pops/${id}`)
}

// ═══════════════════════════════════════════════════════════════════════════
// VERSIONAMENTO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Criar nova versão de POP PUBLISHED
 */
export const createPopVersion = async (
  id: string,
  dto: CreatePopVersionDto
): Promise<Pop> => {
  const response = await api.post<Pop>(`/pops/${id}/version`, dto)
  return response.data
}

/**
 * Histórico de versões de um POP
 */
export const getPopVersions = async (id: string): Promise<Pop[]> => {
  const response = await api.get<Pop[]>(`/pops/${id}/versions`)
  return response.data
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Publicar POP (DRAFT → PUBLISHED)
 */
export const publishPop = async (id: string): Promise<Pop> => {
  const response = await api.post<Pop>(`/pops/${id}/publish`, {})
  return response.data
}

/**
 * Marcar POP como obsoleto
 */
export const markPopObsolete = async (
  id: string,
  dto: MarkObsoleteDto
): Promise<Pop> => {
  const response = await api.post<Pop>(`/pops/${id}/obsolete`, dto)
  return response.data
}

/**
 * Marcar POP como revisado (sem alterações)
 */
export const markPopReviewed = async (id: string): Promise<Pop> => {
  const response = await api.post<Pop>(`/pops/${id}/mark-reviewed`, {})
  return response.data
}

// ═══════════════════════════════════════════════════════════════════════════
// ANEXOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Adicionar anexo a um POP
 */
export const addPopAttachment = async (
  popId: string,
  file: File,
  metadata?: AddAttachmentDto
): Promise<PopAttachment> => {
  const formData = new FormData()
  formData.append('file', file)

  if (metadata?.description) {
    formData.append('description', metadata.description)
  }
  if (metadata?.type) {
    formData.append('type', metadata.type)
  }

  const response = await api.post<PopAttachment>(
    `/pops/${popId}/attachments`,
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
 * Remover anexo de um POP
 */
export const deletePopAttachment = async (
  attachmentId: string
): Promise<void> => {
  await api.delete(`/pops/attachments/${attachmentId}`)
}

// ═══════════════════════════════════════════════════════════════════════════
// HISTÓRICO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Histórico de alterações de um POP
 */
export const getPopHistory = async (id: string): Promise<PopHistory[]> => {
  const response = await api.get<PopHistory[]>(`/pops/${id}/history`)
  return response.data
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Listar categorias únicas do tenant
 */
export const getCategories = async (): Promise<string[]> => {
  const response = await api.get<string[]>('/pops/categories')
  return response.data
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Listar todos os templates de POPs
 */
export const getAllTemplates = async (): Promise<{
  templates: PopTemplate[]
  count: {
    total: number
    gestaoOperacao: number
    enfermagemCuidados: number
  }
}> => {
  const response = await api.get('/pops/templates/all')
  return response.data
}

/**
 * Listar templates por categoria
 */
export const getTemplatesByCategory = async (
  category: PopCategory
): Promise<{
  category: PopCategory
  templates: PopTemplate[]
}> => {
  const response = await api.get(`/pops/templates/category/${category}`)
  return response.data
}

/**
 * Buscar template específico por ID
 */
export const getTemplateById = async (
  templateId: string
): Promise<PopTemplate> => {
  const response = await api.get<PopTemplate>(
    `/pops/templates/${templateId}`
  )
  return response.data
}
