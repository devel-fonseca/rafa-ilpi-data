import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as emailTemplatesApi from '../api/email-templates.api';
import type {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  PreviewEmailTemplateDto,
  SendTestEmailDto,
} from '../api/email-templates.api';

/**
 * Hooks React Query para módulo de Email Templates
 */

// ═══════════════════════════════════════════════════════════════════════════
// QUERIES (GET)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para listar todos os templates de email
 */
export function useEmailTemplates() {
  return useQuery({
    queryKey: ['email-templates'],
    queryFn: () => emailTemplatesApi.listEmailTemplates(),
  });
}

/**
 * Hook para buscar template específico
 */
export function useEmailTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['email-templates', id],
    queryFn: () => emailTemplatesApi.getEmailTemplate(id!),
    enabled: !!id,
  });
}

/**
 * Hook para buscar histórico de versões de um template
 */
export function useEmailTemplateVersions(id: string | undefined) {
  return useQuery({
    queryKey: ['email-templates', id, 'versions'],
    queryFn: () => emailTemplatesApi.getEmailTemplateVersions(id!),
    enabled: !!id,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS (CREATE, UPDATE, DELETE)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para criar novo template
 */
export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmailTemplateDto) =>
      emailTemplatesApi.createEmailTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template criado com sucesso');
    },
    onError: (error: unknown) => {
      const errorMessage = (error as { message?: string }).message || 'Erro desconhecido'
      toast.error(`Erro ao criar template: ${errorMessage}`);
    },
  });
}

/**
 * Hook para atualizar template existente
 */
export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmailTemplateDto }) =>
      emailTemplatesApi.updateEmailTemplate(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      queryClient.invalidateQueries({
        queryKey: ['email-templates', variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['email-templates', variables.id, 'versions'],
      });
      toast.success('Template atualizado com sucesso');
    },
    onError: (error: unknown) => {
      const errorMessage = (error as { message?: string }).message || 'Erro desconhecido'
      toast.error(`Erro ao atualizar template: ${errorMessage}`);
    },
  });
}

/**
 * Hook para deletar template
 */
export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => emailTemplatesApi.deleteEmailTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template deletado com sucesso');
    },
    onError: (error: unknown) => {
      const errorMessage = (error as { message?: string }).message || 'Erro desconhecido'
      toast.error(`Erro ao deletar template: ${errorMessage}`);
    },
  });
}

/**
 * Hook para fazer rollback para versão anterior
 */
export function useRollbackEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, versionId }: { id: string; versionId: string }) =>
      emailTemplatesApi.rollbackEmailTemplate(id, versionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      queryClient.invalidateQueries({
        queryKey: ['email-templates', variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['email-templates', variables.id, 'versions'],
      });
      toast.success('Rollback realizado com sucesso');
    },
    onError: (error: unknown) => {
      const errorMessage = (error as { message?: string }).message || 'Erro desconhecido'
      toast.error(`Erro ao fazer rollback: ${errorMessage}`);
    },
  });
}

/**
 * Hook para preview de template
 */
export function usePreviewEmailTemplate() {
  return useMutation({
    mutationFn: (data: PreviewEmailTemplateDto) =>
      emailTemplatesApi.previewEmailTemplate(data),
    onError: (error: unknown) => {
      const errorMessage = (error as { message?: string }).message || 'Erro desconhecido'
      toast.error(`Erro ao gerar preview: ${errorMessage}`);
    },
  });
}

/**
 * Hook para enviar email de teste
 */
export function useSendTestEmail() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SendTestEmailDto }) =>
      emailTemplatesApi.sendTestEmail(id, data),
    onSuccess: () => {
      toast.success('Email de teste enviado com sucesso');
    },
    onError: (error: unknown) => {
      const errorMessage = (error as { message?: string }).message || 'Erro desconhecido'
      toast.error(`Erro ao enviar email de teste: ${errorMessage}`);
    },
  });
}
