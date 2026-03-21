import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
  // State
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  availableTenants: Tenant[] | null

  // Actions
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      availableTenants: null,

      // Login
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })

        try {
          const response = await api.post('/auth/login', { email, password })

          // Se usuário tem múltiplos tenants, retornar lista
          if (response.data.requiresTenantSelection) {
            set({
              availableTenants: response.data.tenants,
              isLoading: false,
            })
            return response.data
          }

          // Login direto (único tenant)
          const { user, accessToken } = response.data

          devLogger.log('Login bem-sucedido:', { user: user.email, hasToken: !!accessToken })

          set({
            user,
            accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })

          // Configurar token no axios
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

          return response.data
        } catch (error: unknown) {
          devLogger.error('Erro completo no login:', error)
          const errorResponse = (error as { response?: { data?: { message?: string }; status?: number } }).response
          devLogger.error('Detalhes do erro:', {
            message: errorResponse?.data?.message,
            status: errorResponse?.status,
            data: errorResponse?.data
          })

          set({
            error: errorResponse?.data?.message || 'Erro ao fazer login',
            isLoading: false,
          })
          throw error
        }
      },

      // Selecionar tenant (quando tem múltiplos)
      selectTenant: async (tenantId: string, email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/select-tenant', {
            tenantId,
            email,
            password,
          })

          const { user, accessToken } = response.data

          // ✅ CRÍTICO: Limpar TODO o cache do React Query ANTES de setar novo tenant
          // Isso garante isolamento completo de dados entre tenants.
          //
          // Como funciona:
          // 1. Queries usam tenantKey('resource') → ['t', 'tenant-A', 'resource']
          // 2. Ao trocar para tenant-B, cache com ['t', 'tenant-A', ...] fica órfão
          // 3. queryClient.clear() remove TODAS as queries (incluindo tenant-A)
          // 4. Novas queries terão keys ['t', 'tenant-B', 'resource']
          //
          // Ver: src/lib/query-keys.ts para helpers de namespace
          if (typeof window !== 'undefined' && window.queryClient) {
            devLogger.log('🧹 Auth Store - Limpando cache ao trocar tenant...')
            window.queryClient.clear()
          }

          set({
            user,
            accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            availableTenants: null,
          })

          // Configurar token no axios
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        } catch (error: unknown) {
          const errorResponse = (error as { response?: { data?: { message?: string } } }).response
          set({
            error: errorResponse?.data?.message || 'Erro ao selecionar tenant',
            isLoading: false,
          })
          throw error
        }
      },

      // Registrar nova ILPI
      register: async (data: Record<string, unknown>) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/tenants/register', data)

          // Após registro, fazer login automático
          const { user, tenant } = response.data
          const loginResponse = await api.post('/auth/select-tenant', {
            tenantId: tenant.id,
            email: data.adminEmail,
            password: data.adminPassword,
          })

          const { accessToken } = loginResponse.data
          set({
            user: { ...user, tenant },
            accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })

          // Configurar token no axios
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

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

      // Logout
      logout: async (reason?: string) => {
        set({ isLoading: true })
        try {
          const { accessToken } = get()
          if (accessToken) {
            api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
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
            error: null,
            availableTenants: null,
          })
          delete api.defaults.headers.common['Authorization']

          // IMPORTANTE: Limpar TODO o cache do React Query no logout
          // Isso garante que dados do usuário anterior não apareçam
          if (typeof window !== 'undefined') {
            devLogger.log('🧹 Auth Store - Limpando cache no logout...')

            // Limpar features store
            useFeaturesStore.getState().clearFeatures()

            // Limpar cache do React Query
            if (window.queryClient) {
              devLogger.log('🧹 Limpando React Query cache...')
              window.queryClient.clear()
            } else {
              devLogger.warn('⚠️ queryClient não encontrado no window!')
            }
            // Limpar localStorage manualmente (força limpeza do Zustand persist)
            devLogger.log('🧹 Removendo rafa-ilpi-auth do localStorage...')
            localStorage.removeItem('rafa-ilpi-auth')
            devLogger.log('✅ Logout completo - cache limpo!')
          }
        }
      },

      // Refresh token
      refreshAuth: async () => {
        const { accessToken, user } = get()
        if (!accessToken && !user) {
          set({ isAuthenticated: false })
          return
        }

        try {
          const response = await api.post('/auth/refresh')
          const { accessToken: newAccessToken } = response.data

          set({
            accessToken: newAccessToken,
            isAuthenticated: true, // ✅ CORRIGIDO: Sincronizar estado após refresh bem-sucedido
          })

          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`
        } catch (error) {
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
          })
          delete api.defaults.headers.common['Authorization']
        }
      },

      // Limpar erro
      clearError: () => set({ error: null }),

      // Set auth (mantido para compatibilidade)
      setAuth: (user: User, accessToken: string) => {
        set({
          user,
          accessToken,
          isAuthenticated: true,
        })
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      },

      // Clear auth (mantido para compatibilidade)
      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        })
        delete api.defaults.headers.common['Authorization']
      },

      // Update token (mantido para compatibilidade)
      updateToken: (token: string) => {
        set({ accessToken: token })
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      },
    }),
    {
      name: 'rafa-ilpi-auth',
      version: 2,
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState
        }

        const state = persistedState as {
          user?: User | null
          accessToken?: string | null
          isAuthenticated?: boolean
        }

        return {
          user: state.user ?? null,
          accessToken: state.accessToken ?? null,
          isAuthenticated: state.isAuthenticated ?? false,
        }
      },
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
