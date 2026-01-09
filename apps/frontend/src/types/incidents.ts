/**
 * Tipos e enums para Gestão de Intercorrências RDC 502/2021
 */

// ==========================================
// ENUMS DE CATEGORIA E SEVERIDADE
// ==========================================

export enum IncidentCategory {
  CLINICA = 'CLINICA',
  ASSISTENCIAL = 'ASSISTENCIAL',
  ADMINISTRATIVA = 'ADMINISTRATIVA',
}

export enum IncidentSeverity {
  LEVE = 'LEVE',
  MODERADA = 'MODERADA',
  GRAVE = 'GRAVE',
  CRITICA = 'CRITICA',
}

// ==========================================
// SUBTIPOS CLÍNICOS
// ==========================================

export enum IncidentSubtypeClinical {
  // Eventos Sentinela
  QUEDA_COM_LESAO = 'QUEDA_COM_LESAO',
  TENTATIVA_SUICIDIO = 'TENTATIVA_SUICIDIO',

  // Indicadores RDC
  DOENCA_DIARREICA_AGUDA = 'DOENCA_DIARREICA_AGUDA',
  DESIDRATACAO = 'DESIDRATACAO',
  ULCERA_DECUBITO = 'ULCERA_DECUBITO',
  DESNUTRICAO = 'DESNUTRICAO',
  ESCABIOSE = 'ESCABIOSE',
  OBITO = 'OBITO',

  // Outras intercorrências clínicas
  QUEDA_SEM_LESAO = 'QUEDA_SEM_LESAO',
  FEBRE_HIPERTERMIA = 'FEBRE_HIPERTERMIA',
  HIPOTERMIA = 'HIPOTERMIA',
  HIPOGLICEMIA = 'HIPOGLICEMIA',
  HIPERGLICEMIA = 'HIPERGLICEMIA',
  CONVULSAO = 'CONVULSAO',
  ALTERACAO_CONSCIENCIA = 'ALTERACAO_CONSCIENCIA',
  DOR_TORACICA = 'DOR_TORACICA',
  DISPNEIA = 'DISPNEIA',
  VOMITO = 'VOMITO',
  SANGRAMENTO = 'SANGRAMENTO',
  REACAO_ALERGICA = 'REACAO_ALERGICA',
  OUTRA_CLINICA = 'OUTRA_CLINICA',
}

// ==========================================
// SUBTIPOS ASSISTENCIAIS
// ==========================================

export enum IncidentSubtypeAssistencial {
  ERRO_MEDICACAO = 'ERRO_MEDICACAO',
  RECUSA_MEDICACAO = 'RECUSA_MEDICACAO',
  RECUSA_ALIMENTACAO = 'RECUSA_ALIMENTACAO',
  RECUSA_HIGIENE = 'RECUSA_HIGIENE',
  RECUSA_BANHO = 'RECUSA_BANHO',
  AGITACAO_PSICOMOTORA = 'AGITACAO_PSICOMOTORA',
  AGRESSIVIDADE = 'AGRESSIVIDADE',
  FUGA_EVASAO = 'FUGA_EVASAO',
  PERDA_OBJETOS = 'PERDA_OBJETOS',
  DANO_EQUIPAMENTO = 'DANO_EQUIPAMENTO',
  OUTRA_ASSISTENCIAL = 'OUTRA_ASSISTENCIAL',
}

// ==========================================
// SUBTIPOS ADMINISTRATIVOS
// ==========================================

export enum IncidentSubtypeAdministrativa {
  AUSENCIA_PROFISSIONAL = 'AUSENCIA_PROFISSIONAL',
  FALTA_INSUMO = 'FALTA_INSUMO',
  FALTA_MEDICAMENTO = 'FALTA_MEDICAMENTO',
  EQUIPAMENTO_QUEBRADO = 'EQUIPAMENTO_QUEBRADO',
  PROBLEMA_INFRAESTRUTURA = 'PROBLEMA_INFRAESTRUTURA',
  RECLAMACAO_FAMILIAR = 'RECLAMACAO_FAMILIAR',
  CONFLITO_EQUIPE = 'CONFLITO_EQUIPE',
  OUTRA_ADMINISTRATIVA = 'OUTRA_ADMINISTRATIVA',
}

// ==========================================
// INDICADORES RDC
// ==========================================

export enum RdcIndicatorType {
  MORTALIDADE = 'MORTALIDADE',
  DIARREIA_AGUDA = 'DIARREIA_AGUDA',
  ESCABIOSE = 'ESCABIOSE',
  DESIDRATACAO = 'DESIDRATACAO',
  ULCERA_DECUBITO = 'ULCERA_DECUBITO',
  DESNUTRICAO = 'DESNUTRICAO',
}

// ==========================================
// LABELS TRADUZIDOS
// ==========================================

