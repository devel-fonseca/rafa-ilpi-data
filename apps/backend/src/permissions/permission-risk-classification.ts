/**
 * Classificação de Risco de Permissões
 *
 * Define quais permissões são consideradas de alto risco e exigem
 * reautenticação antes de execução.
 *
 * @module PermissionRiskClassification
 */

import { PermissionType } from '@prisma/client';

/**
 * Níveis de risco de permissões
 */
export enum PermissionRiskLevel {
  LOW = 'LOW', // Visualização, criação básica
  MEDIUM = 'MEDIUM', // Edições, uploads
  HIGH = 'HIGH', // Exclusões, exportações sensíveis
  CRITICAL = 'CRITICAL', // Gestão de usuários, configurações
}

/**
 * Conjunto de permissões de alto risco
 *
 * Ações que exigem reautenticação antes de execução.
 * Baseado em análise de impacto clínico, legal e operacional.
 *
 * **Critérios para inclusão:**
 * - Ações destrutivas e irreversíveis
 * - Exportação de dados sensíveis em massa
 * - Alterações estruturais do sistema
 * - Gestão de controle de acesso
 * - Publicação de documentos normativos
 *
 * **Total: 20 permissões de alto risco**
 */
export const HIGH_RISK_PERMISSIONS: ReadonlySet<PermissionType> = new Set([
  // ───────────────────────────────────────────────────────────────────────
  // 🗑️ EXCLUSÕES PERMANENTES (8 permissões)
  // ───────────────────────────────────────────────────────────────────────
  PermissionType.DELETE_RESIDENTS, // Remove residente e TODOS seus dados
  PermissionType.DELETE_PRESCRIPTIONS, // Remove histórico de medicação
  PermissionType.DELETE_VACCINATIONS, // Perde registro de imunização
  PermissionType.DELETE_CLINICAL_NOTES, // Remove evoluções clínicas (doc legal)
  PermissionType.DELETE_ALLERGIES, // Remove info crítica de segurança
  PermissionType.DELETE_CONDITIONS, // Remove histórico de condições crônicas
  PermissionType.DELETE_DIETARY_RESTRICTIONS, // Remove restrições alimentares
  PermissionType.DELETE_DOCUMENTS, // Remove documentos originais digitalizados

  // ───────────────────────────────────────────────────────────────────────
  // 📤 EXPORTAÇÕES SENSÍVEIS (2 permissões)
  // ───────────────────────────────────────────────────────────────────────
  PermissionType.EXPORT_DATA, // Exporta dados sensíveis em massa (risco LGPD)
  PermissionType.VIEW_AUDIT_LOGS, // Acesso a histórico completo de ações

  // ───────────────────────────────────────────────────────────────────────
  // 🔧 ALTERAÇÕES ESTRUTURAIS (5 permissões)
  // ───────────────────────────────────────────────────────────────────────
  PermissionType.DELETE_USERS, // Remove usuário do sistema
  PermissionType.MANAGE_PERMISSIONS, // Altera controle de acesso
  PermissionType.DELETE_CONTRACTS, // Remove contrato digitalizado (doc legal)
  PermissionType.MANAGE_INFRASTRUCTURE, // Altera estrutura física (prédios, andares, quartos)
  PermissionType.UPDATE_INSTITUTIONAL_SETTINGS, // Altera configurações globais

  // ───────────────────────────────────────────────────────────────────────
  // 📋 GESTÃO CRÍTICA (5 permissões)
  // ───────────────────────────────────────────────────────────────────────
  PermissionType.PUBLISH_POPS, // Publica POP que afeta operações institucionais
  PermissionType.DELETE_POPS, // Remove procedimento operacional
  PermissionType.DELETE_CARE_SHIFTS, // Remove escala de plantão
  PermissionType.MANAGE_COMPLIANCE_ASSESSMENT, // Altera autodiagnóstico RDC 502/2021
  PermissionType.DELETE_DAILY_RECORDS, // Remove registro de cuidado diário

  // ───────────────────────────────────────────────────────────────────────
  // 💊 MEDICAMENTOS CONTROLADOS (OPCIONAL - documentado, mas não ativo)
  // ───────────────────────────────────────────────────────────────────────
  // PermissionType.ADMINISTER_CONTROLLED_MEDICATIONS,
  //
  // **Motivo para não incluir inicialmente:**
  // - Requer fluxo específico de dispensação
  // - Pode impactar urgências (demora na autenticação)
  // - Sistema já tem double-check (prescrição médica + administração)
  //
  // **Quando considerar ativar:**
  // - Se houver problemas de rastreabilidade
  // - Se ANVISA exigir controle adicional
  // - Se houver casos de desvio de medicamentos
  //
  // **Alternativa atual:**
  // - Auditoria rigorosa de todas administrações
  // - Alertas automáticos para padrões suspeitos
  // - Revisão mensal por farmacêutico responsável
  // ───────────────────────────────────────────────────────────────────────
]);

/**
 * Verifica se uma permissão é de alto risco
 *
 * @param permission Permissão a verificar
 * @returns true se a permissão exige reautenticação
 *
 * @example
 * ```typescript
 * if (isHighRiskPermission(PermissionType.DELETE_RESIDENTS)) {
 *   // Exige reautenticação
 * }
 * ```
 */
export function isHighRiskPermission(permission: PermissionType): boolean {
  return HIGH_RISK_PERMISSIONS.has(permission);
}

