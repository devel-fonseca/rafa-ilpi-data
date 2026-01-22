// ──────────────────────────────────────────────────────────────────────────────
//  HOOK - useWeeklySchedule (Padrão Semanal Recorrente)
// ──────────────────────────────────────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getActiveWeeklyPattern,
  getAllWeeklyPatterns,
  createWeeklyPattern,
  updateWeeklyPattern,
  deleteWeeklyPattern,
  assignTeamToPattern,
  removePatternAssignment,
} from '@/api/care-shifts/weekly-schedule.api';
import type {
  WeeklySchedulePattern,
  CreateWeeklyPatternDto,
  UpdateWeeklyPatternDto,
  AssignTeamToPatternDto,
} from '@/types/care-shifts/weekly-schedule';
import { tenantKey } from '@/lib/query-keys';

// ────────────────────────────────────────────────────────────────────────────
// QUERY HOOKS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hook para buscar o padrão semanal ativo
 */
export function useActiveWeeklyPattern() {
  return useQuery<WeeklySchedulePattern | null>({
    queryKey: tenantKey('care-shifts', 'weekly-pattern', 'active'),
    queryFn: () => getActiveWeeklyPattern(),
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para buscar todos os padrões semanais (histórico)
 */
export function useAllWeeklyPatterns() {
  return useQuery<WeeklySchedulePattern[]>({
    queryKey: tenantKey('care-shifts', 'weekly-pattern', 'all'),
    queryFn: () => getAllWeeklyPatterns(),
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// MUTATION HOOKS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hook para criar novo padrão semanal (desativa o anterior)
 */
export function useCreateWeeklyPattern() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWeeklyPatternDto) => createWeeklyPattern(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'weekly-pattern'),
      });
      toast.success('Padrão semanal criado com sucesso');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error.response?.data?.message || 'Erro ao criar padrão semanal';
      toast.error(message);
    },
  });
}

/**
 * Hook para atualizar padrão semanal
 */
export function useUpdateWeeklyPattern() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateWeeklyPatternDto;
    }) => updateWeeklyPattern(id, data),
    onSuccess: (updatedPattern) => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'weekly-pattern'),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'weekly-pattern', updatedPattern.id),
      });
      toast.success('Padrão semanal atualizado com sucesso');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error.response?.data?.message || 'Erro ao atualizar padrão semanal';
      toast.error(message);
    },
  });
}

/**
 * Hook para designar equipe a um dia+turno do padrão
 */
export function useAssignTeamToPattern() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      patternId,
      data,
    }: {
      patternId: string;
      data: AssignTeamToPatternDto;
    }) => assignTeamToPattern(patternId, data),
    onSuccess: (updatedPattern) => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'weekly-pattern'),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'weekly-pattern', updatedPattern.id),
      });
      toast.success('Equipe designada ao padrão com sucesso');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error.response?.data?.message ||
        'Erro ao designar equipe ao padrão semanal';
      toast.error(message);
    },
  });
}

/**
 * Hook para remover designação de equipe do padrão
 */
export function useRemovePatternAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      patternId,
      assignmentId,
    }: {
      patternId: string;
      assignmentId: string;
    }) => removePatternAssignment(patternId, assignmentId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'weekly-pattern'),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'weekly-pattern', variables.patternId),
      });
      toast.success('Designação removida com sucesso');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error.response?.data?.message || 'Erro ao remover designação';
      toast.error(message);
    },
  });
}

/**
 * Hook para deletar padrão semanal
 */
export function useDeleteWeeklyPattern() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWeeklyPattern(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'weekly-pattern'),
      });
      toast.success('Padrão semanal removido com sucesso');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error.response?.data?.message || 'Erro ao remover padrão semanal';
      toast.error(message);
    },
  });
}