export const INCIDENT_CATEGORY_LABELS: Record<IncidentCategory, string> = {
  [IncidentCategory.CLINICA]: 'Intercorrência Clínica',
  [IncidentCategory.ASSISTENCIAL]: 'Intercorrência Assistencial',
  [IncidentCategory.ADMINISTRATIVA]: 'Intercorrência Administrativa',
};

export const INCIDENT_SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  [IncidentSeverity.LEVE]: 'Leve',
  [IncidentSeverity.MODERADA]: 'Moderada',
  [IncidentSeverity.GRAVE]: 'Grave',
  [IncidentSeverity.CRITICA]: 'Crítica',
};

export const INCIDENT_CLINICAL_LABELS: Record<
  IncidentSubtypeClinical,
  string
> = {
  [IncidentSubtypeClinical.QUEDA_COM_LESAO]:
    '🚨 Queda com Lesão (Evento Sentinela)',
  [IncidentSubtypeClinical.TENTATIVA_SUICIDIO]:
    '🚨 Tentativa de Suicídio (Evento Sentinela)',
  [IncidentSubtypeClinical.DOENCA_DIARREICA_AGUDA]:
    'Doença Diarréica Aguda (Indicador RDC)',
  [IncidentSubtypeClinical.DESIDRATACAO]: 'Desidratação (Indicador RDC)',
  [IncidentSubtypeClinical.ULCERA_DECUBITO]: 'Úlcera de Decúbito (Indicador RDC)',
  [IncidentSubtypeClinical.DESNUTRICAO]: 'Desnutrição (Indicador RDC)',
  [IncidentSubtypeClinical.ESCABIOSE]: 'Escabiose (Indicador RDC)',
  [IncidentSubtypeClinical.OBITO]: 'Óbito (Indicador RDC)',
  [IncidentSubtypeClinical.QUEDA_SEM_LESAO]: 'Queda sem Lesão',
  [IncidentSubtypeClinical.FEBRE_HIPERTERMIA]: 'Febre / Hipertermia',
  [IncidentSubtypeClinical.HIPOTERMIA]: 'Hipotermia',
  [IncidentSubtypeClinical.HIPOGLICEMIA]: 'Hipoglicemia',
  [IncidentSubtypeClinical.HIPERGLICEMIA]: 'Hiperglicemia',
  [IncidentSubtypeClinical.CONVULSAO]: 'Convulsão',
  [IncidentSubtypeClinical.ALTERACAO_CONSCIENCIA]: 'Alteração de Consciência',
  [IncidentSubtypeClinical.DOR_TORACICA]: 'Dor Torácica',
  [IncidentSubtypeClinical.DISPNEIA]: 'Dispneia (Falta de Ar)',
  [IncidentSubtypeClinical.VOMITO]: 'Vômito',
  [IncidentSubtypeClinical.SANGRAMENTO]: 'Sangramento',
  [IncidentSubtypeClinical.REACAO_ALERGICA]: 'Reação Alérgica',
  [IncidentSubtypeClinical.OUTRA_CLINICA]: 'Outra Intercorrência Clínica',
};

export const INCIDENT_ASSISTENCIAL_LABELS: Record<
  IncidentSubtypeAssistencial,
  string
> = {
  [IncidentSubtypeAssistencial.ERRO_MEDICACAO]: 'Erro de Medicação',
  [IncidentSubtypeAssistencial.RECUSA_MEDICACAO]: 'Recusa de Medicação',
  [IncidentSubtypeAssistencial.RECUSA_ALIMENTACAO]: 'Recusa de Alimentação',
  [IncidentSubtypeAssistencial.RECUSA_HIGIENE]: 'Recusa de Higiene',
  [IncidentSubtypeAssistencial.RECUSA_BANHO]: 'Recusa de Banho',
  [IncidentSubtypeAssistencial.AGITACAO_PSICOMOTORA]: 'Agitação Psicomotora',
  [IncidentSubtypeAssistencial.AGRESSIVIDADE]: 'Agressividade',
  [IncidentSubtypeAssistencial.FUGA_EVASAO]: 'Fuga / Evasão',
  [IncidentSubtypeAssistencial.PERDA_OBJETOS]: 'Perda de Objetos Pessoais',
  [IncidentSubtypeAssistencial.DANO_EQUIPAMENTO]: 'Dano a Equipamento',
  [IncidentSubtypeAssistencial.OUTRA_ASSISTENCIAL]:
    'Outra Intercorrência Assistencial',
};

export const INCIDENT_ADMINISTRATIVA_LABELS: Record<
  IncidentSubtypeAdministrativa,
  string
