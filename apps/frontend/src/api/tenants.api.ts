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
 * Busca os dados do tenant do usuário logado
 */
export const getCurrentTenant = async (): Promise<Tenant> => {
  const response = await api.get<Tenant>('/tenants/me')
  return response.data
}
