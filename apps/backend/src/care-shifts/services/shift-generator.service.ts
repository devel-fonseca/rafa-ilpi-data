import { Injectable, Scope, Logger } from '@nestjs/common';
import { TenantContextService } from '../../prisma/tenant-context.service';
import { ShiftGenerationResult } from '../interfaces';

/**
 * Service para geração automática de plantões a partir do padrão semanal
 *
 * COMPORTAMENTO CRÍTICO:
 * - NÃO sobrescreve plantões existentes (preserva ajustes manuais)
 * - Gera plantões apenas para dias futuros
 * - Usa padrão semanal ativo do tenant
 */
@Injectable({ scope: Scope.REQUEST })
export class ShiftGeneratorService {
  private readonly logger = new Logger(ShiftGeneratorService.name);

  constructor(private readonly tenantContext: TenantContextService) {}

  /**
   * Gerar plantões automaticamente a partir do padrão semanal ativo
   *
   * DEPRECATED: Este método foi substituído por day assignments.
   * Mantido apenas para compatibilidade temporária.
   *
   * @param daysAhead - Quantos dias à frente gerar (padrão: 14)
   * @param userId - ID do usuário que está gerando (para auditoria)
   * @returns Resultado da geração com contadores e detalhes
   */
  async generateShiftsFromPattern(
    _daysAhead: number = 14,
    _userId: string,
  ): Promise<ShiftGenerationResult> {
    // DEPRECATED: WeeklySchedulePattern foi removido e substituído por day assignments
    this.logger.warn(
      `[Tenant ${this.tenantContext.tenantId}] generateShiftsFromPattern() está descontinuado. Use bulkCreate() no CareShiftsService.`,
    );

    const result: ShiftGenerationResult = {
      generated: 0,
      skipped: 0,
      errors: [
        {
          date: '',
          shiftTemplateId: '',
          error:
            'Método descontinuado. Use bulkCreate() para criar plantões em lote.',
        },
      ],
      details: [],
    };

    return result;
  }
}
