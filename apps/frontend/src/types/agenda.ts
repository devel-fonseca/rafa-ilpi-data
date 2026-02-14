// ──────────────────────────────────────────────────────────────────────────────
// TIPOS E INTERFACES PARA O MÓDULO DE AGENDA
// ──────────────────────────────────────────────────────────────────────────────

export enum AgendaItemType {
  MEDICATION = 'MEDICATION',
  SCHEDULED_EVENT = 'SCHEDULED_EVENT',
  RECURRING_RECORD = 'RECURRING_RECORD',
}

export enum ContentFilterType {
  // Medicamentos
  MEDICATIONS = 'medications',

  // Agendamentos pontuais
  VACCINATIONS = 'vaccinations',
  CONSULTATIONS = 'consultations',
  EXAMS = 'exams',
  PROCEDURES = 'procedures',
  OTHER_EVENTS = 'other_events',

  // Registros programados recorrentes
  HYGIENE = 'hygiene',
  FEEDING = 'feeding',
  HYDRATION = 'hydration',
  WEIGHT = 'weight',
  MONITORING = 'monitoring',
  ELIMINATION = 'elimination',
  BEHAVIOR = 'behavior',
  SLEEP = 'sleep',
  ACTIVITIES = 'activities',
  VISITS = 'visits',
  OTHER_RECORDS = 'other_records',
}

export interface VaccineData {
  name: string
  dose?: string
  manufacturer?: string
  batchNumber?: string
}

/**
 * Metadados estruturados para eventos institucionais dentro de AgendaItem
 * Substituindo Record<string, unknown> para tipagem forte
 */
export interface InstitutionalEventMetadata {
  eventType?: InstitutionalEventType
  visibility?: InstitutionalEventVisibility
  documentType?: string
  documentNumber?: string
  expiryDate?: string | Date
  responsible?: string
  trainingTopic?: string
  instructor?: string
  targetAudience?: string
  location?: string
}

/**
 * Metadados genéricos para AgendaItem (union de todos os tipos possíveis)
 */
export type AgendaItemMetadata = InstitutionalEventMetadata | {
  // Extensível para outros tipos de metadados no futuro
  [key: string]: string | number | boolean | Date | undefined
}

export interface AgendaItem {
  id: string
  type: AgendaItemType
  category: string
  residentId: string
  residentName: string
  title: string
  description?: string
  scheduledDate: string | Date
  scheduledTime: string
  status: 'pending' | 'completed' | 'missed' | 'canceled'
  completedAt?: string | Date
  completedBy?: string
  metadata?: AgendaItemMetadata

  // Específico para medicamentos
  medicationName?: string
  dosage?: string
  prescriptionId?: string

  // Específico para eventos agendados
  eventType?: 'VACCINATION' | 'CONSULTATION' | 'EXAM' | 'PROCEDURE' | 'OTHER'
  vaccineData?: VaccineData
  eventId?: string

  // Específico para registros recorrentes
  recordType?: string
  suggestedTimes?: string[]
  configId?: string
  mealType?: string
}

export type ViewType = 'daily' | 'weekly' | 'monthly' | 'period'
export type ScopeType = 'general' | 'institutional' | 'resident' | 'prescriptions'
export type StatusFilterType = 'all' | 'pending' | 'completed' | 'missed' | 'canceled'

// ──────────────────────────────────────────────────────────────────────────────
// TIPOS PARA EVENTOS INSTITUCIONAIS
// ──────────────────────────────────────────────────────────────────────────────

export enum InstitutionalEventType {
  DOCUMENT_EXPIRY = 'DOCUMENT_EXPIRY',
  TRAINING = 'TRAINING',
  MEETING = 'MEETING',
  INSPECTION = 'INSPECTION',
  MAINTENANCE = 'MAINTENANCE',
  OTHER = 'OTHER',
}

export enum InstitutionalEventVisibility {
  ADMIN_ONLY = 'ADMIN_ONLY',
  RT_ONLY = 'RT_ONLY',
  ALL_USERS = 'ALL_USERS',
}

export interface InstitutionalEvent {
  id: string
  tenantId: string
  eventType: InstitutionalEventType
  visibility: InstitutionalEventVisibility
  title: string
  description?: string
  scheduledDate: string | Date
  scheduledTime?: string
  allDay: boolean
  status: 'pending' | 'completed' | 'missed' | 'canceled'
  completedAt?: string | Date
  notes?: string

