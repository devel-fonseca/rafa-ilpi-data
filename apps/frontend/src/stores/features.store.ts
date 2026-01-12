import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../services/api'

interface FeaturesState {
  // State
  plan: string | null
  planType: string | null
  features: Record<string, boolean>
  isLoading: boolean
  error: string | null
  lastFetch: number | null

  // Actions
  fetchFeatures: () => Promise<void>
  hasFeature: (featureKey: string) => boolean
  hasAllFeatures: (featureKeys: string[]) => boolean
  hasAnyFeature: (featureKeys: string[]) => boolean
  clearFeatures: () => void
  refetch: () => Promise<void>
}

export const useFeaturesStore = create<FeaturesState>()(
  persist(
    (set, get) => ({
      // Initial state
      plan: null,
      planType: null,
      features: {},
      isLoading: false,
      error: null,
      lastFetch: null,

      // Buscar features do backend
      fetchFeatures: async () => {
        const { lastFetch } = get()
        const now = Date.now()

        // Cache de 5 minutos - evita chamadas repetidas
        if (lastFetch && now - lastFetch < 5 * 60 * 1000) {
          console.log('📦 Features Store - Usando cache (válido por 5 min)')
          return
        }

        set({ isLoading: true, error: null })
        try {
          const response = await api.get('/tenants/me/features')
          const { plan, planType, features } = response.data

          console.log('✅ Features Store - Features carregadas:', {
            plan,
            planType,
            featuresCount: Object.keys(features).length,
          })

          set({
            plan,
            planType,
            features,
            isLoading: false,
            error: null,
            lastFetch: now,
          })
        } catch (error: any) {
          console.error('❌ Features Store - Erro ao buscar features:', error)
          set({
            error: error.response?.data?.message || 'Erro ao buscar features do plano',
            isLoading: false,
          })
        }
      },

      // Verificar se tem UMA feature específica
      hasFeature: (featureKey: string) => {
        const { features } = get()
        return features[featureKey] === true
      },

      // Verificar se tem TODAS as features (AND lógico)
      hasAllFeatures: (featureKeys: string[]) => {
        const { features } = get()
        return featureKeys.every((key) => features[key] === true)
      },

      // Verificar se tem QUALQUER UMA das features (OR lógico)
      hasAnyFeature: (featureKeys: string[]) => {
        const { features } = get()
        return featureKeys.some((key) => features[key] === true)
      },

      // Limpar features (usado no logout)
      clearFeatures: () => {
        console.log('🧹 Features Store - Limpando features')
        set({
          plan: null,
          planType: null,
          features: {},
          error: null,
          lastFetch: null,
        })
      },

      // Forçar refetch (ignora cache)
      refetch: async () => {
        set({ lastFetch: null })
        await get().fetchFeatures()
      },
    }),
    {
      name: 'rafa-ilpi-features',
      partialize: (state) => ({
        plan: state.plan,
        planType: state.planType,
        features: state.features,
        lastFetch: state.lastFetch,
      }),
    },
  ),
)