/**
 * Obtém o nível de risco de uma permissão
 *
 * **Classificação automática baseada em prefixo:**
 * - DELETE_* ou MANAGE_PERMISSIONS ou PUBLISH_POPS = CRITICAL
 * - EXPORT_DATA, VIEW_AUDIT_LOGS, etc. = HIGH
 * - CREATE_*, UPDATE_*, MANAGE_* = MEDIUM
 * - VIEW_* = LOW
 *
 * @param permission Permissão a classificar
 * @returns Nível de risco da permissão
 *
 * @example
 * ```typescript
 * const risk = getPermissionRiskLevel(PermissionType.DELETE_RESIDENTS);
 * console.log(risk); // PermissionRiskLevel.CRITICAL
 * ```
 */
export function getPermissionRiskLevel(
  permission: PermissionType,
): PermissionRiskLevel {
  if (HIGH_RISK_PERMISSIONS.has(permission)) {
    // Exclusões e gestão crítica = CRITICAL
    if (
      permission.startsWith('DELETE_') ||
      permission === PermissionType.MANAGE_PERMISSIONS ||
      permission === PermissionType.PUBLISH_POPS ||
      permission === PermissionType.MANAGE_COMPLIANCE_ASSESSMENT
    ) {
      return PermissionRiskLevel.CRITICAL;
    }
    return PermissionRiskLevel.HIGH;
  }

  // Criações e edições = MEDIUM
  if (
    permission.startsWith('CREATE_') ||
    permission.startsWith('UPDATE_') ||
    permission.startsWith('MANAGE_')
  ) {
    return PermissionRiskLevel.MEDIUM;
  }

  // Visualizações = LOW
  return PermissionRiskLevel.LOW;
}

/**
 * Obtém descrição do motivo pelo qual uma permissão é de alto risco
 *
 * @param permission Permissão a descrever
 * @returns Descrição do risco ou null se não for alto risco
 *
 * @example
 * ```typescript
 * const reason = getHighRiskReason(PermissionType.DELETE_RESIDENTS);
 * console.log(reason);
 * // "Exclusão permanente: Remove residente e todos os dados associados"
 * ```
 */
export function getHighRiskReason(
  permission: PermissionType,
): string | null {
  if (!HIGH_RISK_PERMISSIONS.has(permission)) {
    return null;
  }

  const reasons: Partial<Record<PermissionType, string>> = {
    [PermissionType.DELETE_RESIDENTS]:
      'Exclusão permanente: Remove residente e todos os dados associados',
    [PermissionType.DELETE_PRESCRIPTIONS]:
      'Exclusão permanente: Remove histórico de medicação',
    [PermissionType.DELETE_VACCINATIONS]:
      'Exclusão permanente: Perde registro de imunização',
    [PermissionType.DELETE_CLINICAL_NOTES]:
      'Exclusão permanente: Remove documento médico-legal',
    [PermissionType.DELETE_ALLERGIES]:
      'Exclusão permanente: Remove informação crítica de segurança',
    [PermissionType.DELETE_CONDITIONS]:
      'Exclusão permanente: Remove histórico de condições crônicas',
    [PermissionType.DELETE_DIETARY_RESTRICTIONS]:
      'Exclusão permanente: Remove restrições alimentares',
    [PermissionType.DELETE_DOCUMENTS]:
      'Exclusão permanente: Remove documento original digitalizado',
    [PermissionType.EXPORT_DATA]:
      'Exportação sensível: Dados de saúde protegidos pela LGPD',
    [PermissionType.VIEW_AUDIT_LOGS]:
      'Acesso sensível: Histórico completo de ações do sistema',
    [PermissionType.DELETE_USERS]:
      'Exclusão permanente: Remove usuário e histórico de ações',
    [PermissionType.MANAGE_PERMISSIONS]:
      'Alteração crítica: Modifica controle de acesso ao sistema',
    [PermissionType.DELETE_CONTRACTS]:
      'Exclusão permanente: Remove documento contratual legal',
    [PermissionType.MANAGE_INFRASTRUCTURE]:
      'Alteração estrutural: Modifica organização física da instituição',
    [PermissionType.UPDATE_INSTITUTIONAL_SETTINGS]:
      'Alteração crítica: Modifica configurações globais do sistema',
    [PermissionType.PUBLISH_POPS]:
      'Publicação crítica: Ativa procedimento que afeta operações',
    [PermissionType.DELETE_POPS]:
      'Exclusão permanente: Remove procedimento operacional padrão',
    [PermissionType.DELETE_CARE_SHIFTS]:
      'Exclusão crítica: Remove escala de cobertura de cuidados',
    [PermissionType.MANAGE_COMPLIANCE_ASSESSMENT]:
      'Alteração regulatória: Modifica autodiagnóstico ANVISA RDC 502/2021',
    [PermissionType.DELETE_DAILY_RECORDS]:
      'Exclusão permanente: Remove registro de prestação de serviço',
  };

  return reasons[permission] || 'Ação de alto risco que requer confirmação';
}

/**
 * Obtém estatísticas sobre permissões de alto risco
 *
 * @returns Objeto com contagens por nível de risco
 *
 * @example
 * ```typescript
 * const stats = getHighRiskStatistics();
 * console.log(stats);
 * // { total: 20, critical: 13, high: 7, medium: 0, low: 0 }
 * ```
 */
export function getHighRiskStatistics() {
  const stats = {
    total: HIGH_RISK_PERMISSIONS.size,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  HIGH_RISK_PERMISSIONS.forEach((permission) => {
    const level = getPermissionRiskLevel(permission);
    stats[level.toLowerCase() as keyof typeof stats]++;
  });

  return stats;
}
