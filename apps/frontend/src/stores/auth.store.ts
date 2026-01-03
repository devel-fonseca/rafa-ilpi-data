import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../services/api'

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
    profile?: {
      tradeName?: string | null
    }
  }
  profile?: {
    profilePhoto?: string | null
    positionCode?: string | null
    registrationType?: string | null
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
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  availableTenants: Tenant[] | null

  // Actions
  login: (email: string, password: string) => Promise<any>
  selectTenant: (tenantId: string, email: string, password: string) => Promise<void>
  register: (data: any) => Promise<any>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
  clearError: () => void
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  updateToken: (token: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      availableTenants: null,

      // Login
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })

        console.log('Tentando login com:', { email, password: password.substring(0, 3) + '***' })

        try {
          const response = await api.post('/auth/login', { email, password })
          console.log('Resposta do login:', response.data)

          // Se usuário tem múltiplos tenants, retornar lista
          if (response.data.requiresTenantSelection) {
            set({
              availableTenants: response.data.tenants,
              isLoading: false,
            })
            return response.data
          }

          // Login direto (único tenant)
          const { user, accessToken, refreshToken } = response.data

          console.log('Login bem-sucedido:', { user: user.email, hasToken: !!accessToken })

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })

          // Configurar token no axios
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

          return response.data
        } catch (error: any) {
          console.error('Erro completo no login:', error)
          console.error('Detalhes do erro:', {
            message: error.response?.data?.message,
            status: error.response?.status,
            data: error.response?.data
          })

          set({
            error: error.response?.data?.message || 'Erro ao fazer login',
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

          const { user, accessToken, refreshToken } = response.data

          // ✅ CRÍTICO: Limpar TODO o cache do React Query ANTES de setar novo user
          // Isso garante que dados do tenant anterior não apareçam para o novo tenant
          if (typeof window !== 'undefined' && window.queryClient) {
            console.log('🧹 Auth Store - Limpando cache ao trocar tenant...')
            window.queryClient.clear()
          }

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            availableTenants: null,
          })

          // Configurar token no axios
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Erro ao selecionar tenant',
            isLoading: false,
          })
          throw error
        }
      },

      // Registrar nova ILPI
      register: async (data: any) => {
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

          const { accessToken, refreshToken } = loginResponse.data
          set({
            user: { ...user, tenant },
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })

          // Configurar token no axios
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

          return response.data
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Erro ao registrar ILPI',
            isLoading: false,
          })
          throw error
        }
      },

      // Logout
      logout: async () => {
        set({ isLoading: true })
        try {
          const { accessToken, refreshToken } = get()
          if (accessToken) {
            api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
            // Enviar refreshToken para deletar apenas esta sessão específica
            await api.post('/auth/logout', { refreshToken })
          }
        } catch (error) {
          console.error('Erro ao fazer logout:', error)
        } finally {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            availableTenants: null,
          })
          delete api.defaults.headers.common['Authorization']

          // IMPORTANTE: Limpar TODO o cache do React Query no logout
          // Isso garante que dados do usuário anterior não apareçam
          if (typeof window !== 'undefined') {
            console.log('🧹 Auth Store - Limpando cache no logout...')
            // Limpar cache do React Query
            if (window.queryClient) {
              console.log('🧹 Limpando React Query cache...')
              window.queryClient.clear()
            } else {
              console.warn('⚠️ queryClient não encontrado no window!')
            }
            // Limpar localStorage manualmente (força limpeza do Zustand persist)
            console.log('🧹 Removendo rafa-ilpi-auth do localStorage...')
            localStorage.removeItem('rafa-ilpi-auth')
            console.log('✅ Logout completo - cache limpo!')
          }
        }
      },

      // Refresh token
      refreshAuth: async () => {
        const { refreshToken } = get()
        if (!refreshToken) {
          set({ isAuthenticated: false })
          return
        }

        try {
          const response = await api.post('/auth/refresh', { refreshToken })
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
            response.data

          set({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          })

          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`
        } catch (error) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          })
          delete api.defaults.headers.common['Authorization']
        }
      },

      // Limpar erro
      clearError: () => set({ error: null }),

      // Set auth (mantido para compatibilidade)
      setAuth: (user: User, accessToken: string, refreshToken: string) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        })
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      },

      // Clear auth (mantido para compatibilidade)
      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
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
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
