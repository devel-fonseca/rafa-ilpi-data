import {
  IncidentSubtypeClinical,
  IncidentSubtypeAssistencial,
  IncidentSubtypeAdministrativa,
} from '@prisma/client';

/**
 * Mapeia os valores dos enums de subtipos de intercorrências para textos amigáveis
 * Usado para exibir notificações e mensagens aos usuários
 *
 * IMPORTANTE: Labels sincronizados com /apps/frontend/src/types/incidents.ts
 */

// Subtipos Clínicos (sincronizado com frontend)
export const clinicalSubtypeLabels: Record<IncidentSubtypeClinical, string> = {
  // Eventos Sentinela
  QUEDA_COM_LESAO: '🚨 Queda com Lesão (Evento Sentinela)',
  TENTATIVA_SUICIDIO: '🚨 Tentativa de Suicídio (Evento Sentinela)',

  // Indicadores RDC
  DOENCA_DIARREICA_AGUDA: 'Doença Diarréica Aguda (Indicador RDC)',
  DESIDRATACAO: 'Desidratação (Indicador RDC)',
  ULCERA_DECUBITO: 'Úlcera de Decúbito (Indicador RDC)',
  DESNUTRICAO: 'Desnutrição (Indicador RDC)',
  ESCABIOSE: 'Escabiose (Indicador RDC)',
  OBITO: 'Óbito (Indicador RDC)',

  // Outras intercorrências clínicas
  QUEDA_SEM_LESAO: 'Queda sem Lesão',
  FEBRE_HIPERTERMIA: 'Febre / Hipertermia',
  HIPOTERMIA: 'Hipotermia',
  HIPOGLICEMIA: 'Hipoglicemia',
  HIPERGLICEMIA: 'Hiperglicemia',
  CONVULSAO: 'Convulsão',
  ALTERACAO_CONSCIENCIA: 'Alteração de Consciência',
  DOR_TORACICA: 'Dor Torácica',
  DISPNEIA: 'Dispneia (Falta de Ar)',
  VOMITO: 'Vômito',
  SANGRAMENTO: 'Sangramento',
  REACAO_ALERGICA: 'Reação Alérgica',
  OUTRA_CLINICA: 'Outra Intercorrência Clínica',
};

// Subtipos Assistenciais (sincronizado com frontend)
export const assistentialSubtypeLabels: Record<IncidentSubtypeAssistencial, string> = {
  ERRO_MEDICACAO: 'Erro de Medicação',
  RECUSA_MEDICACAO: 'Recusa de Medicação',
  RECUSA_ALIMENTACAO: 'Recusa de Alimentação',
  RECUSA_HIGIENE: 'Recusa de Higiene',
  RECUSA_BANHO: 'Recusa de Banho',
  AGITACAO_PSICOMOTORA: 'Agitação Psicomotora',
  AGRESSIVIDADE: 'Agressividade',
  FUGA_EVASAO: 'Fuga / Evasão',
  PERDA_OBJETOS: 'Perda de Objetos Pessoais',
  DANO_EQUIPAMENTO: 'Dano a Equipamento',
  OUTRA_ASSISTENCIAL: 'Outra Intercorrência Assistencial',
};

// Subtipos Administrativos (sincronizado com frontend)
export const administrativeSubtypeLabels: Record<IncidentSubtypeAdministrativa, string> = {
  AUSENCIA_PROFISSIONAL: 'Ausência de Profissional',
  FALTA_INSUMO: 'Falta de Insumo',
  FALTA_MEDICAMENTO: 'Falta de Medicamento',
  EQUIPAMENTO_QUEBRADO: 'Equipamento Quebrado/Danificado',
  PROBLEMA_INFRAESTRUTURA: 'Problema de Infraestrutura',
  RECLAMACAO_FAMILIAR: 'Reclamação de Familiar',
  CONFLITO_EQUIPE: 'Conflito na Equipe',
  OUTRA_ADMINISTRATIVA: 'Outra Intercorrência Administrativa',
};

/**
 * Formata o subtipo de intercorrência para exibição amigável
 * @param subtypeClinical - Subtipo clínico (opcional)
 * @param subtypeAssist - Subtipo assistencial (opcional)
 * @param subtypeAdmin - Subtipo administrativo (opcional)
 * @returns Texto formatado ou 'Intercorrência registrada' se nenhum subtipo foi fornecido
 */
export function formatIncidentSubtype(
  subtypeClinical?: IncidentSubtypeClinical,
  subtypeAssist?: IncidentSubtypeAssistencial,
  subtypeAdmin?: IncidentSubtypeAdministrativa,
): string {
  if (subtypeClinical) {
    return clinicalSubtypeLabels[subtypeClinical] || subtypeClinical;
  }

  if (subtypeAssist) {
    return assistentialSubtypeLabels[subtypeAssist] || subtypeAssist;
  }

  if (subtypeAdmin) {
    return administrativeSubtypeLabels[subtypeAdmin] || subtypeAdmin;
  }

  return 'Intercorrência registrada';
}
