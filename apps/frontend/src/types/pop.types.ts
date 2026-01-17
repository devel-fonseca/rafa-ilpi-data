/**
 * Types para módulo de POPs (Procedimentos Operacionais Padrão)
 */

export enum PopStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  OBSOLETE = 'OBSOLETE',
}

export enum PopCategory {
  GESTAO_OPERACAO = 'GESTAO_OPERACAO',
  ENFERMAGEM_CUIDADOS = 'ENFERMAGEM_CUIDADOS',
}

export enum PopAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  PUBLISHED = 'PUBLISHED',
  VERSIONED = 'VERSIONED',
  OBSOLETED = 'OBSOLETED',
  DELETED = 'DELETED',
}

/**
 * Interface principal do POP
 */
export interface Pop {
  id: string
  tenantId: string
  title: string
  category: PopCategory
  templateId: string | null
  content: string
  status: PopStatus
  version: number
  replacedById: string | null
  replacedAt: string | null
  reviewIntervalMonths: number | null
  lastReviewedAt: string | null
  nextReviewDate: string | null
  requiresReview: boolean
  notes: string | null
  createdBy: string
  updatedBy: string | null
  publishedBy: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  attachments?: PopAttachment[]
  replacedBy?: PopVersion
  replaces?: PopVersion[]
  _count?: {
    attachments: number
    history: number
  }
}

/**
 * Versão simplificada para histórico
 */
export interface PopVersion {
  id: string
  title: string
  version: number
  status: PopStatus
  createdAt: string
  publishedAt?: string | null
}

/**
 * Anexo de POP
 */
export interface PopAttachment {
  id: string
  tenantId: string
  popId: string
  fileUrl: string
  fileKey: string | null
  fileName: string
  fileSize: number | null
  mimeType: string | null
  description: string | null
  type: string | null
  uploadedBy: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

/**
 * Histórico de alterações
 */
export interface PopHistory {
  id: string
  tenantId: string
  popId: string
  action: PopAction
  reason: string | null
  previousData: Record<string, unknown>
  newData: Record<string, unknown>
  changedFields: string[]
  changedBy: string
  changedByName: string
  changedAt: string
  ipAddress: string | null
  userAgent: string | null
}

/**
 * Template de POP
 */
export interface PopTemplate {
  id: string
  title: string
  category: PopCategory
  description: string
  defaultContent: string
  suggestedReviewMonths?: number
}

/**
 * DTOs para requests
 */
export interface CreatePopDto {
  title: string
  category: PopCategory
  templateId?: string
  content: string
  reviewIntervalMonths?: number
  notes?: string
}

export interface UpdatePopDto {
  title?: string
  content?: string
  reviewIntervalMonths?: number
  notes?: string
}

export interface CreatePopVersionDto {
  reason: string
  newContent: string
  newTitle?: string
  newReviewIntervalMonths?: number
  newNotes?: string
}

export interface PublishPopDto {
  publicationNotes?: string
}

export interface MarkObsoleteDto {
  reason: string
}

export interface AddAttachmentDto {
  description?: string
  type?: string
}

export interface FilterPopsDto {
  status?: PopStatus
  category?: PopCategory
  requiresReview?: boolean
  templateId?: string
  search?: string
}

/**
 * Helpers para labels
 */
export const PopStatusLabels: Record<PopStatus, string> = {
  [PopStatus.DRAFT]: 'Rascunho',
  [PopStatus.PUBLISHED]: 'Publicado',
  [PopStatus.OBSOLETE]: 'Obsoleto',
}

export const PopCategoryLabels: Record<PopCategory, string> = {
  [PopCategory.GESTAO_OPERACAO]: 'Gestão e Operação',
  [PopCategory.ENFERMAGEM_CUIDADOS]: 'Enfermagem e Cuidados',
}

export const PopActionLabels: Record<PopAction, string> = {
  [PopAction.CREATED]: 'Criado',
  [PopAction.UPDATED]: 'Atualizado',
  [PopAction.PUBLISHED]: 'Publicado',
  [PopAction.VERSIONED]: 'Nova versão criada',
  [PopAction.OBSOLETED]: 'Marcado como obsoleto',
  [PopAction.DELETED]: 'Removido',
}

/**
 * Cores para badges de status
 */
export const PopStatusColors: Record<
  PopStatus,
  'secondary' | 'success' | 'destructive'
> = {
  [PopStatus.DRAFT]: 'secondary',
  [PopStatus.PUBLISHED]: 'success',
  [PopStatus.OBSOLETE]: 'destructive',
}
