import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { tenantKey } from '@/lib/query-keys';
import type { Shift } from '@/types/care-shifts/care-shifts';

interface PermissionContextResponse {
  canRegister: boolean;
  reason: string | null;
  positionCode: string | null;
  hasBypass: boolean;
  isLeaderOrSubstitute: boolean;
  activeShift: Shift | null;
  currentShift: Shift | null;
}

interface UseCanRegisterResult extends PermissionContextResponse {
  isLoading: boolean;
}

const FALLBACK_CONTEXT: PermissionContextResponse = {
  canRegister: false,
  reason: 'Não foi possível validar permissão de registro.',
  positionCode: null,
  hasBypass: false,
  isLeaderOrSubstitute: false,
  activeShift: null,
  currentShift: null,
};

/**
 * Busca contexto de permissão a partir do backend.
 * Tradeoff: adiciona 1 chamada de rede, mas elimina drift de regra de negócio no frontend.
 */
export function useCanRegister(): UseCanRegisterResult {
  const { data, isLoading } = useQuery<PermissionContextResponse>({
    queryKey: tenantKey('daily-records', 'permission-context'),
    queryFn: async () => {
      const response = await api.get<PermissionContextResponse>(
        '/daily-records/permission-context',
      );
      return response.data;
    },
    staleTime: 1000 * 60,
  });

  return {
    ...(data || FALLBACK_CONTEXT),
    isLoading,
  };
}
