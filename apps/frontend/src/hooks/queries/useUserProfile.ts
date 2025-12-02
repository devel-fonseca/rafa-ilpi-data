import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyProfile, updateUserProfile } from '@/services/api'
import { useAuthStore } from '@/stores/auth.store'

export interface UserProfile {
  id: string
  userId: string
  tenantId: string
  profilePhoto: string | null
  phone: string | null
  position: string | null
  department: string | null
  birthDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
    isActive: boolean
  }
}

export interface UpdateProfileData {
  profilePhoto?: string
  phone?: string
  position?: string
  department?: string
  birthDate?: string
  notes?: string
}

// Query keys
export const profileKeys = {
  all: ['user-profile'] as const,
  me: () => [...profileKeys.all, 'me'] as const,
  detail: (userId: string) => [...profileKeys.all, userId] as const,
}

/**
 * Hook para buscar o perfil do usuário logado
 */
export function useMyProfile() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: async () => {
      console.log('🔍 useMyProfile - Buscando perfil do usuário:', {
        userId: user?.id,
        userName: user?.name,
        userEmail: user?.email
      })
      const result = await getMyProfile()
      console.log('✅ useMyProfile - Perfil recebido:', {
        profileUserId: result.user.id,
        profileUserName: result.user.name,
        profileUserEmail: result.user.email
      })
      return result
    },
    enabled: !!user, // Só busca se tiver usuário logado
    staleTime: 1000 * 60, // 1 minuto
  })
}

/**
 * Hook para atualizar o perfil do usuário
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: (data: UpdateProfileData) => {
      if (!user) throw new Error('Usuário não autenticado')
      return updateUserProfile(user.id, data)
    },
    onSuccess: (updatedProfile) => {
      // Invalidar cache do perfil após atualização
      queryClient.invalidateQueries({ queryKey: profileKeys.me() })
      queryClient.invalidateQueries({ queryKey: profileKeys.all })

      // Se a foto foi atualizada, também invalidar dados do auth
      queryClient.invalidateQueries({ queryKey: ['auth'] })

      // Atualizar o cache imediatamente com os novos dados (optimistic update)
      queryClient.setQueryData(profileKeys.me(), updatedProfile)
    },
  })
}
