import axios from 'axios'
import { useAuthStore } from '@/stores/auth.store'

// Em desenvolvimento: usa localhost:3000
// Em produção (Docker): usa URL relativa /api (resolvida pelo nginx proxy)
// Pode ser sobrescrito com a variável VITE_API_URL
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api')

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - adiciona token JWT
api.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - trata refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Se token expirou (401) e não é retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = useAuthStore.getState().refreshToken

        if (!refreshToken) {
          useAuthStore.getState().clearAuth()
          window.location.href = '/login'
          return Promise.reject(error)
        }

        // Tenta refresh
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        })

        const { accessToken, refreshToken: newRefreshToken } = response.data

        // Atualiza tokens
        useAuthStore.getState().updateToken(accessToken)
        if (newRefreshToken) {
          useAuthStore.setState({ refreshToken: newRefreshToken })
        }

        // Retry requisição original
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh falhou - desloga
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// ==================== API FUNCTIONS ====================

/**
 * Busca informações do tenant (instituição)
 */
export async function getTenantInfo(tenantId: string) {
  const response = await api.get(`/tenants/${tenantId}`)
  return response.data
}

/**
 * Busca informações completas do residente
 */
export async function getResidentInfo(residentId: string) {
  const response = await api.get(`/residents/${residentId}`)
  return response.data
}

/**
 * Busca o histórico de versões de um registro diário
 */
export async function getDailyRecordHistory(recordId: string) {
  const response = await api.get(`/daily-records/${recordId}/history`)
  return response.data
}

// ==================== USER PROFILES ====================

/**
 * Busca o perfil do usuário autenticado
 */
export async function getMyProfile() {
  const response = await api.get('/user-profiles/me')
  return response.data
}

/**
 * Busca todos os perfis de usuários (para ADMINs)
 */
export async function getAllUserProfiles() {
  const response = await api.get('/user-profiles')
  return response.data
}

/**
 * Busca perfil de um usuário específico
 */
export async function getUserProfile(userId: string) {
  const response = await api.get(`/user-profiles/${userId}`)
  return response.data
}

/**
 * Atualiza perfil de usuário
 */
export async function updateUserProfile(userId: string, data: {
  profilePhoto?: string
  phone?: string
  position?: string
  department?: string
  birthDate?: string
  notes?: string
}) {
  const response = await api.patch(`/user-profiles/${userId}`, data)
  return response.data
}

/**
 * Cria perfil para um usuário (ADMIN only)
 */
export async function createUserProfile(userId: string, data: {
  profilePhoto?: string
  phone?: string
  position?: string
  department?: string
  birthDate?: string
  notes?: string
}) {
  const response = await api.post(`/user-profiles/${userId}`, data)
  return response.data
}

/**
 * Remove perfil de usuário (ADMIN only)
 */
export async function deleteUserProfile(userId: string) {
  const response = await api.delete(`/user-profiles/${userId}`)
  return response.data
}

// ==================== USERS MANAGEMENT ====================

/**
 * Lista usuários de um tenant
 */
export async function getTenantUsers(tenantId: string) {
  const response = await api.get(`/tenants/${tenantId}/users`)
  return response.data
}

/**
 * Adiciona um novo usuário ao tenant (ADMIN only)
 */
export async function addUserToTenant(tenantId: string, data: {
  name: string
  email: string
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER'
  sendInviteEmail?: boolean
  temporaryPassword?: string
}) {
  const response = await api.post(`/tenants/${tenantId}/users`, data)
  return response.data
}

/**
 * Remove usuário do tenant (ADMIN only)
 */
export async function removeUserFromTenant(tenantId: string, userId: string) {
  const response = await api.delete(`/tenants/${tenantId}/users/${userId}`)
  return response.data
}
