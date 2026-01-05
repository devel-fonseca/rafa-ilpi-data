import { api } from '@/services/api'

export enum SystemNotificationType {
  // Prescrições
  PRESCRIPTION_EXPIRED = 'PRESCRIPTION_EXPIRED',
  PRESCRIPTION_EXPIRING = 'PRESCRIPTION_EXPIRING',
  PRESCRIPTION_MISSING_RECEIPT = 'PRESCRIPTION_MISSING_RECEIPT',
  PRESCRIPTION_CONTROLLED_NO_RECEIPT = 'PRESCRIPTION_CONTROLLED_NO_RECEIPT',

  // Sinais Vitais
  VITAL_SIGN_ABNORMAL_BP = 'VITAL_SIGN_ABNORMAL_BP',
  VITAL_SIGN_ABNORMAL_GLUCOSE = 'VITAL_SIGN_ABNORMAL_GLUCOSE',
  VITAL_SIGN_ABNORMAL_TEMPERATURE = 'VITAL_SIGN_ABNORMAL_TEMPERATURE',
  VITAL_SIGN_ABNORMAL_HEART_RATE = 'VITAL_SIGN_ABNORMAL_HEART_RATE',
  VITAL_SIGN_ABNORMAL_RESPIRATORY_RATE = 'VITAL_SIGN_ABNORMAL_RESPIRATORY_RATE',

  // Documentos
  DOCUMENT_EXPIRED = 'DOCUMENT_EXPIRED',
  DOCUMENT_EXPIRING = 'DOCUMENT_EXPIRING',

  // Registro Diário
  DAILY_RECORD_MISSING = 'DAILY_RECORD_MISSING',

  // Medicação
  MEDICATION_ADMINISTRATION_MISSED = 'MEDICATION_ADMINISTRATION_MISSED',
  MEDICATION_ADMINISTRATION_LATE = 'MEDICATION_ADMINISTRATION_LATE',

  // Sistema
  SYSTEM_UPDATE = 'SYSTEM_UPDATE',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  USER_MENTION = 'USER_MENTION',

  // Agendamentos
  SCHEDULED_EVENT_DUE = 'SCHEDULED_EVENT_DUE',
  SCHEDULED_EVENT_MISSED = 'SCHEDULED_EVENT_MISSED',

  // Eventos Institucionais
  INSTITUTIONAL_EVENT_CREATED = 'INSTITUTIONAL_EVENT_CREATED',
  INSTITUTIONAL_EVENT_UPDATED = 'INSTITUTIONAL_EVENT_UPDATED',
  INSTITUTIONAL_EVENT_DUE = 'INSTITUTIONAL_EVENT_DUE',
}

export enum NotificationCategory {
  PRESCRIPTION = 'PRESCRIPTION',
  VITAL_SIGN = 'VITAL_SIGN',
  DOCUMENT = 'DOCUMENT',
  DAILY_RECORD = 'DAILY_RECORD',
  MEDICATION = 'MEDICATION',
  SCHEDULED_EVENT = 'SCHEDULED_EVENT',
  INSTITUTIONAL_EVENT = 'INSTITUTIONAL_EVENT',
  SYSTEM = 'SYSTEM',
}

export enum NotificationSeverity {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING',
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
}

export interface Notification {
  id: string
  tenantId: string
  type: SystemNotificationType
  category: NotificationCategory
  severity: NotificationSeverity
  title: string
  message: string
  actionUrl: string | null
  entityType: string | null
  entityId: string | null
  metadata: Record<string, any> | null
  read: boolean // Calculado pelo backend baseado em NotificationRead
  readAt: string | null // Calculado pelo backend baseado em NotificationRead
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export interface NotificationsResponse {
  data: Notification[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface QueryNotificationsParams {
  page?: number
  limit?: number
  category?: NotificationCategory
  severity?: NotificationSeverity
  read?: boolean
  type?: SystemNotificationType
  search?: string
}

export interface CreateNotificationDto {
  type: SystemNotificationType
  category: NotificationCategory
  severity: NotificationSeverity
  title: string
  message: string
  actionUrl?: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, any>
  expiresAt?: string
}

/**
 * Buscar notificações com filtros e paginação
 */
export async function getNotifications(
  params: QueryNotificationsParams = {},
): Promise<NotificationsResponse> {
  // IMPORTANTE: Adicionar timestamp para evitar cache HTTP 304
  // Isso força o navegador a buscar dados frescos do servidor
  const response = await api.get<NotificationsResponse>('/notifications', {
    params: { ...params, _t: Date.now() },
  })
  return response.data
}

/**
 * Contar notificações não lidas
 */
export async function getUnreadCount(): Promise<{ count: number }> {
  // IMPORTANTE: Adicionar timestamp para evitar cache HTTP 304
  // Isso força o navegador a buscar dados frescos do servidor
  const cacheBuster = `_t=${Date.now()}`
  const response = await api.get<{ count: number }>(`/notifications/unread/count?${cacheBuster}`)
  return response.data
}

/**
 * Marcar notificação como lida
 */
export async function markAsRead(id: string): Promise<Notification> {
  const response = await api.patch<Notification>(`/notifications/${id}/read`)
  return response.data
}

/**
 * Marcar todas as notificações como lidas
 */
export async function markAllAsRead(): Promise<{ count: number }> {
  const response = await api.patch<{ count: number }>('/notifications/read-all')
  return response.data
}

/**
 * Deletar notificação
 */
export async function deleteNotification(id: string): Promise<{ success: boolean }> {
  const response = await api.delete<{ success: boolean }>(`/notifications/${id}`)
  return response.data
}

/**
 * Criar nova notificação (normalmente usado internamente)
 */
export async function createNotification(
  dto: CreateNotificationDto,
): Promise<Notification> {
  const response = await api.post<Notification>('/notifications', dto)
  return response.data
}
