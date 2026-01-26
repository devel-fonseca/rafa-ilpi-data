import { api } from '@/services/api'

export interface Contract {
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

export interface ContractAcceptance {
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

export interface CreateContractDto {
  version: string
  title: string
  content: string
  planId?: string
}

export interface UpdateContractDto {
  title?: string
  content?: string
}

export interface PublishContractDto {
  effectiveFrom?: string
}

export interface ContractFilters {
  status?: 'DRAFT' | 'ACTIVE' | 'REVOKED'
  planId?: string
}

/**
 * Lista contratos com filtros opcionais
 */
export async function listContracts(filters?: ContractFilters): Promise<Contract[]> {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.planId) params.append('planId', filters.planId)

  const response = await api.get(`/superadmin/contracts?${params.toString()}`)
  return response.data
}

/**
 * Busca detalhes de um contrato específico
 */
export async function getContract(id: string): Promise<Contract> {
  const response = await api.get(`/superadmin/contracts/${id}`)
  return response.data
}

/**
 * Cria novo contrato DRAFT
 */
export async function createContract(dto: CreateContractDto): Promise<Contract> {
  const response = await api.post('/superadmin/contracts', dto)
  return response.data
}

/**
 * Atualiza contrato DRAFT
 */
export async function updateContract(
  id: string,
  dto: UpdateContractDto,
): Promise<Contract> {
  const response = await api.patch(`/superadmin/contracts/${id}`, dto)
  return response.data
}

/**
 * Publica contrato (DRAFT → ACTIVE)
 */
export async function publishContract(
  id: string,
  dto?: PublishContractDto,
): Promise<Contract> {
  const response = await api.post(`/superadmin/contracts/${id}/publish`, dto || {})
  return response.data
}

/**
 * Deleta contrato DRAFT
 */
export async function deleteContract(id: string): Promise<void> {
  await api.delete(`/superadmin/contracts/${id}`)
}

/**
 * Lista aceites de um contrato
 */
export async function getContractAcceptances(
  contractId: string,
): Promise<ContractAcceptance[]> {
  const response = await api.get(`/superadmin/contracts/${contractId}/acceptances`)
  return response.data
}

/**
 * Busca aceite de contrato de um tenant
 */
export async function getTenantContractAcceptance(
  tenantId: string,
): Promise<ContractAcceptance> {
  const response = await api.get(`/superadmin/tenants/${tenantId}/contract-acceptance`)
  return response.data
}

/**
 * Busca contrato ACTIVE (endpoint público)
 */
export async function getActiveContract(planId?: string): Promise<Contract> {
  const params = planId ? `?planId=${planId}` : ''
  const response = await api.get(`/contracts/active${params}`)
  return response.data
}

/**
 * Gera próxima versão automaticamente
 */
export async function getNextVersion(planId?: string, isMajor = false): Promise<string> {
  const params = new URLSearchParams()
  if (planId) params.append('planId', planId)
  if (isMajor) params.append('isMajor', 'true')

  const response = await api.get(`/contracts/next-version?${params.toString()}`)
  return response.data.version
}

// ─────────────────────────────────────────────────────────────────────────────
//  PRIVACY POLICY ACCEPTANCE
// ─────────────────────────────────────────────────────────────────────────────

export interface PrivacyPolicyAcceptance {
  id: string
  tenantId: string
  userId: string
  acceptedAt: string
  ipAddress: string
  userAgent: string
  policyVersion: string
  policyEffectiveDate: string
  policyContent: string
  lgpdIsDataController: boolean
  lgpdHasLegalBasis: boolean
  lgpdAcknowledgesResponsibility: boolean
  user?: {
    id: string
    name: string
    email: string
  }
}

/**
 * Busca aceite da Política de Privacidade de um tenant (SuperAdmin)
 */
export async function getTenantPrivacyPolicyAcceptance(
  tenantId: string,
): Promise<PrivacyPolicyAcceptance> {
  const response = await api.get(`/superadmin/tenants/${tenantId}/privacy-policy-acceptance`)
  return response.data
}