  // Campos específicos para DOCUMENT_EXPIRY
  documentType?: string
  documentNumber?: string
  expiryDate?: string | Date
  responsible?: string

  // Campos específicos para TRAINING
  trainingTopic?: string
  instructor?: string
  targetAudience?: string
  location?: string

  // Metadados adicionais
  metadata?: Record<string, unknown>

  // Auditoria
  createdAt: string | Date
  updatedAt: string | Date
  createdBy: string
  updatedBy?: string
}

export interface AgendaFilters {
  scope: ScopeType
  residentId: string | null
  selectedDate: Date
  viewType: ViewType
  contentFilters: ContentFilterType[]
}

export interface AgendaPreferences {
  lastScope: ScopeType
  lastViewType: ViewType
  lastResidentId: string | null
  lastContentFilters: ContentFilterType[]
}

// Labels para exibição
export const CONTENT_FILTER_LABELS: Record<ContentFilterType, string> = {
  [ContentFilterType.MEDICATIONS]: 'Medicamentos',
  [ContentFilterType.VACCINATIONS]: 'Vacinas',
  [ContentFilterType.CONSULTATIONS]: 'Consultas',
  [ContentFilterType.EXAMS]: 'Exames',
  [ContentFilterType.PROCEDURES]: 'Procedimentos',
  [ContentFilterType.OTHER_EVENTS]: 'Outros Eventos',
  [ContentFilterType.HYGIENE]: 'Higiene',
  [ContentFilterType.FEEDING]: 'Alimentação',
  [ContentFilterType.HYDRATION]: 'Hidratação',
  [ContentFilterType.WEIGHT]: 'Peso',
  [ContentFilterType.MONITORING]: 'Monitoramento',
  [ContentFilterType.ELIMINATION]: 'Eliminação',
  [ContentFilterType.BEHAVIOR]: 'Comportamento',
  [ContentFilterType.SLEEP]: 'Sono',
  [ContentFilterType.ACTIVITIES]: 'Atividades',
  [ContentFilterType.VISITS]: 'Visitas',
  [ContentFilterType.OTHER_RECORDS]: 'Outros Registros',
}

// Ícones para cada categoria
export const CONTENT_FILTER_ICONS: Record<ContentFilterType, string> = {
  [ContentFilterType.MEDICATIONS]: '💊',
  [ContentFilterType.VACCINATIONS]: '💉',
  [ContentFilterType.CONSULTATIONS]: '🏥',
  [ContentFilterType.EXAMS]: '🔬',
  [ContentFilterType.PROCEDURES]: '⚕️',
  [ContentFilterType.OTHER_EVENTS]: '📝',
  [ContentFilterType.HYGIENE]: '🚿',
  [ContentFilterType.FEEDING]: '🍽️',
  [ContentFilterType.HYDRATION]: '💧',
  [ContentFilterType.WEIGHT]: '⚖️',
  [ContentFilterType.MONITORING]: '🩺',
  [ContentFilterType.ELIMINATION]: '🚽',
  [ContentFilterType.BEHAVIOR]: '😊',
  [ContentFilterType.SLEEP]: '😴',
  [ContentFilterType.ACTIVITIES]: '🎯',
  [ContentFilterType.VISITS]: '👥',
  [ContentFilterType.OTHER_RECORDS]: '📋',
}

