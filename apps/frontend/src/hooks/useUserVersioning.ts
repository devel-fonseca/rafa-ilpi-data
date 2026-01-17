import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/api/users.api'
import { useToast } from '@/components/ui/use-toast'
import { tenantKey } from '@/lib/query-keys'

/**
 * Hook para gerenciar histórico de User
 */
export function useUserHistory(userId: string | null) {
  return useQuery({
    queryKey: tenantKey('user-history', userId || 'none'),
    queryFn: () => usersApi.getHistory(userId!),
    enabled: !!userId,
  })
}

/**
 * Hook para atualizar User com validação de changeReason
 */
export function useUpdateUser() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: {
        changeReason: string
        name?: string
        email?: string
        password?: string
        role?: 'ADMIN' | 'COORDENADOR' | 'ENFERMEIRO' | 'TECNICO_ENFERMAGEM' | 'CUIDADOR' | 'MEDICO' | 'NUTRICIONISTA' | 'FISIOTERAPEUTA' | 'PSICOLOGO' | 'ASSISTENTE_SOCIAL'
        isActive?: boolean
      }
    }) => usersApi.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: tenantKey('users') })
      queryClient.invalidateQueries({ queryKey: tenantKey('user-history', variables.id) })

      toast({
        title: 'Usuário atualizado',
        description: 'As alterações foram salvas com sucesso.',
      })
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description:
          errorResponse?.data?.message ||
          'Não foi possível atualizar o usuário. Tente novamente.',
      })
    },
  })
}

/**
 * Hook para excluir User com validação de deleteReason
 */
export function useDeleteUser() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      usersApi.remove(id, deleteReason),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: tenantKey('users') })

      toast({
        title: 'Usuário excluído',
        description: 'O usuário foi excluído com sucesso.',
      })
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description:
          errorResponse?.data?.message ||
          'Não foi possível excluir o usuário. Tente novamente.',
      })
    },
  })
}

/**
 * Hook agregado que fornece todas as operações de versionamento
 *
 * @example
 * ```tsx
 * function UsersPage() {
 *   const { history, update, remove } = useUserVersioning(userId)
 *
 *   const handleUpdate = () => {
 *     update.mutate({
 *       id: userId,
 *       data: {
 *         changeReason: 'Atualização de perfil',
 *         name: 'Novo Nome'
 *       }
 *     })
 *   }
 *
 *   return (
 *     <div>
 *       {history.data?.history.map(version => (
 *         <VersionCard key={version.id} version={version} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useUserVersioning(userId: string | null) {
  const history = useUserHistory(userId)
  const update = useUpdateUser()
  const remove = useDeleteUser()

  return {
    // Queries
    history,

    // Mutations
    update,
    remove,

    // Estado agregado
    isLoading: history.isLoading || update.isPending || remove.isPending,
    isError: history.isError || update.isError || remove.isError,
  }
}
