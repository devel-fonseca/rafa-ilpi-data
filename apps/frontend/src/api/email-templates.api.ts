import { api } from '../services/api';

// ========== TYPES & INTERFACES ==========

export type EmailTemplateCategory = 'ONBOARDING' | 'BILLING' | 'LIFECYCLE' | 'SYSTEM';

export interface TemplateVariable {
  name: string;
  type: string; // 'string' | 'number' | 'date' | 'boolean' | 'array'
  required: boolean;
  description?: string;
}

export interface EmailTemplate {
  id: string;
  key: string; // "user-invite", "payment-reminder", etc.
  name: string; // "Convite de Usuário"
  subject: string; // "Acesso liberado ao sistema da {{tenantName}}"
  description?: string;
  jsonContent: any; // Easy Email JSON structure
  variables: TemplateVariable[];
  version: number;
  isActive: boolean;
  category: EmailTemplateCategory;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplateVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  jsonContent: any;
  subject: string;
  createdBy: string;
  changeNote?: string;
  createdAt: string;
}

export interface CreateEmailTemplateDto {
  key: string;
  name: string;
  subject: string;
  description?: string;
  jsonContent: any;
  variables: TemplateVariable[];
  category: EmailTemplateCategory;
  isActive?: boolean;
}

export interface UpdateEmailTemplateDto {
  name?: string;
  subject?: string;
  description?: string;
  jsonContent?: any;
  variables?: TemplateVariable[];
  category?: EmailTemplateCategory;
  isActive?: boolean;
  changeNote?: string;
  userId?: string;
}

export interface PreviewEmailTemplateDto {
  jsonContent: any;
  variables: Record<string, any>;
}

export interface SendTestEmailDto {
  to: string;
  variables: Record<string, any>;
}

// ========== API FUNCTIONS ==========

/**
 * Listar todos os templates de email
 */
export const listEmailTemplates = async (): Promise<EmailTemplate[]> => {
  const response = await api.get('/email-templates');
  return response.data;
};

/**
 * Buscar template por ID
 */
export const getEmailTemplate = async (id: string): Promise<EmailTemplate> => {
  const response = await api.get(`/email-templates/${id}`);
  return response.data;
};

/**
 * Criar novo template
 */
export const createEmailTemplate = async (
  data: CreateEmailTemplateDto
): Promise<EmailTemplate> => {
  const response = await api.post('/email-templates', data);
  return response.data;
};

/**
 * Atualizar template existente
 */
export const updateEmailTemplate = async (
  id: string,
  data: UpdateEmailTemplateDto
): Promise<EmailTemplate> => {
  const response = await api.put(`/email-templates/${id}`, data);
  return response.data;
};

/**
 * Deletar template
 */
export const deleteEmailTemplate = async (id: string): Promise<void> => {
  await api.delete(`/email-templates/${id}`);
};

/**
 * Buscar histórico de versões
 */
export const getEmailTemplateVersions = async (
  id: string
): Promise<EmailTemplateVersion[]> => {
  const response = await api.get(`/email-templates/${id}/versions`);
  return response.data;
};

/**
 * Fazer rollback para versão anterior
 */
export const rollbackEmailTemplate = async (
  id: string,
  versionId: string
): Promise<EmailTemplate> => {
  const response = await api.post(`/email-templates/${id}/rollback/${versionId}`);
  return response.data;
};

/**
 * Preview de template com dados mockados
 */
export const previewEmailTemplate = async (
  data: PreviewEmailTemplateDto
): Promise<{ html: string }> => {
  const response = await api.post('/email-templates/preview', data);
  return response.data;
};

/**
 * Enviar email de teste
 */
export const sendTestEmail = async (
  id: string,
  data: SendTestEmailDto
): Promise<{ success: boolean }> => {
  const response = await api.post(`/email-templates/${id}/test-send`, data);
  return response.data;
};
