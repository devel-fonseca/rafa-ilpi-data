import { api } from '@/services/api'

/**
 * Plans API Client
 *
 * Client para comunicação com endpoints de gestão de Plans (Templates Globais).
 */

// ============================================
// TYPES
// ============================================

export type PlanType = 'FREE' | 'TRIAL' | 'ESSENTIAL' | 'PROFESSIONAL' | 'PREMIUM'
export type BillingCycle = 'MONTHLY' | 'ANNUAL'

export interface Plan {
  id: string
  name: string
  displayName: string
  type: PlanType
  maxResidents: number
  maxUsers: number
  price: string | null // Decimal as string
  trialDays: number
  isPopular: boolean
  features: Record<string, any>
  billingCycle: BillingCycle
  createdAt: string
  updatedAt: string
  totalSubscriptions?: number
  activeSubscriptions?: number
}

export interface UpdatePlanDto {
  price?: number
  maxUsers?: number
  maxResidents?: number
  displayName?: string
  features?: Record<string, any>
  isPopular?: boolean
  trialDays?: number
}

export interface PlanStats {
  total: number
  active: number
  trialing: number
  pastDue: number
  canceled: number
}

export interface ApplyDiscountDto {
  discountPercent: number // 0-100
  reason: string
}

export interface ApplyCustomPriceDto {
  customPrice: number
  reason: string
}

// ============================================
// API METHODS - PLANS (Templates Globais)
// ============================================

/**
 * Listar todos os planos
 * Endpoint: GET /superadmin/plans
 */
export const getPlans = async (): Promise<Plan[]> => {
  const response = await api.get<Plan[]>('/superadmin/plans')
  return response.data
}

/**
 * Buscar detalhes de um plano
 * Endpoint: GET /superadmin/plans/:id
 */
export const getPlan = async (id: string): Promise<Plan> => {
  const response = await api.get<Plan>(`/superadmin/plans/${id}`)
  return response.data
}

/**
 * Atualizar plano (preço, limites, features)
 * Endpoint: PATCH /superadmin/plans/:id
 */
export const updatePlan = async (id: string, data: UpdatePlanDto): Promise<Plan> => {
  const response = await api.patch<Plan>(`/superadmin/plans/${id}`, data)
  return response.data
}

/**
 * Toggle flag isPopular de um plano
 * Endpoint: POST /superadmin/plans/:id/toggle-popular
 */
export const togglePlanPopular = async (id: string): Promise<Plan> => {
  const response = await api.post<Plan>(`/superadmin/plans/${id}/toggle-popular`)
  return response.data
}

/**
 * Buscar estatísticas de um plano
 * Endpoint: GET /superadmin/plans/:id/stats
 */
export const getPlanStats = async (id: string): Promise<PlanStats> => {
  const response = await api.get<PlanStats>(`/superadmin/plans/${id}/stats`)
  return response.data
}

// ============================================
// API METHODS - SUBSCRIPTION PRICING
// ============================================

/**
 * Aplicar desconto percentual a uma subscription
 * Endpoint: POST /superadmin/subscriptions/:id/apply-discount
 */
export const applySubscriptionDiscount = async (
  subscriptionId: string,
  data: ApplyDiscountDto,
): Promise<any> => {
  const response = await api.post(`/superadmin/subscriptions/${subscriptionId}/apply-discount`, data)
  return response.data
}

/**
 * Aplicar preço customizado a uma subscription
 * Endpoint: POST /superadmin/subscriptions/:id/apply-custom-price
 */
export const applySubscriptionCustomPrice = async (
  subscriptionId: string,
  data: ApplyCustomPriceDto,
): Promise<any> => {
  const response = await api.post(
    `/superadmin/subscriptions/${subscriptionId}/apply-custom-price`,
    data,
  )
  return response.data
}

/**
 * Remover desconto/preço customizado de uma subscription
 * Endpoint: DELETE /superadmin/subscriptions/:id/discount
 */
export const removeSubscriptionDiscount = async (subscriptionId: string): Promise<any> => {
  const response = await api.delete(`/superadmin/subscriptions/${subscriptionId}/discount`)
  return response.data
}
