// ──────────────────────────────────────────────────────────────────────────────
//  HOOK - useTeams (Equipes de Cuidadores)
// ──────────────────────────────────────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createTeam,
  listTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
} from '@/api/care-shifts/teams.api';
import type {
  Team,
  CreateTeamDto,
  UpdateTeamDto,
  AddTeamMemberDto,
  ListTeamsQueryDto,
  ListTeamsResponse,
} from '@/types/care-shifts/teams';
import { tenantKey } from '@/lib/query-keys';

// ────────────────────────────────────────────────────────────────────────────
// QUERY HOOKS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hook para listar equipes com paginação e filtros
 */
export function useTeams(query?: ListTeamsQueryDto) {
  return useQuery<ListTeamsResponse>({
    queryKey: tenantKey('care-shifts', 'teams', 'list', JSON.stringify(query || {})),
    queryFn: () => listTeams(query),
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para buscar equipe por ID
 */
export function useTeam(id: string | undefined) {
  const enabled = !!id && id !== 'new';

  return useQuery<Team>({
    queryKey: tenantKey('care-shifts', 'teams', id),
    queryFn: () => {
      if (!id) {
        throw new Error('id is required');
      }
      return getTeamById(id);
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// ────────────────────────────────────────────────────────────────────────────
// MUTATION HOOKS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hook para criar nova equipe
 */
export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTeamDto) => createTeam(data),
    onSuccess: () => {
      // Invalidar lista de equipes
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'teams', 'list'),
      });

      toast.success('Equipe criada com sucesso');
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } })
        .response;
      const message = errorResponse?.data?.message || 'Erro ao criar equipe';
      toast.error(message);
    },
  });
}

/**
 * Hook para atualizar equipe
 */
export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTeamDto }) =>
      updateTeam(id, data),
    onSuccess: (updatedTeam) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'teams', 'list'),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'teams', updatedTeam.id),
      });

      toast.success('Equipe atualizada com sucesso');
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } })
        .response;
      const message = errorResponse?.data?.message || 'Erro ao atualizar equipe';
      toast.error(message);
    },
  });
}

/**
 * Hook para deletar equipe (soft delete)
 */
export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTeam(id),
    onSuccess: () => {
      // Invalidar todas as queries de teams
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'teams'),
      });

      toast.success('Equipe excluída com sucesso');
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } })
        .response;
      const message =
        errorResponse?.data?.message ||
        'Erro ao excluir equipe. Verifique se não há plantões futuros vinculados.';
      toast.error(message);
    },
  });
}

/**
 * Hook para adicionar membro à equipe
 */
export function useAddTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, data }: { teamId: string; data: AddTeamMemberDto }) =>
      addTeamMember(teamId, data),
    onSuccess: (memberData) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'teams', 'list'),
      });
      // Usar teamId do membro retornado
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'teams', memberData.teamId),
      });

      toast.success('Membro adicionado com sucesso');
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } })
        .response;
      const message =
        errorResponse?.data?.message ||
        'Erro ao adicionar membro. Verifique se o usuário tem cargo adequado.';
      toast.error(message);
    },
  });
}

/**
 * Hook para remover membro da equipe
 */
export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      removeTeamMember(teamId, userId),
    onSuccess: (_data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'teams', 'list'),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'teams', variables.teamId),
      });

      toast.success('Membro removido com sucesso');
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } })
        .response;
      const message = errorResponse?.data?.message || 'Erro ao remover membro';
      toast.error(message);
    },
  });
}
