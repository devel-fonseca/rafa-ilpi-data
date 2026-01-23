// ──────────────────────────────────────────────────────────────────────────────
// HOOK - useShiftsBulk (Criação em Lote de Plantões)
// ──────────────────────────────────────────────────────────────────────────────

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { tenantKey } from '@/lib/query-keys';
import { useToast } from '@/components/ui/use-toast';

interface BulkShiftInput {
  date: string; // YYYY-MM-DD
  shiftTemplateId: string;
  teamId: string;
}

interface BulkCreateResponse {
  created: Array<{
    id: string;
    date: string;
    shiftTemplateId: string;
    teamId: string;
  }>;
  skipped: Array<{
    date: string;
    shiftTemplateId: string;
    reason: string;
  }>;
  errors: Array<{
    date: string;
    shiftTemplateId: string;
    error: string;
  }>;
}

export function useBulkCreateShifts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (shifts: BulkShiftInput[]) => {
      const response = await api.post<BulkCreateResponse>('/care-shifts/bulk', {
        shifts,
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidar cache de shifts
      queryClient.invalidateQueries({ queryKey: tenantKey('care-shifts', 'shifts') });

      // Feedback ao usuário
      const { created, skipped, errors } = data;

      if (created.length > 0) {
        toast({
          title: '✅ Plantões criados!',
          description: `${created.length} plantão(ões) criado(s) com sucesso.`,
        });
      }

      if (skipped.length > 0) {
        toast({
          title: '⚠️ Alguns plantões já existiam',
          description: `${skipped.length} plantão(ões) já cadastrado(s).`,
          variant: 'default',
        });
      }

      if (errors.length > 0) {
        toast({
          title: '❌ Erros ao criar plantões',
          description: `${errors.length} erro(s) encontrado(s).`,
          variant: 'destructive',
        });
      }
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao criar plantões',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
}
