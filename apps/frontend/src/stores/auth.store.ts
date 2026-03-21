import { create } from 'zustand'
import { api } from '../services/api'
import { devLogger } from '../utils/devLogger'
import { useFeaturesStore } from './features.store'

export interface User {
  id: string
  name: string
  email: string
  role: string
  tenantId: string
  photoUrl?: string | null
  passwordResetRequired?: boolean
  tenant?: {
    id: string
    name: string
    status: string
    plan?: string
    cnpj?: string | null
    profile?: {
      tradeName?: string | null
      cnesCode?: string | null
    }
  }
  profile?: {
    profilePhoto?: string | null
    positionCode?: string | null
    registrationType?: string | null
    registrationNumber?: string | null
    registrationState?: string | null
    isTechnicalManager?: boolean
    isNursingCoordinator?: boolean
    preferences?: Record<string, unknown> | null
  }
}

interface Tenant {
  id: string
  name: string
  role: string
  status: string
  plan: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isBootstrapping: boolean
  hasBootstrapped: boolean
  error: string | null
  availableTenants: Tenant[] | null

  bootstrapAuth: () => Promise<void>
  login: (email: string, password: string) => Promise<{ requiresTenantSelection?: boolean; tenants?: Tenant[]; user?: User; accessToken?: string }>
  selectTenant: (tenantId: string, email: string, password: string) => Promise<void>
  register: (data: Record<string, unknown>) => Promise<{ user: User; tenant: Tenant }>
  logout: (reason?: string) => Promise<void>
  refreshAuth: () => Promise<void>
  clearError: () => void
  setAuth: (user: User, accessToken: string) => void
  clearAuth: () => void
  updateToken: (token: string) => void
}

let bootstrapPromise: Promise<void> | null = null

function clearLegacyAuthStorage() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('rafa-ilpi-auth')
  }
}

