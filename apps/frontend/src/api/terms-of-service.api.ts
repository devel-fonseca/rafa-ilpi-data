import { api } from '@/services/api'

export interface TermsOfService {
  id: string
  version: string
  planId: string | null
  status: 'DRAFT' | 'ACTIVE' | 'REVOKED'
  effectiveFrom: string | null
  title: string
  content: string
  contentHash: string
  createdBy: string
  createdAt: string
  updatedAt: string
  revokedAt: string | null
  revokedBy: string | null
  plan?: {
    id: string
    name: string
    displayName: string
  } | null
  creator?: {
    id: string
    name: string
    email: string
  }
  revoker?: {
    id: string
    name: string
    email: string
  } | null
  _count?: {
    acceptances: number
  }
}

export interface TermsOfServiceAcceptance {
  id: string
  termsId: string
  tenantId: string
  userId: string
  acceptedAt: string
  ipAddress: string
  userAgent: string
  termsVersion: string
  termsHash: string
  termsContent: string
  tenant?: {
    id: string
    name: string
    email: string
  }
  user?: {
    id: string
    name: string
    email: string
  }
  terms?: {
    id: string
    version: string
    title: string
  }
}

export interface CreateTermsOfServiceDto {
  version: string
  title: string
  content: string
  planId?: string
}

export interface UpdateTermsOfServiceDto {
  title?: string
  content?: string
}

export interface PublishTermsOfServiceDto {
  effectiveFrom?: string
}

export interface TermsOfServiceFilters {
  status?: 'DRAFT' | 'ACTIVE' | 'REVOKED'
  planId?: string
}

/**
 * Lista termos de uso com filtros opcionais
 */
export async function listTermsOfService(filters?: TermsOfServiceFilters): Promise<TermsOfService[]> {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.planId) params.append('planId', filters.planId)

  const response = await api.get(`/superadmin/terms-of-service?${params.toString()}`)
  return response.data
}

/**
 * Busca detalhes de um termo de uso específico
 */
export async function getTermsOfService(id: string): Promise<TermsOfService> {
  const response = await api.get(`/superadmin/terms-of-service/${id}`)
  return response.data
}

/**
 * Cria novo termo de uso DRAFT
 */
export async function createTermsOfService(dto: CreateTermsOfServiceDto): Promise<TermsOfService> {
  const response = await api.post('/superadmin/terms-of-service', dto)
  return response.data
}

/**
 * Atualiza termo de uso DRAFT
 */
export async function updateTermsOfService(
  id: string,
  dto: UpdateTermsOfServiceDto,
): Promise<TermsOfService> {
  const response = await api.patch(`/superadmin/terms-of-service/${id}`, dto)
  return response.data
}

/**
 * Publica termo de uso (DRAFT → ACTIVE)
 */
export async function publishTermsOfService(
  id: string,
  dto?: PublishTermsOfServiceDto,
): Promise<TermsOfService> {
  const response = await api.post(`/superadmin/terms-of-service/${id}/publish`, dto || {})
  return response.data
}

/**
 * Deleta termo de uso DRAFT
 */
export async function deleteTermsOfService(id: string): Promise<void> {
  await api.delete(`/superadmin/terms-of-service/${id}`)
}

/**
 * Lista aceites de um termo de uso
 */
export async function getTermsOfServiceAcceptances(
  termsId: string,
): Promise<TermsOfServiceAcceptance[]> {
  const response = await api.get(`/superadmin/terms-of-service/${termsId}/acceptances`)
  return response.data
}

/**
 * Busca aceite de termo de uso de um tenant
 */
export async function getTenantTermsOfServiceAcceptance(
  tenantId: string,
): Promise<TermsOfServiceAcceptance> {
  const response = await api.get(`/superadmin/tenants/${tenantId}/terms-of-service-acceptance`)
  return response.data
}

/**
 * Busca termo de uso ACTIVE (endpoint público)
 */
export async function getActiveTermsOfService(planId?: string): Promise<TermsOfService> {
  const params = planId ? `?planId=${planId}` : ''
  const response = await api.get(`/terms-of-service/active${params}`)
  return response.data
}

/**
 * Gera próxima versão automaticamente
 */
export async function getNextVersion(planId?: string, isMajor = false): Promise<string> {
  const params = new URLSearchParams()
  if (planId) params.append('planId', planId)
  if (isMajor) params.append('isMajor', 'true')

  const response = await api.get(`/terms-of-service/next-version?${params.toString()}`)
  return response.data.version
}
