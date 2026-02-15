const FEATURE_KEY_BY_LABEL: Record<string, string> = {
  'Gestão de residentes': 'residentes',
  'Gestão de usuários': 'usuarios',
  'Prontuário eletrônico': 'prontuario',
  'Notificações': 'notificacoes',
  'Prescrições e medicamentos': 'medicacoes',
  'Sinais vitais': 'sinais_vitais',
  'Registros diários': 'registros_diarios',
  'Evoluções clínicas multiprofissionais': 'evolucoes_clinicas',
  'Hub de conformidade': 'conformidade',
  'Indicadores mensais obrigatórios': 'indicadores_mensais',
  'Eventos sentinela': 'eventos_sentinela',
  'Documentos institucionais': 'documentos_institucionais',
  Autodiagnóstico: 'autodiagnostico_rdc',
  'Autodiagnóstico RDC 502/2021': 'autodiagnostico_rdc',
  'Agenda de atividades': 'agenda',
  'Escalas e Plantões': 'escalas_plantoes',
  'Estrutura de Leitos': 'quartos',
  'Mapa de Ocupação': 'mapa_leitos',
  'Gestão de Leitos': 'gestao_leitos',
  'POPs (Procedimentos Operacionais Padrão)': 'pops',
  'Contratos do residente': 'contratos',
  'Financeiro Operacional': 'financeiro_operacional',
  Relatórios: 'relatorios',
  'Mensagens internas': 'mensagens',
};

export function normalizeFeatureKey(key: string): string {
  return FEATURE_KEY_BY_LABEL[key] || key;
}

export function normalizeFeatureRecord(
  features: Record<string, boolean> | null | undefined,
): Record<string, boolean> {
  if (!features) {
    return {};
  }

  const normalized: Record<string, boolean> = {};
  Object.entries(features).forEach(([key, value]) => {
    if (typeof value !== 'boolean') {
      return;
    }
    normalized[normalizeFeatureKey(key)] = value;
  });

  return normalized;
}