// Cores para cada categoria (Tailwind classes)
export const CONTENT_FILTER_COLORS: Record<ContentFilterType, {
  bg: string
  border: string
  text: string
}> = {
  [ContentFilterType.MEDICATIONS]: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-700 dark:text-purple-300',
  },
  [ContentFilterType.VACCINATIONS]: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
  },
  [ContentFilterType.CONSULTATIONS]: {
    bg: 'bg-teal-50 dark:bg-teal-950',
    border: 'border-teal-200 dark:border-teal-800',
    text: 'text-teal-700 dark:text-teal-300',
  },
  [ContentFilterType.EXAMS]: {
    bg: 'bg-cyan-50 dark:bg-cyan-950',
    border: 'border-cyan-200 dark:border-cyan-800',
    text: 'text-cyan-700 dark:text-cyan-300',
  },
  [ContentFilterType.PROCEDURES]: {
    bg: 'bg-indigo-50 dark:bg-indigo-950',
    border: 'border-indigo-200 dark:border-indigo-800',
    text: 'text-indigo-700 dark:text-indigo-300',
  },
  [ContentFilterType.OTHER_EVENTS]: {
    bg: 'bg-gray-50 dark:bg-gray-950',
    border: 'border-gray-200 dark:border-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
  },
  [ContentFilterType.HYGIENE]: {
    bg: 'bg-sky-50 dark:bg-sky-950',
    border: 'border-sky-200 dark:border-sky-800',
    text: 'text-sky-700 dark:text-sky-300',
  },
  [ContentFilterType.FEEDING]: {
    bg: 'bg-orange-50 dark:bg-orange-950',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-700 dark:text-orange-300',
  },
  [ContentFilterType.HYDRATION]: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
  },
  [ContentFilterType.WEIGHT]: {
    bg: 'bg-violet-50 dark:bg-violet-950',
    border: 'border-violet-200 dark:border-violet-800',
    text: 'text-violet-700 dark:text-violet-300',
  },
  [ContentFilterType.MONITORING]: {
    bg: 'bg-red-50 dark:bg-red-950',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-300',
  },
  [ContentFilterType.ELIMINATION]: {
    bg: 'bg-amber-50 dark:bg-amber-950',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
  },
  [ContentFilterType.BEHAVIOR]: {
    bg: 'bg-green-50 dark:bg-green-950',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-700 dark:text-green-300',
  },
  [ContentFilterType.SLEEP]: {
    bg: 'bg-indigo-50 dark:bg-indigo-950',
    border: 'border-indigo-200 dark:border-indigo-800',
    text: 'text-indigo-700 dark:text-indigo-300',
  },
  [ContentFilterType.ACTIVITIES]: {
    bg: 'bg-pink-50 dark:bg-pink-950',
    border: 'border-pink-200 dark:border-pink-800',
    text: 'text-pink-700 dark:text-pink-300',
  },
  [ContentFilterType.VISITS]: {
    bg: 'bg-emerald-50 dark:bg-emerald-950',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  [ContentFilterType.OTHER_RECORDS]: {
    bg: 'bg-slate-50 dark:bg-slate-950',
    border: 'border-slate-200 dark:border-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
  },
}

// Status badges
export const STATUS_BADGES: Record<AgendaItem['status'], {
  bg: string
  text: string
  label: string
}> = {
  pending: {
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    text: 'text-yellow-800 dark:text-yellow-200',
    label: 'Pendente',
  },
  completed: {
    bg: 'bg-green-100 dark:bg-green-900',
    text: 'text-green-800 dark:text-green-200',
    label: 'Concluído',
  },
  missed: {
    bg: 'bg-red-100 dark:bg-red-900',
    text: 'text-red-800 dark:text-red-200',
    label: 'Perdido',
  },
  canceled: {
    bg: 'bg-gray-100 dark:bg-gray-900',
    text: 'text-gray-800 dark:text-gray-200',
    label: 'Cancelado',
  },
}

// ──────────────────────────────────────────────────────────────────────────────
// TIPOS PARA VISUALIZAÇÃO DE PRESCRIÇÕES
// ──────────────────────────────────────────────────────────────────────────────

export enum PrescriptionType {
  ROTINA = 'ROTINA',
  ALTERACAO_PONTUAL = 'ALTERACAO_PONTUAL',
  ANTIBIOTICO = 'ANTIBIOTICO',
  ALTO_RISCO = 'ALTO_RISCO',
  CONTROLADO = 'CONTROLADO',
  OUTRO = 'OUTRO',
}

export enum PrescriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRING_SOON = 'EXPIRING_SOON', // Vence em até 7 dias
  EXPIRED = 'EXPIRED',
  NEEDS_REVIEW = 'NEEDS_REVIEW', // Data de revisão chegou
}

export interface PrescriptionCalendarItem {
  id: string
  residentId: string
  residentName: string
  prescriptionType: PrescriptionType
  status: PrescriptionStatus
  doctorName: string
  doctorCrm: string
  prescriptionDate: string | Date
  validUntil?: string | Date
  reviewDate?: string | Date
  daysUntilExpiry?: number
  daysUntilReview?: number
  medicationCount: number
  medicationNames: string[]
  isControlled: boolean
  controlledClass?: string
  notes?: string
}

export type PrescriptionFilterType = 'all' | 'active' | 'expiring' | 'expired' | 'needs_review'
