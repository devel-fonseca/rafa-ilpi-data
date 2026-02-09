import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { invalidateAfterScheduleMutation } from '@/utils/queryInvalidation';
import { tenantKey } from '@/lib/query-keys';

// ──────────────────────────────────────────────────────────────────────────
// TYPES - Re-exportados de @/types/resident-schedule
// ──────────────────────────────────────────────────────────────────────────

export type {
  ScheduleFrequency,
  ScheduledEventType,
  ScheduledEventStatus,
  SchedulableRecordType,
  ResidentScheduleConfig,
  ResidentScheduledEvent,
  DailyTask,
  CreateScheduleConfigInput,
  UpdateScheduleConfigInput,
  CreateScheduledEventInput,
  UpdateScheduledEventInput,
  VaccineData,
  MealTimesInput,
  CreateAlimentacaoConfigInput,
  UpdateAlimentacaoConfigInput,
} from '@/types/resident-schedule';

import type {
  ResidentScheduleConfig,
  ResidentScheduledEvent,
  DailyTask,
  CreateScheduleConfigInput,
  UpdateScheduleConfigInput,
  CreateScheduledEventInput,
  UpdateScheduledEventInput,
  CreateAlimentacaoConfigInput,
  UpdateAlimentacaoConfigInput,
} from '@/types/resident-schedule';

export interface ScheduledRecordsStats {
  date: string;
  expected: number;
  completed: number;
  pending: number;
  compliancePercentage: number;
}

// Alias para compatibilidade com código existente que usa RecordType
export type { SchedulableRecordType as RecordType } from '@/types/resident-schedule';

// ──────────────────────────────────────────────────────────────────────────
// QUERIES - CONFIGURAÇÕES
// ──────────────────────────────────────────────────────────────────────────

/**
 * Hook para listar configurações de agenda de um residente
 */
export function useScheduleConfigsByResident(
  residentId: string | null | undefined,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: tenantKey('schedule-configs', 'resident', residentId),
    queryFn: async () => {
      const response = await api.get<ResidentScheduleConfig[]>(
        `/resident-schedule/configs/resident/${residentId}`,
      );
      return response.data;
    },
    enabled: !!residentId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para listar todas as configurações ativas de registros obrigatórios do tenant
 * Usado para cálculo de cobertura de registros obrigatórios
 */
export function useAllActiveScheduleConfigs(enabled: boolean = true) {
  return useQuery({
    queryKey: tenantKey('schedule-configs', 'all-active'),
    queryFn: async () => {
      const response = await api.get<ResidentScheduleConfig[]>(
        '/resident-schedule/configs',
      );
      return response.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar estatísticas canônicas de registros programados em uma data.
 */
export function useScheduledRecordsStats(
  date?: string,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: tenantKey('scheduled-records', 'stats', date || 'today'),
    queryFn: async () => {
      const params = date ? { date } : {};
      const response = await api.get<ScheduledRecordsStats>(
        '/resident-schedule/scheduled-records/stats',
        { params },
      );
      return response.data;
    },
    enabled,
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// QUERIES - AGENDAMENTOS
// ──────────────────────────────────────────────────────────────────────────

/**
 * Hook para listar agendamentos de um residente
 */
export function useScheduledEventsByResident(
  residentId: string | null | undefined,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: tenantKey('scheduled-events', 'resident', residentId),
    queryFn: async () => {
      const response = await api.get<ResidentScheduledEvent[]>(
        `/resident-schedule/events/resident/${residentId}`,
      );
      return response.data;
    },
    enabled: !!residentId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// QUERIES - TAREFAS DO DIA
// ──────────────────────────────────────────────────────────────────────────

/**
 * Hook para listar tarefas diárias de um residente
 */
export function useDailyTasksByResident(
  residentId: string | null | undefined,
  date?: string,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: tenantKey('daily-tasks', 'resident', residentId, date),
    queryFn: async () => {
      const params = date ? { date } : {};
      const response = await api.get<DailyTask[]>(
        `/resident-schedule/tasks/resident/${residentId}/daily`,
        { params },
      );
      return response.data;
    },
    enabled: !!residentId && enabled,
    staleTime: 1 * 60 * 1000, // 1 minuto
    refetchOnMount: 'always', // Sempre buscar dados frescos ao montar
    refetchOnWindowFocus: true, // Refazer query quando janela recebe foco
  });
}

// ──────────────────────────────────────────────────────────────────────────
// MUTATIONS - CONFIGURAÇÕES
// ──────────────────────────────────────────────────────────────────────────

/**
 * Hook para criar nova configuração de agenda
 */
export function useCreateScheduleConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateScheduleConfigInput) => {
      const response = await api.post<ResidentScheduleConfig>(
        '/resident-schedule/configs',
        data,
      );
      return response.data;
    },
    onSuccess: (data) => {
      // ✅ NOVO PADRÃO: Um helper cuida de TODA a invalidação
      invalidateAfterScheduleMutation(queryClient, data.residentId);
    },
  });
}

/**
 * Hook para atualizar configuração existente
 */
export function useUpdateScheduleConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateScheduleConfigInput;
    }) => {
      const response = await api.patch<ResidentScheduleConfig>(
        `/resident-schedule/configs/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: (data) => {
      // ✅ NOVO PADRÃO: Um helper cuida de TODA a invalidação
      invalidateAfterScheduleMutation(queryClient, data.residentId);
    },
  });
}

/**
 * Hook para deletar configuração
 */
export function useDeleteScheduleConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, residentId }: { id: string; residentId: string }) => {
      await api.delete(`/resident-schedule/configs/${id}`);
      return { id, residentId };
    },
    onSuccess: (data) => {
      // ✅ NOVO PADRÃO: Um helper cuida de TODA a invalidação
      invalidateAfterScheduleMutation(queryClient, data.residentId);
    },
  });
}

// ──────────────────────────────────────────────────────────────────────────
// MUTATIONS - AGENDAMENTOS
// ──────────────────────────────────────────────────────────────────────────

/**
 * Hook para criar novo agendamento
 */
export function useCreateScheduledEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateScheduledEventInput) => {
      const response = await api.post<ResidentScheduledEvent>(
        '/resident-schedule/events',
        data,
      );
      return response.data;
    },
    onSuccess: (data) => {
      // ✅ NOVO PADRÃO: Um helper cuida de TODA a invalidação
      invalidateAfterScheduleMutation(queryClient, data.residentId);
    },
  });
}

/**
 * Hook para atualizar agendamento existente
 */
export function useUpdateScheduledEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateScheduledEventInput;
    }) => {
      const response = await api.patch<ResidentScheduledEvent>(
        `/resident-schedule/events/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: (data) => {
      // ✅ NOVO PADRÃO: Um helper cuida de TODA a invalidação
      invalidateAfterScheduleMutation(queryClient, data.residentId);
    },
  });
}

