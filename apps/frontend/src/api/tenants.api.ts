import { api } from '../services/api'

/**
 * Interface para dados do Tenant (ILPI)
 */
export interface Tenant {
  id: string
  name: string
  slug: string
  cnpj: string
  email?: string
  phone?: string
  addressStreet?: string
  addressNumber?: string
  addressComplement?: string
  addressDistrict?: string
  addressCity?: string
  addressState?: string
  addressZipCode?: string
  status: string
  schemaName: string
  createdAt: string
  updatedAt: string
}

/**
 * Interface para subscription do tenant
 */
export interface TenantSubscription {
  subscription: {
    id: string
    status: string
    trialEndDate: string | null
    currentPeriodStart: string | null
    currentPeriodEnd: string | null
  }
  plan: {
    id: string
    name: string
    displayName: string
    type: string
    maxUsers: number
    maxResidents: number
  }
  usage: {
    activeUsers: number
    activeResidents: number
  }
  tenantStatus: string
}

/**
 * Busca os dados do tenant do usuário logado
 */
export const getCurrentTenant = async (): Promise<Tenant> => {
  const response = await api.get<Tenant>('/tenants/me')
  return response.data
}

/**
 * Busca subscription ativa do tenant com contagens de uso
 */
export const getMySubscription = async (): Promise<TenantSubscription> => {
  const response = await api.get<TenantSubscription>('/tenants/me/subscription')
  return response.data
}
