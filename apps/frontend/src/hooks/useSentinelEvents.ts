import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { tenantKey } from '@/lib/query-keys';

export interface SentinelEvent {
  id: string;
  dailyRecordId: string;
  residentName: string;
  residentId: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  description: string;
  status: 'PENDENTE' | 'ENVIADO' | 'CONFIRMADO';
  protocolo?: string;
  dataEnvio?: string;
  dataConfirmacao?: string;
  responsavelEnvio?: string;
  emailEnviado: boolean;
  emailEnviadoEm?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

interface UseSentinelEventsFilters {
  status?: 'PENDENTE' | 'ENVIADO' | 'CONFIRMADO';
  startDate?: string;
  endDate?: string;
}

/**
 * Hook para buscar lista de eventos sentinela
 */
export function useSentinelEvents(filters?: UseSentinelEventsFilters) {
  return useQuery({
    queryKey: tenantKey('sentinel-events', JSON.stringify(filters)),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const queryString = params.toString();
      const url = `/sentinel-events${queryString ? `?${queryString}` : ''}`;

      const response = await api.get<SentinelEvent[]>(url);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para atualizar status de evento sentinela
 */
export function useUpdateSentinelEventStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      status,
      protocolo,
      observacoes,
    }: {
      eventId: string;
      status: 'ENVIADO' | 'CONFIRMADO';
      protocolo?: string;
      observacoes?: string;
    }) => {
      const response = await api.patch(
        `/sentinel-events/${eventId}`,
        {
          status,
          protocolo,
          observacoes,
        },
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidar cache para recarregar lista
      queryClient.invalidateQueries({ queryKey: tenantKey('sentinel-events') });
    },
  });
}