/**
 * Hook para deletar agendamento
 */
export function useDeleteScheduledEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, residentId }: { id: string; residentId: string }) => {
      await api.delete(`/resident-schedule/events/${id}`);
      return { id, residentId };
    },
    onSuccess: (data) => {
      // ✅ NOVO PADRÃO: Um helper cuida de TODA a invalidação
      invalidateAfterScheduleMutation(queryClient, data.residentId);
    },
  });
}

// ──────────────────────────────────────────────────────────────────────────
// ALIMENTACAO (Batch operations for 6 meal configs)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Hook para criar 6 configurações de alimentação em batch
 */
export function useCreateAlimentacaoConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAlimentacaoConfigInput) => {
      const response = await api.post<ResidentScheduleConfig[]>(
        '/resident-schedule/configs/alimentacao',
        input,
      );
      return response.data;
    },
    onSuccess: (data) => {
      // ✅ NOVO PADRÃO: Um helper cuida de TODA a invalidação
      if (data.length > 0) {
        invalidateAfterScheduleMutation(queryClient, data[0].residentId);
      }
    },
  });
}

/**
 * Hook para atualizar as 6 configurações de alimentação em batch
 */
export function useUpdateAlimentacaoConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      residentId,
      data,
    }: {
      residentId: string;
      data: UpdateAlimentacaoConfigInput;
    }) => {
      const response = await api.patch<ResidentScheduleConfig[]>(
        `/resident-schedule/configs/alimentacao/${residentId}`,
        data,
      );
      return response.data;
    },
    onSuccess: (data) => {
      // ✅ NOVO PADRÃO: Um helper cuida de TODA a invalidação
      if (data.length > 0) {
        invalidateAfterScheduleMutation(queryClient, data[0].residentId);
      }
    },
  });
}

/**
 * Hook para deletar todas as 6 configurações de alimentação
 */
export function useDeleteAlimentacaoConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ residentId }: { residentId: string }) => {
      await api.delete(`/resident-schedule/configs/alimentacao/${residentId}`);
      return { residentId };
    },
    onSuccess: (data) => {
      // ✅ NOVO PADRÃO: Um helper cuida de TODA a invalidação
      invalidateAfterScheduleMutation(queryClient, data.residentId);
    },
  });
}
