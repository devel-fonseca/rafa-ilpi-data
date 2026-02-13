// ============================================================================
// Types para ReportsHub - Central de Relatórios e Documentos
// ============================================================================

export type ReportType =
  | 'DAILY'
  | 'BY_RESIDENT'
  | 'BY_SHIFT'
  | 'BY_RECORD_TYPE'
  | 'INSTITUTIONAL_MONTHLY'
  | 'SENTINEL_EVENTS'

export type ReportFormat = 'PDF' | 'HTML' | 'CSV' | 'EXCEL'

// ShiftType agora aceita 'ALL' ou UUID de template específico
export type ShiftType = string // 'ALL' ou UUID do ShiftTemplate

export type RecordTypeFilter =
  | 'ALL'
  | 'MONITORAMENTO'
  | 'MEDICACAO'
  | 'INTERCORRENCIA'
  | 'ALIMENTACAO'
  | 'HIGIENE'
  | 'VISITA'
  | 'ATIVIDADES'

export interface ReportFilters {
  reportType: ReportType
  startDate: string
  endDate: string
  residentId?: string
  shift?: ShiftType
  recordType?: RecordTypeFilter
  format?: ReportFormat
}

export interface ReportCategoryItem {
  id: string
  label: string
  description: string
  reportType: ReportType
  icon?: React.ReactNode
  badge?: string
  defaultFilters?: Partial<ReportFilters>
}

export interface ReportCategory {
  id: string
  title: string
  description: string
  emoji: string
  color: string
  items: ReportCategoryItem[]
}

export interface RecentReport {
  id: string
  label: string
  category: string
  timestamp: Date
  filters: ReportFilters
}

// ============================================================================
// Definição das Categorias (baseado no wireframe)
// ============================================================================

export const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'OPERATIONAL',
    title: 'Operação Assistencial',
    description: 'Relatórios de uso diário para operação',
    emoji: '🔴',
    color: 'border-red-500',
    items: [
      {
        id: 'daily-report',
        label: 'Relatório Diário',
        description: 'Visão completa do dia com todas as categorias',
        reportType: 'DAILY',
        badge: 'PDF • tela',
      },
      {
        id: 'shift-report',
        label: 'Relatórios por Plantão',
        description: 'Filtrar por turno',
        reportType: 'BY_SHIFT',
        badge: 'Selecionar',
      },
      {
        id: 'resident-report',
        label: 'Relatórios por Residente',
        description: 'Resumo assistencial consolidado por residente',
        reportType: 'BY_RESIDENT',
        badge: 'resumo',
      },
      {
        id: 'record-type-report',
        label: 'Relatórios por Tipo de Registro',
        description: 'Filtrar por categoria específica',
        reportType: 'BY_RECORD_TYPE',
        badge: 'filtrar',
      },
    ],
  },
  {
    id: 'COMPLIANCE',
    title: 'Segurança e Conformidade',
    description: 'Evidências para fiscalização e auditoria',
    emoji: '🟠',
    color: 'border-orange-500',
    items: [
      {
        id: 'sentinel-events',
        label: 'Eventos Sentinela',
        description: 'Relatório RDC com eventos críticos',
        reportType: 'SENTINEL_EVENTS',
        badge: 'RDC',
      },
      {
        id: 'incidents',
        label: 'Intercorrências',
        description: 'Todos os eventos e condutas tomadas',
        reportType: 'BY_RECORD_TYPE',
        badge: 'condutas',
        defaultFilters: { recordType: 'INTERCORRENCIA' },
      },
      {
        id: 'falls',
        label: 'Quedas',
        description: 'Registro de quedas e prevenção',
        reportType: 'BY_RECORD_TYPE',
        badge: 'ocorrências',
      },
      {
        id: 'medication-errors',
        label: 'Erros de Medicação',
        description: 'Auditoria de administração de medicamentos',
        reportType: 'BY_RECORD_TYPE',
        badge: 'auditoria',
        defaultFilters: { recordType: 'MEDICACAO' },
      },
    ],
  },
  {
    id: 'MANAGEMENT',
    title: 'Gestão Institucional',
    description: 'Indicadores para diretoria',
    emoji: '🔵',
    color: 'border-blue-500',
    items: [
      {
        id: 'monthly-indicators',
        label: 'Indicadores Mensais',
        description: 'Visão macro da operação',
        reportType: 'INSTITUTIONAL_MONTHLY',
        badge: 'visão macro',
      },
      {
        id: 'resident-profile',
        label: 'Perfil dos Residentes',
        description: 'Grau de dependência e características',
        reportType: 'BY_RESIDENT',
        badge: 'dependência',
      },
      {
        id: 'occupation-rate',
        label: 'Ocupação e Leitos',
        description: 'Taxa de ocupação e disponibilidade',
        reportType: 'INSTITUTIONAL_MONTHLY',
        badge: 'taxa',
      },
      {
        id: 'evolution',
        label: 'Evolução Assistencial',
        description: 'Tendências ao longo do tempo',
        reportType: 'INSTITUTIONAL_MONTHLY',
        badge: 'tendências',
      },
    ],
  },
  {
    id: 'DOCUMENTS',
    title: 'Documentos Operacionais',
    description: 'Documentos formais para impressão',
    emoji: '🟢',
    color: 'border-green-500',
    items: [
      {
        id: 'visit-sheet',
        label: 'Ficha de Visitas (residente)',
        description: 'Formulário de controle de visitas',
        reportType: 'BY_RESIDENT',
        badge: 'A4',
      },
      {
        id: 'resident-card',
        label: 'Cadastro do Residente',
        description: 'Ficha completa do residente',
        reportType: 'BY_RESIDENT',
        badge: 'PDF',
      },
      {
        id: 'resident-care-summary',
        label: 'Resumo Assistencial do Residente',
        description: 'Documento consolidado para consulta institucional',
        reportType: 'BY_RESIDENT',
        badge: 'PDF/Tela',
      },
      {
        id: 'resident-list',
        label: 'Lista de Residentes',
        description: 'Listagem geral',
        reportType: 'INSTITUTIONAL_MONTHLY',
        badge: 'PDF/CSV',
      },
      {
        id: 'maps-labels',
        label: 'Mapas e Etiquetas',
        description: 'Mapa de leitos e etiquetas',
        reportType: 'INSTITUTIONAL_MONTHLY',
        badge: 'impressão',
      },
    ],
  },
]
