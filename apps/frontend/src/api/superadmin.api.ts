import { api } from '@/services/api'

/**
 * SuperAdmin API Client
 *
 * Client para comunicação com o backend do Portal SuperAdmin.
 * Todas as requisições requerem autenticação com role SUPERADMIN.
 */

// ============================================
// TYPES
// ============================================

export interface OverviewMetrics {
  totalTenants: number
  activeTenants: number
  mrr: number // Monthly Recurring Revenue
  arr: number // Annual Recurring Revenue
  churn: number // Taxa de cancelamento (%)
  ltv: number | null // Lifetime Value (null quando churn = 0)
}

export interface RevenueMetrics {
  mrr: number
  arr: number
  lastMonthMrr: number
  growth: number // Crescimento percentual MoM
}

export interface TenantMetrics {
  total: number
  active: number
  trial: number
  suspended: number
  cancelled: number
}

export interface TrendData {
  month: string // YYYY-MM
  mrr: number
}

export interface TrendsResponse {
  period: string
  data: TrendData[]
}

export interface Tenant {
  id: string
  name: string
  email: string
  cnpj: string | null
  phone: string | null
  status: string
  addressStreet: string | null
  addressCity: string | null
  addressState: string | null
  createdAt: string
  customMaxUsers: number | null
  customMaxResidents: number | null
  customFeatures: Record<string, boolean> | null
  subscriptions: Subscription[]
  _count: {
    users: number
    residents: number
  }
}

export interface Subscription {
  id: string
  tenantId: string
  planId: string
  status: string
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  trialEndDate: string | null
  discountPercent: string | null
  discountReason: string | null
  customPrice: string | null
  subscribedFeatures?: Record<string, boolean> | null
  createdAt: string
  plan: Plan
}

export interface Plan {
  id: string
  name: string
  displayName: string
  type: string
  price: number | null
  billingCycle: 'MONTHLY' | 'ANNUAL'
  maxResidents: number
  maxUsers: number
}