function applyAuthorizationHeader(accessToken: string | null) {
  if (accessToken) {
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    return
  }

  delete api.defaults.headers.common['Authorization']
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  isBootstrapping: true,
  hasBootstrapped: false,
  error: null,
  availableTenants: null,

  bootstrapAuth: async () => {
    if (get().hasBootstrapped && !get().isBootstrapping) {
      return
    }

    if (bootstrapPromise) {
      return bootstrapPromise
    }

    set({ isBootstrapping: true, error: null })

    bootstrapPromise = (async () => {
      clearLegacyAuthStorage()

      try {
        const response = await api.post('/auth/refresh')
        const { user, accessToken } = response.data

        set({
          user,
          accessToken,
          isAuthenticated: true,
          isLoading: false,
          isBootstrapping: false,
          hasBootstrapped: true,
          error: null,
          availableTenants: null,
        })

        applyAuthorizationHeader(accessToken)
      } catch {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
          isBootstrapping: false,
          hasBootstrapped: true,
          error: null,
          availableTenants: null,
        })

        applyAuthorizationHeader(null)
      } finally {
        bootstrapPromise = null
      }
    })()

    return bootstrapPromise
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })

    try {
      const response = await api.post('/auth/login', { email, password })

      if (response.data.requiresTenantSelection) {
        set({
          availableTenants: response.data.tenants,
          isLoading: false,
          error: null,
        })
        return response.data
      }

      const { user, accessToken } = response.data

      devLogger.log('Login bem-sucedido:', { user: user.email, hasToken: !!accessToken })

      set({
        user,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
        isBootstrapping: false,
        hasBootstrapped: true,
        error: null,
        availableTenants: null,
      })

      applyAuthorizationHeader(accessToken)

      return response.data
    } catch (error: unknown) {
      devLogger.error('Erro completo no login:', error)
      const errorResponse = (error as { response?: { data?: { message?: string }; status?: number } }).response
      devLogger.error('Detalhes do erro:', {
        message: errorResponse?.data?.message,
        status: errorResponse?.status,
        data: errorResponse?.data,
      })

      set({
        error: errorResponse?.data?.message || 'Erro ao fazer login',
        isLoading: false,
      })
      throw error
    }
  },

  selectTenant: async (tenantId: string, email: string, password: string) => {
    set({ isLoading: true, error: null })

    try {
      const response = await api.post('/auth/select-tenant', {
        tenantId,
        email,
        password,
      })

      const { user, accessToken } = response.data

      if (typeof window !== 'undefined' && window.queryClient) {
        devLogger.log('🧹 Auth Store - Limpando cache ao trocar tenant...')
        window.queryClient.clear()
      }

      set({
        user,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
        isBootstrapping: false,
        hasBootstrapped: true,
        error: null,
        availableTenants: null,
      })

      applyAuthorizationHeader(accessToken)
    } catch (error: unknown) {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      set({
        error: errorResponse?.data?.message || 'Erro ao selecionar tenant',
        isLoading: false,
      })
      throw error
    }
  },

  register: async (data: Record<string, unknown>) => {
    set({ isLoading: true, error: null })

    try {
      const response = await api.post('/tenants/register', data)
      const { tenant } = response.data

      const loginResponse = await api.post('/auth/select-tenant', {
        tenantId: tenant.id,
        email: data.adminEmail,
        password: data.adminPassword,
      })

      const { user, accessToken } = loginResponse.data

      set({
        user,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
        isBootstrapping: false,
        hasBootstrapped: true,
        error: null,
        availableTenants: null,
      })

      applyAuthorizationHeader(accessToken)

      return response.data
    } catch (error: unknown) {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      set({
        error: errorResponse?.data?.message || 'Erro ao registrar ILPI',
        isLoading: false,
      })
      throw error
    }
  },

  logout: async (reason?: string) => {
    set({ isLoading: true })

    try {
      const { accessToken } = get()
      if (accessToken) {
        applyAuthorizationHeader(accessToken)
        await api.post('/auth/logout', { reason })
      }
    } catch (error) {
      devLogger.error('Erro ao fazer logout:', error)
    } finally {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        isBootstrapping: false,
        hasBootstrapped: true,
        error: null,
        availableTenants: null,
      })
      applyAuthorizationHeader(null)
      clearLegacyAuthStorage()

      if (typeof window !== 'undefined') {
        devLogger.log('🧹 Auth Store - Limpando cache no logout...')

        useFeaturesStore.getState().clearFeatures()

        if (window.queryClient) {
          devLogger.log('🧹 Limpando React Query cache...')
          window.queryClient.clear()
        } else {
          devLogger.warn('⚠️ queryClient não encontrado no window!')
        }

        devLogger.log('✅ Logout completo - cache limpo!')
      }
    }
  },

  refreshAuth: async () => {
    try {
      const response = await api.post('/auth/refresh')
      const { user, accessToken } = response.data

      set({
        user,
        accessToken,
        isAuthenticated: true,
        isBootstrapping: false,
        hasBootstrapped: true,
        error: null,
      })

      applyAuthorizationHeader(accessToken)
    } catch {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isBootstrapping: false,
        hasBootstrapped: true,
      })
      applyAuthorizationHeader(null)
      clearLegacyAuthStorage()
    }
  },

  clearError: () => set({ error: null }),

  setAuth: (user: User, accessToken: string) => {
    set({
      user,
      accessToken,
      isAuthenticated: true,
      isBootstrapping: false,
      hasBootstrapped: true,
      error: null,
      availableTenants: null,
    })
    applyAuthorizationHeader(accessToken)
  },

  clearAuth: () => {
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      isBootstrapping: false,
      hasBootstrapped: true,
      error: null,
      availableTenants: null,
    })
    applyAuthorizationHeader(null)
    clearLegacyAuthStorage()
  },

  updateToken: (token: string) => {
    set({
      accessToken: token,
      isAuthenticated: !!get().user,
      isBootstrapping: false,
      hasBootstrapped: true,
    })
    applyAuthorizationHeader(token)
  },
}))
