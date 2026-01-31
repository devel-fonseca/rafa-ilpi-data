import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  messagesAPI,
  MessageQuery,
  CreateMessageDto,
} from '../api/messages.api';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';
import { tenantKey } from '@/lib/query-keys';

// Hook para listar inbox
export function useInbox(initialQuery?: MessageQuery) {
  const [query, setQuery] = useState<MessageQuery>(
    initialQuery || { page: 1, limit: 20 },
  );

  const result = useQuery({
    queryKey: tenantKey('messages', 'inbox', JSON.stringify(query)),
    queryFn: () => messagesAPI.getInbox(query),
    staleTime: 1000 * 60, // 1 minuto
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchInterval: 1000 * 120, // 2 minutos (reduzido de 30s)
    refetchIntervalInBackground: false,
  });

  return {
    ...result,
    query,
    setQuery,
    messages: result.data?.data || [],
    meta: result.data?.meta,
  };
}

// Hook para listar enviadas
export function useSent(initialQuery?: MessageQuery) {
  const [query, setQuery] = useState<MessageQuery>(
    initialQuery || { page: 1, limit: 20 },
  );

  const result = useQuery({
    queryKey: tenantKey('messages', 'sent', JSON.stringify(query)),
    queryFn: () => messagesAPI.getSent(query),
    staleTime: 1000 * 120, // 2 minutos (mensagens enviadas mudam raramente)
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  return {
    ...result,
    query,
    setQuery,
    messages: result.data?.data || [],
    meta: result.data?.meta,
  };
}

// Hook para buscar uma mensagem
export function useMessage(id: string | undefined) {
  return useQuery({
    queryKey: tenantKey('messages', id),
    queryFn: () => {
      if (!id) throw new Error('ID is required');
      return messagesAPI.getById(id);
    },
    enabled: !!id,
  });
}

// Hook para buscar thread
export function useThread(threadId: string | undefined) {
  return useQuery({
    queryKey: tenantKey('messages', 'thread', threadId),
    queryFn: () => {
      if (!threadId) throw new Error('Thread ID is required');
      return messagesAPI.getThread(threadId);
    },
    enabled: !!threadId,
  });
}

// Hook para contador de não lidas
export function useUnreadMessagesCount() {
  return useQuery({
    queryKey: tenantKey('messages', 'unread-count'),
    queryFn: messagesAPI.getUnreadCount,
    staleTime: 1000 * 60, // 1 minuto
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchInterval: 1000 * 60, // 1 minuto (reduzido de 15s)
    refetchIntervalInBackground: false,
  });
}

// Hook para estatísticas
export function useMessagesStats() {
  return useQuery({
    queryKey: tenantKey('messages', 'stats'),
    queryFn: messagesAPI.getStats,
  });
}

// Hook para estatísticas de leitura de mensagem
export function useMessageReadStats(messageId: string | undefined) {
  return useQuery({
    queryKey: tenantKey('messages', 'read-stats', messageId),
    queryFn: () => {
      if (!messageId) throw new Error('Message ID is required');
      return messagesAPI.getReadStats(messageId);
    },
    enabled: !!messageId,
  });
}

// Hook para enviar mensagem
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateMessageDto) => messagesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('messages') });
      toast({
        title: 'Mensagem enviada',
        description: 'A mensagem foi enviada com sucesso.',
      });
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar',
        description:
          errorResponse?.data?.message || 'Erro ao enviar mensagem.',
      });
    },
  });
}

// Hook para marcar como lida
export function useMarkMessagesAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageIds?: string[]) => messagesAPI.markAsRead(messageIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('messages') });
    },
  });
}

// Hook para deletar mensagem
export function useDeleteMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      messagesAPI.delete(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('messages') });
      toast({
        title: 'Mensagem excluída',
        description: 'A mensagem foi excluída com sucesso.',
      });
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description:
          errorResponse?.data?.message || 'Erro ao excluir mensagem.',
      });
    },
  });
}