export interface TenantsListResponse {
  data: Tenant[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface TenantFilters {
  status?: string
  search?: string
  planId?: string
  page?: number
  limit?: number
}

export interface UpdateTenantData {
  name?: string
  email?: string
  phone?: string
  addressStreet?: string
  addressNumber?: string
  addressComplement?: string
  addressDistrict?: string
  addressCity?: string
  addressState?: string
  addressZipCode?: string
}

export interface ChangePlanData {
  newPlanId: string
  reason?: string
}

export interface ExtendPeriodData {
  days: number
}

export interface CancelData {
  reason: string
}

export interface SuspendData {
  reason: string
}

export interface CustomizeLimitsData {
  customMaxUsers?: number | null
  customMaxResidents?: number | null
  customFeatures?: Record<string, boolean> | null
}

export interface EffectiveLimits {
  tenantId: string
  tenantName: string
  plan: string
  planType: string
  subscriptionStatus: string
  baseLimits: {
    maxUsers: number
    maxResidents: number
    features: Record<string, boolean>
  }
  customOverrides: {
    customMaxUsers: number | null
    customMaxResidents: number | null
    customFeatures: Record<string, boolean>
  }
  effectiveLimits: {
    maxUsers: number
    maxResidents: number
    features: Record<string, boolean>
  }
  hasCustomizations: boolean
}

// ============================================
// API METHODS
// ============================================

/**
 * Busca visão geral das métricas principais
 */
export const getOverviewMetrics = async (): Promise<OverviewMetrics> => {
  const response = await api.get<OverviewMetrics>(
    '/superadmin/metrics/overview',
  )
  return response.data
}

/**
 * Busca métricas detalhadas de receita
 */
export const getRevenueMetrics = async (): Promise<RevenueMetrics> => {
  const response = await api.get<RevenueMetrics>('/superadmin/metrics/revenue')
  return response.data
}

/**
 * Busca contagem de tenants por status
 */
export const getTenantMetrics = async (): Promise<TenantMetrics> => {
  const response = await api.get<TenantMetrics>('/superadmin/metrics/tenants')
  return response.data
}

/**
 * Busca tendências de MRR ao longo do tempo
 * @param months - Número de meses para retornar (padrão: 12)
 */
export const getTrends = async (months: number = 12): Promise<TrendsResponse> => {
  const response = await api.get<TrendsResponse>(
    `/superadmin/metrics/trends?months=${months}`,
  )
  return response.data
}

// ============================================
// TENANT MANAGEMENT
// ============================================

/**
 * Lista todos os tenants com filtros e paginação
 */
export const getTenants = async (filters: TenantFilters = {}): Promise<TenantsListResponse> => {
  const params = new URLSearchParams()

  if (filters.status) params.append('status', filters.status)
  if (filters.search) params.append('search', filters.search)
  if (filters.planId) params.append('planId', filters.planId)
  if (filters.page) params.append('page', filters.page.toString())
  if (filters.limit) params.append('limit', filters.limit.toString())

  const response = await api.get<TenantsListResponse>(
    `/superadmin/tenants?${params.toString()}`
  )
  return response.data
}

/**
 * Busca detalhes completos de um tenant
 */
export const getTenant = async (id: string): Promise<Tenant> => {
  const response = await api.get<Tenant>(`/superadmin/tenants/${id}`)
  return response.data
}

/**
 * Atualiza dados básicos de um tenant
 */
export const updateTenant = async (
  id: string,
  data: UpdateTenantData
): Promise<Tenant> => {
  const response = await api.patch<Tenant>(`/superadmin/tenants/${id}`, data)
  return response.data
}

/**
 * Suspende um tenant
 */
export const suspendTenant = async (
  id: string,
  data: SuspendData
): Promise<Tenant> => {
  const response = await api.post<Tenant>(`/superadmin/tenants/${id}/suspend`, data)
  return response.data
}

/**
 * Reativa um tenant suspenso
 */
export const reactivateTenant = async (id: string): Promise<Tenant> => {
  const response = await api.post<Tenant>(`/superadmin/tenants/${id}/reactivate`)
  return response.data
}

/**
 * Soft delete de um tenant
 */
export const deleteTenant = async (id: string): Promise<Tenant> => {
  const response = await api.delete<Tenant>(`/superadmin/tenants/${id}`)
  return response.data
}

/**
 * Busca estatísticas de um tenant
 */
export const getTenantStats = async (id: string): Promise<{
  totalUsers: number
  activeUsers: number
  totalResidents: number
  activeResidents: number
  currentPlan: string
  subscriptionStatus: string
}> => {
  const response = await api.get(`/superadmin/tenants/${id}/stats`)
  return response.data
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Muda o plano de um tenant
 */
export const changePlan = async (
  tenantId: string,
  data: ChangePlanData
): Promise<Subscription> => {
  const response = await api.post<Subscription>(
    `/superadmin/tenants/${tenantId}/change-plan`,
    data
  )
  return response.data
}

/**
 * Estende o período de uma subscription
 */
export const extendSubscription = async (
  id: string,
  data: ExtendPeriodData
): Promise<Subscription> => {
  const response = await api.post<Subscription>(
    `/superadmin/subscriptions/${id}/extend`,
    data
  )
  return response.data
}

/**
 * Cancela uma subscription
 */
export const cancelSubscription = async (
  id: string,
  data: CancelData
): Promise<Subscription> => {
  const response = await api.post<Subscription>(
    `/superadmin/subscriptions/${id}/cancel`,
    data
  )
  return response.data
}

/**
 * Reativa uma subscription cancelada
 */
export const reactivateSubscription = async (id: string): Promise<Subscription> => {
  const response = await api.post<Subscription>(
    `/superadmin/subscriptions/${id}/reactivate`
  )
  return response.data
}

/**
 * Busca histórico de subscriptions de um tenant
 */
export const getSubscriptionHistory = async (tenantId: string): Promise<Subscription[]> => {
  const response = await api.get<Subscription[]>(
    `/superadmin/tenants/${tenantId}/subscriptions/history`
  )
  return response.data
}

/**
 * Busca detalhes de uma subscription
 */
export const getSubscription = async (id: string): Promise<Subscription> => {
  const response = await api.get<Subscription>(`/superadmin/subscriptions/${id}`)
  return response.data
}

// ============================================
// PLANS
// ============================================

/**
 * Busca lista de planos disponíveis
 */
export const getPlans = async (): Promise<Plan[]> => {
  const response = await api.get<Plan[]>('/plans')
  return response.data
}

// ============================================
// TENANT CUSTOMIZATION
// ============================================

/**
 * Customiza limites e features de um tenant
 * Sobrescreve os limites do plano base para casos especiais
 */
export const customizeTenantLimits = async (
  tenantId: string,
  data: CustomizeLimitsData
): Promise<Tenant> => {
  const response = await api.patch<Tenant>(
    `/superadmin/tenants/${tenantId}/customize-limits`,
    data
  )
  return response.data
}

/**
 * Busca limites efetivos de um tenant (base + overrides)
 */
export const getTenantEffectiveLimits = async (
  tenantId: string
): Promise<EffectiveLimits> => {
  const response = await api.get<EffectiveLimits>(
    `/superadmin/tenants/${tenantId}/effective-limits`
  )
  return response.data
}
