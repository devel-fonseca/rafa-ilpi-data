// ──────────────────────────────────────────────────────────────────────────────
//  HOOK - useShiftTemplates (Turnos Fixos - Read Only)
// ──────────────────────────────────────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listShiftTemplates,
  updateTenantShiftConfig,
} from '@/api/care-shifts/shift-templates.api';
import type {
  ShiftTemplate,
  UpdateTenantShiftConfigDto,
} from '@/types/care-shifts/shift-templates';
import { tenantKey } from '@/lib/query-keys';

// ────────────────────────────────────────────────────────────────────────────
// QUERY HOOKS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hook para listar todos os turnos fixos (5 turnos padrão)
 */
export function useShiftTemplates() {
  return useQuery<ShiftTemplate[]>({
    queryKey: tenantKey('care-shifts', 'shift-templates', 'list'),
    queryFn: () => listShiftTemplates(),
    staleTime: 1000 * 60 * 10, // 10 minutos (raramente muda)
  });
}

// ────────────────────────────────────────────────────────────────────────────
// MUTATION HOOKS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hook para ativar/desativar turno ou alterar nome customizado
 */
export function useUpdateShiftTemplateConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId: string;
      data: UpdateTenantShiftConfigDto;
    }) => updateTenantShiftConfig(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'shift-templates'),
      });
      // Invalidar também os padrões semanais, pois podem ter assignments afetados
      queryClient.invalidateQueries({
        queryKey: tenantKey('care-shifts', 'weekly-pattern'),
      });
      toast.success('Configuração de turno atualizada com sucesso');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error.response?.data?.message ||
        'Erro ao atualizar configuração de turno';
      toast.error(message);
    },
  });
}
