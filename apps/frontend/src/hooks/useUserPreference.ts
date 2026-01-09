import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { updateMyPreferences } from '@/services/api'
import { UserPreferences } from '@/types/preferences'

/**
 * Hook para gerenciar uma preferência específica do usuário
 * Armazena no backend (user_profiles.preferences) ao invés de localStorage
 *
 * Ideal para ambientes com dispositivos compartilhados (ex: ILPI)
 * onde vários usuários acessam o mesmo navegador/tablet
 *
 * @param key - Chave da preferência em UserPreferences
 * @param defaultValue - Valor padrão se preferência não existir
 * @returns [value, setValue, isLoading]
 *
 * @example
 * const [viewMode, setViewMode] = useUserPreference('residentSelectionViewMode', 'grid')
 */
export function useUserPreference<K extends keyof UserPreferences>(
  key: K,
  defaultValue: NonNullable<UserPreferences[K]>
): [NonNullable<UserPreferences[K]>, (value: NonNullable<UserPreferences[K]>) => Promise<void>, boolean] {
  const { user } = useAuthStore()

  // Buscar valor inicial das preferências do usuário
  // Nota: user.profile no auth.store pode não ter todas as propriedades do UserProfile
  // então fazemos um cast seguro para acessar preferences
  const userProfile = user?.profile as any
  const initialValue = (userProfile?.preferences?.[key] ?? defaultValue) as NonNullable<UserPreferences[K]>

  const [value, setValue] = useState<NonNullable<UserPreferences[K]>>(initialValue)
  const [isLoading, setIsLoading] = useState(false)

  // Atualizar valor local quando user.profile.preferences mudar
  useEffect(() => {
    const newValue = (userProfile?.preferences?.[key] ?? defaultValue) as NonNullable<UserPreferences[K]>
    setValue(newValue)
  }, [userProfile?.preferences, key, defaultValue])

  // Função para atualizar preferência no backend
  const updateValue = useCallback(async (newValue: NonNullable<UserPreferences[K]>) => {
    if (!user) {
      console.warn('Não é possível atualizar preferências: usuário não autenticado')
      return
    }

    // Atualizar estado local imediatamente (UI otimista)
    setValue(newValue)
    setIsLoading(true)

    try {
      // Atualizar no backend
      await updateMyPreferences({
        [key]: newValue
      })

      // Nota: O auth.store será atualizado automaticamente quando o
      // usuário recarregar a página ou através de um refresh do perfil
    } catch (error) {
      console.error(`Erro ao atualizar preferência ${String(key)}:`, error)

      // Reverter para valor anterior em caso de erro
      const previousValue = (userProfile?.preferences?.[key] ?? defaultValue) as NonNullable<UserPreferences[K]>
      setValue(previousValue)

      throw error
    } finally {
      setIsLoading(false)
    }
  }, [user, key, defaultValue])

  return [value, updateValue, isLoading]
}
