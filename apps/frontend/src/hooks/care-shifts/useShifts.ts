// ──────────────────────────────────────────────────────────────────────────────
//  HOOK - useShifts (Plantões de Cuidadores)
// ──────────────────────────────────────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
  assignTeamToShift,
  substituteTeam,
  substituteMember,
  addMember,
  removeMember,
  getShiftHistory,
  generateShifts,
} from '@/api/care-shifts/care-shifts.api';
import type {
  Shift,
  ListShiftsQueryDto,
  CreateShiftDto,
  UpdateShiftDto,
  AssignTeamDto,
  SubstituteTeamDto,
  SubstituteMemberDto,
  AddMemberDto,
  ShiftHistory,
} from '@/types/care-shifts/care-shifts';
import { tenantKey } from '@/lib/query-keys';

// ────────────────────────────────────────────────────────────────────────────
// QUERY HOOKS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hook para listar plantões de um período
 */
export function useShifts(query: ListShiftsQueryDto) {
  return useQuery<Shift[]>({
    queryKey: tenantKey('care-shifts', 'shifts', 'list', JSON.stringify(query)),
    queryFn: () => listShifts(query),
    staleTime: 1000 * 60 * 2, // 2 minutos (dados mais frescos)
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para buscar plantão por ID com membros e detalhes
 */
export function useShift(id: string | undefined) {
  const enabled = !!id && id !== 'new';

  return useQuery<Shift>({
    queryKey: tenantKey('care-shifts', 'shifts', id),
    queryFn: () => {
      if (!id) {
        throw new Error('id is required');
      }
      return getShiftById(id);
    },
    enabled,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook para buscar histórico de versões de um plantão
 */
export function useShiftHistory(id: string | undefined) {
  const enabled = !!id && id !== 'new';

  return useQuery<ShiftHistory[]>({
    queryKey: tenantKey('care-shifts', 'shifts', id, 'history'),
    queryFn: () => {
      if (!id) {
        throw new Error('id is required');
      }
      return getShiftHistory(id);
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// MUTATION HOOKS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hook para criar plantão manual
 */
export function useCreateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateShiftDto) => createShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'shifts', 'list'),
      });
      toast.success('Plantão criado com sucesso');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Erro ao criar plantão';
      toast.error(message);
    },
  });
}

/**
 * Hook para atualizar plantão
 */
export function useUpdateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateShiftDto }) =>
      updateShift(id, data),
    onSuccess: (updatedShift) => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'shifts', 'list'),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'shifts', updatedShift.id),
      });
      toast.success('Plantão atualizado com sucesso');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Erro ao atualizar plantão';
      toast.error(message);
    },
  });
}

/**
 * Hook para deletar plantão
 */
export function useDeleteShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteShift(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'shifts'),
      });
      toast.success('Plantão excluído com sucesso');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error.response?.data?.message || 'Erro ao excluir plantão';
      toast.error(message);
    },
  });
}

/**
 * Hook para designar equipe ao plantão
 */
export function useAssignTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shiftId, data }: { shiftId: string; data: AssignTeamDto }) =>
      assignTeamToShift(shiftId, data),
    onSuccess: (updatedShift) => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'shifts', 'list'),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'shifts', updatedShift.id),
      });
      toast.success('Equipe designada com sucesso');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error.response?.data?.message || 'Erro ao designar equipe';
      toast.error(message);
    },
  });
}

/**
 * Hook para substituir equipe inteira
 */
export function useSubstituteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shiftId,
      data,
    }: {
      shiftId: string;
      data: SubstituteTeamDto;
    }) => substituteTeam(shiftId, data),
    onSuccess: (updatedShift) => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'shifts', 'list'),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'shifts', updatedShift.id),
      });
      toast.success('Equipe substituída com sucesso');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error.response?.data?.message || 'Erro ao substituir equipe';
      toast.error(message);
    },
  });
}

/**
 * Hook para substituir membro individual
 */
export function useSubstituteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shiftId,
      data,
    }: {
      shiftId: string;
      data: SubstituteMemberDto;
    }) => substituteMember(shiftId, data),
    onSuccess: (updatedShift) => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'shifts', 'list'),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'shifts', updatedShift.id),
      });
      toast.success('Membro substituído com sucesso');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error.response?.data?.message ||
        'Erro ao substituir membro. Verifique se não há conflito de turno.';
      toast.error(message);
    },
  });
}

/**
 * Hook para adicionar membro extra ao plantão
 */
export function useAddShiftMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shiftId, data }: { shiftId: string; data: AddMemberDto }) =>
      addMember(shiftId, data),
    onSuccess: (updatedShift) => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'shifts', 'list'),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'shifts', updatedShift.id),
      });
      toast.success('Membro adicionado com sucesso');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error.response?.data?.message ||
        'Erro ao adicionar membro. Verifique se não há conflito de turno.';
      toast.error(message);
    },
  });
}

/**
 * Hook para remover membro do plantão
 */
export function useRemoveShiftMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shiftId, userId }: { shiftId: string; userId: string }) =>
      removeMember(shiftId, userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'shifts', 'list'),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'shifts', variables.shiftId),
      });
      toast.success('Membro removido com sucesso');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error.response?.data?.message || 'Erro ao remover membro';
      toast.error(message);
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// GERAÇÃO AUTOMÁTICA
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hook para gerar plantões do padrão semanal (próximos 14 dias)
 */
export function useGenerateShifts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateShifts(),
    onSuccess: (result) => {
      // Invalidar queries para recarregar plantões
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'shifts', 'list'),
      });

      // Mostrar resultado detalhado
      if (result.generated > 0) {
        toast.success(
          `${result.generated} plantões gerados com sucesso${result.skipped > 0 ? ` (${result.skipped} já existentes pulados)` : ''}`,
          { duration: 5000 },
        );
      } else if (result.skipped > 0) {
        toast.info(
          `Nenhum plantão novo gerado. ${result.skipped} plantões já existem para este período.`,
          { duration: 5000 },
        );
      } else {
        toast.warning('Nenhum plantão gerado. Verifique se há um padrão semanal ativo.', {
          duration: 5000,
        });
      }

      // Mostrar erros, se houver
      if (result.errors && result.errors.length > 0) {
        toast.error(`${result.errors.length} erros durante a geração. Verifique o console.`, {
          duration: 7000,
        });
        console.error('Erros na geração de plantões:', result.errors);
      }
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error.response?.data?.message ||
        'Erro ao gerar plantões. Verifique se há um padrão semanal ativo.';
      toast.error(message);
    },
  });
}
