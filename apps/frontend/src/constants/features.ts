/**
 * Mapeamento centralizado de features do sistema
 *
 * Este mapeamento serve como "Single Source of Truth" para features em todo o sistema:
 * - SuperAdmin: Edição de planos
 * - Register.tsx: Exibição de features durante cadastro
 * - Outros componentes que precisem listar features
 *
 * IMPORTANTE: Mapeamento bidirecional
 * - Chaves antigas do banco (snake_case) → Labels humanizados
 * - Labels humanizados → Labels humanizados (idempotência)
 *
 * Isso garante compatibilidade retroativa com dados existentes
 * enquanto permite adicionar features diretamente pelo label.
 */

/**
 * Mapeamento: chave técnica (banco) ↔ label humanizado (interface)
 */
export const FEATURES_MAP: Record<string, string> = {
  // ═══════════════════════════════════════════════════════════════
  // CHAVES TÉCNICAS (snake_case) → Labels Humanizados
  // ═══════════════════════════════════════════════════════════════

  // Core (sempre habilitadas)
  'residentes': 'Gestão de residentes',
  'usuarios': 'Gestão de usuários',
  'prontuario': 'Prontuário eletrônico',
  'notificacoes': 'Notificações',

  // Módulos clínicos
  'medicacoes': 'Prescrições e medicamentos',
  'sinais_vitais': 'Sinais vitais',
  'registros_diarios': 'Registros diários',
  'evolucoes_clinicas': 'Evoluções clínicas multiprofissionais',

  // Conformidade regulatória
  'conformidade': 'Hub de conformidade',
  'indicadores_mensais': 'Indicadores mensais obrigatórios',
  'eventos_sentinela': 'Eventos sentinela',
  'documentos_institucionais': 'Documentos institucionais',

  // Gestão e operações
  'agenda': 'Agenda de atividades',
  'quartos': 'Estrutura de Leitos',
  'mapa_leitos': 'Mapa de Ocupação',
  'pops': 'POPs (Procedimentos Operacionais Padrão)',
  'contratos': 'Contratos do residente',

  // Comunicação
  'mensagens': 'Mensagens internas',

  // ═══════════════════════════════════════════════════════════════
  // LABELS HUMANIZADOS (mapeamento idempotente)
  // ═══════════════════════════════════════════════════════════════

  // Core
  'Gestão de residentes': 'Gestão de residentes',
  'Gestão de usuários': 'Gestão de usuários',
  'Prontuário eletrônico': 'Prontuário eletrônico',
  'Notificações': 'Notificações',

  // Clínicos
  'Prescrições e medicamentos': 'Prescrições e medicamentos',
  'Sinais vitais': 'Sinais vitais',
  'Registros diários': 'Registros diários',
  'Evoluções clínicas multiprofissionais': 'Evoluções clínicas multiprofissionais',

  // Conformidade
  'Hub de conformidade': 'Hub de conformidade',
  'Indicadores mensais obrigatórios': 'Indicadores mensais obrigatórios',
  'Eventos sentinela': 'Eventos sentinela',
  'Documentos institucionais': 'Documentos institucionais',

  // Operações
  'Agenda de atividades': 'Agenda de atividades',
  'Estrutura de Leitos': 'Estrutura de Leitos',
  'Mapa de Ocupação': 'Mapa de Ocupação',
  'POPs (Procedimentos Operacionais Padrão)': 'POPs (Procedimentos Operacionais Padrão)',
  'Contratos do residente': 'Contratos do residente',

  // Comunicação
  'Mensagens internas': 'Mensagens internas',
}

/**
 * Features FIXAS - sempre habilitadas em TODOS os planos (não podem ser removidas)
 * Estas são as funcionalidades core do sistema
 */
export const CORE_FEATURES = [
  'Gestão de residentes',
  'Gestão de usuários',
  'Prontuário eletrônico',
  'Hub de conformidade',
  'Notificações',
] as const

/**
 * Lista de features disponíveis (labels humanizados) para seleção
 * Ordenadas por categoria e relevância
 *
 * ⚠️ IMPORTANTE: Incluir APENAS features que realmente existem no sistema
 */
export const AVAILABLE_FEATURES = [
  // ═══════════════════════════════════════════════════════════════
  // CORE (sempre habilitadas - não aparecem como opcionais)
  // ═══════════════════════════════════════════════════════════════
  'Gestão de residentes',
  'Gestão de usuários',
  'Prontuário eletrônico',
  'Hub de conformidade',
  'Notificações',

  // ═══════════════════════════════════════════════════════════════
  // MÓDULOS CLÍNICOS
  // ═══════════════════════════════════════════════════════════════
  'Prescrições e medicamentos',
  'Sinais vitais',
  'Registros diários',
  'Evoluções clínicas multiprofissionais',

  // ═══════════════════════════════════════════════════════════════
  // CONFORMIDADE REGULATÓRIA (RDC 502/2021)
  // ═══════════════════════════════════════════════════════════════
  'Indicadores mensais obrigatórios',
  'Eventos sentinela',
  'Documentos institucionais',

  // ═══════════════════════════════════════════════════════════════
  // GESTÃO E OPERAÇÕES
  // ═══════════════════════════════════════════════════════════════
  'Agenda de atividades',
  'Estrutura de Leitos',
  'Mapa de Ocupação',
  'POPs (Procedimentos Operacionais Padrão)',
  'Contratos do residente',

  // ═══════════════════════════════════════════════════════════════
  // COMUNICAÇÃO
  // ═══════════════════════════════════════════════════════════════
  'Mensagens internas',
] as const

/**
 * Converte objeto de features do banco (ex: {medicacoes: true, usuarios: true})
 * para array de labels humanizados (ex: ['Controle de medicamentos', 'Gestão de usuários'])
 *
 * @param featuresObj - Objeto de features do banco de dados
 * @returns Array de strings com labels humanizados
 */
export function featuresToArray(featuresObj: Record<string, any>): string[] {
  return Object.entries(featuresObj)
    .filter(([_, enabled]) => enabled === true)
    .map(([key]) => FEATURES_MAP[key] || key) // Usa mapeamento, fallback para key se não encontrado
}

/**
 * Converte array de labels humanizados para objeto de features do banco
 * (ex: ['Controle de medicamentos'] → {medicacoes: true})
 *
 * IMPORTANTE: Tenta encontrar a chave técnica correspondente.
 * Se não encontrar (feature customizada), usa o próprio label como chave.
 *
 * @param featuresArray - Array de strings com labels humanizados
 * @returns Objeto de features para salvar no banco
 */
export function arrayToFeatures(featuresArray: string[]): Record<string, boolean> {
  const result: Record<string, boolean> = {}

  featuresArray.forEach(label => {
    // Tentar encontrar chave técnica correspondente
    const technicalKey = Object.entries(FEATURES_MAP)
      .find(([key, value]) => value === label && !key.includes(' ')) // Encontra chave snake_case
      ?.[0]

    // Se encontrou chave técnica, usa ela. Senão, usa o próprio label (feature customizada)
    const key = technicalKey || label
    result[key] = true
  })

  return result
}
