import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  usersApi,
  type User,
  type UserHistoryResponse,
  type CreateUserDto,
  type UpdateUserDto,
} from '@/api/users.api'
import { tenantKey } from '@/lib/query-keys'

// ==================== QUERY HOOKS ====================

/**
 * Hook para listar todos os usuários do tenant
 *
 * Busca usuários ativos e inativos do tenant atual.
 * Cache automaticamente isolado por tenant via tenantKey().
 *
 * @example
 * const { data: users, isLoading } = useUsers()
 */
export function useUsers() {
  return useQuery<User[]>({
    queryKey: tenantKey('users'),
    queryFn: () => usersApi.getAll(),
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook para buscar um usuário específico por ID
 *
 * @param id - ID do usuário
 *
 * @example
 * const { data: user } = useUser(userId)
 */
export function useUser(id: string | undefined) {
  const enabled = !!id && id !== 'new'

  return useQuery<User>({
    queryKey: tenantKey('users', id),
    queryFn: () => {
      if (!id) {
        throw new Error('id is required')
      }
      return usersApi.getById(id)
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para buscar histórico de alterações de um usuário
 *
 * Retorna todas as versões com informações de auditoria.
 *
 * @param id - ID do usuário
 *
 * @example
 * const { data: history } = useUserHistory(userId)
 */
export function useUserHistory(id: string | undefined) {
  const enabled = !!id

  return useQuery<UserHistoryResponse>({
    queryKey: tenantKey('users', id, 'history'),
    queryFn: () => {
      if (!id) {
        throw new Error('id is required')
      }
      return usersApi.getHistory(id)
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

// ==================== MUTATION HOOKS ====================

/**
 * Hook para criar novo usuário
 *
 * @example
 * const createUser = useCreateUser()
 * await createUser.mutateAsync({
 *   name: 'João Silva',
 *   email: 'joao@example.com',
 *   password: 'senha123',
 *   role: 'CUIDADOR',
 *   isActive: true
 * })
 */
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateUserDto) => usersApi.create(data),
    onSuccess: () => {
      // Invalidar lista de usuários
      queryClient.invalidateQueries({ queryKey: tenantKey('users') })

      toast.success('Usuário criado com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao criar usuário'
      toast.error(message)
    },
  })
}

/**
 * Hook para atualizar usuário com versionamento
 *
 * Mutation que cria nova versão do usuário preservando histórico.
 * Requer changeReason para auditoria.
 *
 * @example
 * const updateUser = useUpdateUser()
 * await updateUser.mutateAsync({
 *   id: userId,
 *   data: {
 *     name: 'João Silva Junior',
 *     changeReason: 'Atualização de nome após casamento'
 *   }
 * })
 */
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      usersApi.update(id, data),
    onSuccess: (updatedUser) => {
      // Invalidar lista de usuários
      queryClient.invalidateQueries({ queryKey: tenantKey('users') })
      // Invalidar usuário específico
      queryClient.invalidateQueries({ queryKey: tenantKey('users', updatedUser.id) })
      // Invalidar histórico
      queryClient.invalidateQueries({ queryKey: tenantKey('users', updatedUser.id, 'history') })

      toast.success('Usuário atualizado com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao atualizar usuário'
      toast.error(message)
    },
  })
}

/**
 * Hook para soft delete de usuário com versionamento
 *
 * Mutation que marca usuário como deletado (preserva dados para auditoria).
 * Requer deleteReason (mínimo 10 caracteres).
 *
 * @example
 * const deleteUser = useDeleteUser()
 * await deleteUser.mutateAsync({
 *   id: userId,
 *   deleteReason: 'Usuário solicitou desativação da conta'
 * })
 */
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      usersApi.remove(id, deleteReason),
    onSuccess: () => {
      // Invalidar todas as queries de users
      queryClient.invalidateQueries({ queryKey: tenantKey('users') })

      toast.success('Usuário excluído com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao excluir usuário'
      toast.error(message)
    },
  })
}