> = {
  [IncidentSubtypeAdministrativa.AUSENCIA_PROFISSIONAL]:
    'Ausência de Profissional',
  [IncidentSubtypeAdministrativa.FALTA_INSUMO]: 'Falta de Insumo',
  [IncidentSubtypeAdministrativa.FALTA_MEDICAMENTO]: 'Falta de Medicamento',
  [IncidentSubtypeAdministrativa.EQUIPAMENTO_QUEBRADO]:
    'Equipamento Quebrado/Danificado',
  [IncidentSubtypeAdministrativa.PROBLEMA_INFRAESTRUTURA]:
    'Problema de Infraestrutura',
  [IncidentSubtypeAdministrativa.RECLAMACAO_FAMILIAR]: 'Reclamação de Familiar',
  [IncidentSubtypeAdministrativa.CONFLITO_EQUIPE]: 'Conflito na Equipe',
  [IncidentSubtypeAdministrativa.OUTRA_ADMINISTRATIVA]:
    'Outra Intercorrência Administrativa',
};

export const RDC_INDICATOR_LABELS: Record<RdcIndicatorType, string> = {
  [RdcIndicatorType.MORTALIDADE]: 'Taxa de Mortalidade',
  [RdcIndicatorType.DIARREIA_AGUDA]: 'Taxa de Incidência de Doença Diarréica Aguda',
  [RdcIndicatorType.ESCABIOSE]: 'Taxa de Incidência de Escabiose',
  [RdcIndicatorType.DESIDRATACAO]: 'Taxa de Incidência de Desidratação',
  [RdcIndicatorType.ULCERA_DECUBITO]: 'Taxa de Prevalência de Úlcera de Decúbito',
  [RdcIndicatorType.DESNUTRICAO]: 'Taxa de Prevalência de Desnutrição',
};

// ==========================================
// CORES POR SEVERIDADE
// ==========================================

export const SEVERITY_COLORS = {
  [IncidentSeverity.LEVE]: {
    bg: 'bg-green-50 dark:bg-green-950',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    badge: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  },
  [IncidentSeverity.MODERADA]: {
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-800',
    badge: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  },
  [IncidentSeverity.GRAVE]: {
    bg: 'bg-orange-50 dark:bg-orange-950',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    badge: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
  },
  [IncidentSeverity.CRITICA]: {
    bg: 'bg-red-50 dark:bg-red-950',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    badge: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  },
};

// ==========================================
// HELPERS
// ==========================================

/**
 * Verifica se um subtipo clínico é Evento Sentinela
 */
export function isSentinelEvent(
  subtype: IncidentSubtypeClinical | null | undefined,
): boolean {
  if (!subtype) return false;
  return (
    subtype === IncidentSubtypeClinical.QUEDA_COM_LESAO ||
    subtype === IncidentSubtypeClinical.TENTATIVA_SUICIDIO
  );
}

/**
 * Retorna os subtipos disponíveis baseado na categoria selecionada
 */
export function getSubtypesByCategory(
  category: IncidentCategory,
): Array<{ value: string; label: string }> {
  switch (category) {
    case IncidentCategory.CLINICA:
      return Object.entries(INCIDENT_CLINICAL_LABELS).map(([value, label]) => ({
        value,
        label,
      }));
    case IncidentCategory.ASSISTENCIAL:
      return Object.entries(INCIDENT_ASSISTENCIAL_LABELS).map(
        ([value, label]) => ({
          value,
          label,
        }),
      );
    case IncidentCategory.ADMINISTRATIVA:
      return Object.entries(INCIDENT_ADMINISTRATIVA_LABELS).map(
        ([value, label]) => ({
          value,
          label,
        }),
      );
    default:
      return [];
  }
}

/**
 * Retorna o label do subtipo baseado na categoria
 */
export function getSubtypeLabel(
  category: IncidentCategory | null | undefined,
  subtype: string | null | undefined,
): string {
  if (!category || !subtype) return '';

  switch (category) {
    case IncidentCategory.CLINICA:
      return INCIDENT_CLINICAL_LABELS[subtype as IncidentSubtypeClinical] || subtype;
    case IncidentCategory.ASSISTENCIAL:
      return (
        INCIDENT_ASSISTENCIAL_LABELS[subtype as IncidentSubtypeAssistencial] ||
        subtype
      );
    case IncidentCategory.ADMINISTRATIVA:
      return (
        INCIDENT_ADMINISTRATIVA_LABELS[
          subtype as IncidentSubtypeAdministrativa
        ] || subtype
      );
    default:
      return subtype;
  }
}

// ==========================================
// TIPOS DE INTERFACE
// ==========================================

export interface IncidentMonthlyIndicator {
  id: string;
  tenantId: string;
  year: number;
  month: number;
  indicatorType: RdcIndicatorType;
  numerator: number;
  denominator: number;
  rate: number;
  incidentIds: string[];
  metadata?: any;
  calculatedAt: string;
  calculatedBy?: string;
}

export interface SentinelEventNotification {
  id: string;
  tenantId: string;
  dailyRecordId: string;
  notificationId: string;
  eventType: string;
  status: 'PENDENTE' | 'ENVIADO' | 'CONFIRMADO';
  protocolo?: string;
  dataEnvio?: string;
  dataConfirmacao?: string;
  responsavelEnvio?: string;
  emailEnviado: boolean;
  emailEnviadoEm?: string;
  emailDestinatarios?: string[];
  observacoes?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}
