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
  // CHAVES ANTIGAS (compatibilidade retroativa com banco de dados)
  // ═══════════════════════════════════════════════════════════════
  'residentes': 'Gestão de residentes',
  'usuarios': 'Gestão de usuários',
  'prontuario': 'Prontuário eletrônico',
  'medicacoes': 'Controle de medicamentos',
  'sinais_vitais': 'Sinais vitais',
  'alertas': 'Alertas e notificações',
  'relatorios': 'Relatórios e dashboards',
  'quartos': 'Gestão de quartos/leitos',
  'financeiro': 'Controle financeiro',
  'whatsapp': 'Integração com WhatsApp',
  'versoes': 'Histórico de versões',
  'backup': 'Backup automático',
  'suporte': 'Suporte prioritário',
  'treinamento': 'Treinamento incluído',

  // ═══════════════════════════════════════════════════════════════
  // LABELS MODERNOS (mapeamento idempotente)
  // ═══════════════════════════════════════════════════════════════
  'Gestão de residentes': 'Gestão de residentes',
  'Gestão de usuários': 'Gestão de usuários',
  'Prontuário eletrônico': 'Prontuário eletrônico',
  'Controle de medicamentos': 'Controle de medicamentos',
  'Sinais vitais': 'Sinais vitais',
  'Alertas e notificações': 'Alertas e notificações',
  'Relatórios e dashboards': 'Relatórios e dashboards',
  'Gestão de quartos/leitos': 'Gestão de quartos/leitos',
  'Controle financeiro': 'Controle financeiro',
  'Integração com WhatsApp': 'Integração com WhatsApp',
  'Histórico de versões': 'Histórico de versões',
  'Backup automático': 'Backup automático',
  'Suporte prioritário': 'Suporte prioritário',
  'Treinamento incluído': 'Treinamento incluído',
}

/**
 * Lista de features disponíveis (labels humanizados) para seleção
 * Ordenadas por categoria e relevância
 */
export const AVAILABLE_FEATURES = [
  // Core features
  'Gestão de residentes',
  'Gestão de usuários',
  'Prontuário eletrônico',

  // Módulos clínicos
  'Controle de medicamentos',
  'Sinais vitais',

  // Gestão e operações
  'Gestão de quartos/leitos',
  'Controle financeiro',
  'Relatórios e dashboards',

  // Comunicação e alertas
  'Alertas e notificações',
  'Integração com WhatsApp',

  // Recursos avançados
  'Histórico de versões',
  'Backup automático',

  // Suporte
  'Suporte prioritário',
  'Treinamento incluído',
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
