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

// Request interceptor - adiciona token JWT e headers anti-cache
api.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    // Headers anti-cache para evitar HTTP 304
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    config.headers['Pragma'] = 'no-cache'
    config.headers['Expires'] = '0'

    // IMPORTANTE: Se o body é FormData, remover Content-Type para permitir
    // que o navegador defina automaticamente com o boundary correto
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
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
          // Tentar registrar logout automático (best effort)
          await tryLogoutOnExpiration()
          useAuthStore.getState().clearAuth()
          window.location.href = '/session-expired'
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
        // Refresh falhou - sessão expirada
        // Tentar registrar logout automático (best effort)
        await tryLogoutOnExpiration()
        useAuthStore.getState().clearAuth()
        window.location.href = '/session-expired'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

/**
 * Tenta registrar logout automático quando sessão expira
 * (Best effort - não bloqueia nem lança erro se falhar)
 */
async function tryLogoutOnExpiration() {
  try {
    const { accessToken, refreshToken } = useAuthStore.getState()
    if (accessToken) {
      // Criar instância separada para evitar interceptor recursivo
      await axios.post(
        `${API_URL}/auth/logout`,
        { refreshToken },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 2000, // Timeout curto para não travar
        }
      )
    }
  } catch (error) {
    // Silencioso - não importa se falhar
    console.log('[LOGOUT] Tentativa de logout automático falhou (esperado em expiração)')
  }
}

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
  // IMPORTANTE: Adicionar timestamp para evitar cache HTTP 304
  // Isso força o navegador a buscar dados frescos do servidor
  const cacheBuster = `_t=${Date.now()}`
  const response = await api.get(`/user-profiles/me?${cacheBuster}`)
  return response.data
}

/**
 * Atualiza as preferências do usuário autenticado
 */
export async function updateMyPreferences(preferences: Record<string, unknown>) {
  const response = await api.patch('/user-profiles/me/preferences', preferences)
  return response.data
}

// ==================== PERMISSIONS ====================

/**
 * Busca as permissões do usuário autenticado
 */
export async function getMyPermissions() {
  const response = await api.get('/permissions/me')
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
  // ILPI Fields
  positionCode?: string
  registrationType?: string
  registrationNumber?: string
  registrationState?: string
  isTechnicalManager?: boolean
  isNursingCoordinator?: boolean
}) {
  const response = await api.patch(`/user-profiles/${userId}`, data)
  return response.data
}

/**
 * Altera senha do usuário
 */
export async function changePassword(userId: string, data: {
  currentPassword: string
  newPassword: string
}) {
  const response = await api.patch(`/users/${userId}/change-password`, data)
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
  // ILPI Fields
  positionCode?: string
  registrationType?: string
  registrationNumber?: string
  registrationState?: string
  isTechnicalManager?: boolean
  isNursingCoordinator?: boolean
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
 * Lista usuários do tenant do usuário logado
 */
export async function listUsers() {
  // Busca o tenantId do estado de autenticação
  const { user } = useAuthStore.getState()
  if (!user?.tenantId) {
    throw new Error('Usuário não autenticado ou sem tenant')
  }
  const response = await api.get(`/tenants/${user.tenantId}/users`)
  return response.data
}

/**
 * Lista usuários de um tenant específico
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
  // Backend retorna { user: {...}, temporaryPassword?: ... }
  // Extraímos apenas o objeto user
  return response.data.user
}

/**
 * Remove usuário do tenant (ADMIN only)
 */
export async function removeUserFromTenant(tenantId: string, userId: string) {
  const response = await api.delete(`/tenants/${tenantId}/users/${userId}`)
  return response.data
}

// ==================== PERMISSIONS ====================

/**
 * Busca todas as permissões de um usuário (herdadas + customizadas)
 */
export async function getUserPermissions(userId: string) {
  const response = await api.get(`/permissions/user/${userId}`)
  return response.data
}

/**
 * Adiciona permissões customizadas a um usuário
 */
export async function addCustomPermissions(userId: string, permissions: string[]) {
  const response = await api.post(`/permissions/user/${userId}/custom`, { permissions })
  return response.data
}

/**
 * Remove permissões customizadas de um usuário
 */
export async function removeCustomPermissions(userId: string, permissions: string[]) {
  const response = await api.delete(`/permissions/user/${userId}/custom`, { data: { permissions } })
  return response.data
}

/**
 * Gerencia permissões customizadas (adiciona e/ou remove em uma única chamada)
 */
export async function manageCustomPermissions(
  userId: string,
  data: { add?: string[]; remove?: string[] }
) {
  const response = await api.patch(`/permissions/user/${userId}/custom`, data)
  return response.data
}

/**
 * Busca permissões padrão de um cargo (PositionCode)
 */
export async function getPositionPermissions(positionCode: string) {
  const response = await api.get(`/permissions/position/${positionCode}`)
  return response.data
}
