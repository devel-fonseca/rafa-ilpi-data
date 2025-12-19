/**
 * QUERY KEYS - Sistema Centralizado de Chaves para React Query
 *
 * Este arquivo centraliza TODAS as query keys do sistema para garantir:
 * 1. Consistência: Todos usam as mesmas keys
 * 2. Type-safety: TypeScript infere tipos automaticamente
 * 3. Descoberta: Fácil encontrar todas as keys em um só lugar
 * 4. Invalidação precisa: Saber exatamente o que invalidar
 *
 * PADRÃO DE USO:
 *
 * @example
 * // ✅ CORRETO - Usar constantes
 * useQuery({
 *   queryKey: QUERY_KEYS.audit.recent(10),
 *   queryFn: fetchRecentActivity
 * })
 *
 * // ❌ ERRADO - String literal
 * useQuery({
 *   queryKey: ['audit', 'recent', 10],
 *   queryFn: fetchRecentActivity
 * })
 *
 * HIERARQUIA DE KEYS:
 * - all: Invalida tudo de um módulo
 * - list: Lista geral (sem filtros)
 * - detail: Detalhes de um item específico
 * - byX: Lista filtrada por algum critério
 */

export const QUERY_KEYS = {
  // ──────────────────────────────────────────────────────────────────────
  // GLOBAL - Dados que aparecem em múltiplas telas
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Audit Logs - Atividades recentes e logs de auditoria
   * Invalidar quando: qualquer CREATE/UPDATE/DELETE acontecer
   */
  audit: {
    all: ['audit'] as const,
    recent: (limit: number) => ['audit', 'recent', limit] as const,
    logs: (filters?: any) => ['audit', 'logs', filters] as const,
    stats: (startDate?: string, endDate?: string) =>
      ['audit', 'stats', { startDate, endDate }] as const,
  },

  /**
   * Notificações - Badge e lista de notificações
   * Invalidar quando: qualquer ação que gera notificação
   */
  notifications: {
    all: ['notifications'] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
    list: (filters?: any) => ['notifications', 'list', filters] as const,
  },

  // ──────────────────────────────────────────────────────────────────────
  // RESIDENTS - Dados de residentes
  // ──────────────────────────────────────────────────────────────────────

  residents: {
    all: ['residents'] as const,
    lists: () => ['residents', 'list'] as const,
    list: (filters?: any) => ['residents', 'list', filters] as const,
    detail: (id: string) => ['residents', id] as const,
    documents: (id: string) => ['residents', id, 'documents'] as const,
  },

  // ──────────────────────────────────────────────────────────────────────
  // RESIDENT SCHEDULE - Agenda e configurações
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Schedule Configs - Configurações de registros obrigatórios
   * Invalidar quando: criar/editar/deletar configs
   */
  scheduleConfigs: {
    all: ['schedule-configs'] as const,
    byResident: (residentId: string) =>
      ['schedule-configs', residentId] as const,
  },

  /**
   * Daily Tasks - Tarefas diárias geradas a partir das configs
   * Invalidar quando: criar/editar config OU completar uma task
   */
  dailyTasks: {
    all: ['daily-tasks'] as const,
    byResident: (residentId: string) =>
      ['daily-tasks', residentId] as const,
    byDate: (date: string) =>
      ['daily-tasks', { date }] as const,
  },

  /**
   * Scheduled Events - Eventos pontuais agendados
   */
  scheduledEvents: {
    all: ['scheduled-events'] as const,
    byResident: (residentId: string) =>
      ['scheduled-events', residentId] as const,
    upcoming: (filters?: any) =>
      ['scheduled-events', 'upcoming', filters] as const,
  },

  // ──────────────────────────────────────────────────────────────────────
  // DAILY RECORDS - Registros diários
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Daily Records - Registros de higiene, alimentação, etc.
   * Invalidar quando: criar/editar/deletar registro
   */
  dailyRecords: {
    all: ['daily-records'] as const,
    lists: () => ['daily-records', 'list'] as const,
    list: (filters?: any) => ['daily-records', 'list', filters] as const,
    byResident: (residentId: string) =>
      ['daily-records', { residentId }] as const,
    byDate: (date: string) =>
      ['daily-records', { date }] as const,
    byResidentAndDate: (residentId: string, date: string) =>
      ['daily-records', { residentId, date }] as const,
    history: (recordId: string) =>
      ['daily-records', recordId, 'history'] as const,
  },

  // ──────────────────────────────────────────────────────────────────────
  // CLINICAL - Dados clínicos
  // ──────────────────────────────────────────────────────────────────────

  clinicalProfiles: {
    all: ['clinical-profiles'] as const,
    byResident: (residentId: string) =>
      ['clinical-profiles', residentId] as const,
    versions: (residentId: string) =>
      ['clinical-profiles', residentId, 'versions'] as const,
  },

  clinicalNotes: {
    all: ['clinical-notes'] as const,
    byResident: (residentId: string) =>
      ['clinical-notes', residentId] as const,
  },

  vitalSigns: {
    all: ['vital-signs'] as const,
    byResident: (residentId: string) =>
      ['vital-signs', residentId] as const,
    versions: (residentId: string) =>
      ['vital-signs', residentId, 'versions'] as const,
  },

  // ──────────────────────────────────────────────────────────────────────
  // PRESCRIPTIONS & MEDICATIONS
  // ──────────────────────────────────────────────────────────────────────

  prescriptions: {
    all: ['prescriptions'] as const,
    active: ['prescriptions', 'active'] as const,
    upcoming: ['prescriptions', 'upcoming'] as const,
    byResident: (residentId: string) =>
      ['prescriptions', residentId] as const,
    detail: (id: string) =>
      ['prescriptions', id] as const,
  },

  medications: {
    all: ['medications'] as const,
    byResident: (residentId: string) =>
      ['medications', residentId] as const,
  },

  // ──────────────────────────────────────────────────────────────────────
  // INSTITUTIONAL
  // ──────────────────────────────────────────────────────────────────────

  buildings: {
    all: ['buildings'] as const,
    list: () => ['buildings', 'list'] as const,
    detail: (id: string) => ['buildings', id] as const,
  },

  floors: {
    all: ['floors'] as const,
    byBuilding: (buildingId: string) =>
      ['floors', { buildingId }] as const,
  },

  rooms: {
    all: ['rooms'] as const,
    byFloor: (floorId: string) =>
      ['rooms', { floorId }] as const,
  },

  beds: {
    all: ['beds'] as const,
    available: ['beds', 'available'] as const,
    byRoom: (roomId: string) =>
      ['beds', { roomId }] as const,
    detail: (id: string) =>
      ['beds', id] as const,
  },

  // ──────────────────────────────────────────────────────────────────────
  // USER & AUTH
  // ──────────────────────────────────────────────────────────────────────

  userProfile: {
    all: ['user-profile'] as const,
    current: ['user-profile', 'current'] as const,
  },

  users: {
    all: ['users'] as const,
    list: () => ['users', 'list'] as const,
    byTenant: (tenantId: string) =>
      ['users', { tenantId }] as const,
  },

  // ──────────────────────────────────────────────────────────────────────
  // OUTROS
  // ──────────────────────────────────────────────────────────────────────

  pops: {
    all: ['pops'] as const,
    list: () => ['pops', 'list'] as const,
    detail: (id: string) => ['pops', id] as const,
    versions: (id: string) => ['pops', id, 'versions'] as const,
  },

  vaccinations: {
    all: ['vaccinations'] as const,
    byResident: (residentId: string) =>
      ['vaccinations', residentId] as const,
  },
} as const

/**
 * Type helper para extrair tipos das query keys
 * Útil para criar hooks type-safe
 */
export type QueryKey = typeof QUERY_KEYS[keyof typeof QUERY_KEYS]
