import { Injectable, Scope, Logger } from '@nestjs/common';
import { parseISO, addDays } from 'date-fns';
import { TenantContextService } from '../../prisma/tenant-context.service';
import { ShiftGenerationResult } from '../interfaces';
import { getCurrentDateInTz, formatDateOnly } from '../../utils/date.helpers';

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
   * @param daysAhead - Quantos dias à frente gerar (padrão: 14)
   * @param userId - ID do usuário que está gerando (para auditoria)
   * @returns Resultado da geração com contadores e detalhes
   */
  async generateShiftsFromPattern(
    daysAhead: number = 14,
    userId: string,
  ): Promise<ShiftGenerationResult> {
    const result: ShiftGenerationResult = {
      generated: 0,
      skipped: 0,
      errors: [],
      details: [],
    };

    try {
      // 1. Buscar padrão semanal ativo
      const pattern =
        await this.tenantContext.client.weeklySchedulePattern.findFirst({
          where: {
            isActive: true,
            deletedAt: null,
          },
          include: {
            assignments: {
              include: {
                shiftTemplate: true,
                team: {
                  select: {
                    id: true,
                    name: true,
                    isActive: true,
                    members: {
                      where: { removedAt: null },
                      select: { userId: true, role: true },
                    },
                  },
                },
              },
            },
          },
        });

      if (!pattern) {
        this.logger.warn(
          `[Tenant ${this.tenantContext.tenantId}] Nenhum padrão semanal ativo encontrado. Nenhum plantão gerado.`,
        );
        result.errors.push({
          date: '',
          shiftTemplateId: '',
          error: 'Nenhum padrão semanal ativo encontrado',
        });
        return result;
      }

      // 2. Buscar timezone do tenant
      const tenant = await this.tenantContext.client.tenant.findUnique({
        where: { id: this.tenantContext.tenantId },
        select: { timezone: true },
      });

      const timezone = tenant?.timezone || 'America/Sao_Paulo';

      // 3. Obter data atual no timezone do tenant
      const todayStr = getCurrentDateInTz(timezone);
      const today = parseISO(`${todayStr}T12:00:00.000Z`);

      // 4. Iterar sobre próximos N dias
      for (let i = 0; i < daysAhead; i++) {
        const targetDate = addDays(today, i);
        const dateStr = formatDateOnly(targetDate); // YYYY-MM-DD

        // Verificar se data está dentro do período do padrão
        // Converter Date do Prisma para string YYYY-MM-DD (conforme DATETIME_STANDARD.md)
        const patternStartDateStr = formatDateOnly(pattern.startDate as Date);
        const patternStartDate = parseISO(`${patternStartDateStr}T12:00:00.000`);

        if (pattern.endDate) {
          const patternEndDateStr = formatDateOnly(pattern.endDate as Date);
          const patternEndDate = parseISO(`${patternEndDateStr}T12:00:00.000`);
          if (targetDate > patternEndDate) {
            result.details.push({
              date: dateStr,
              shiftTemplateId: '',
              action: 'skipped',
              reason: 'Data fora do período do padrão semanal',
            });
            continue;
          }
        }
        if (targetDate < patternStartDate) {
          result.details.push({
            date: dateStr,
            shiftTemplateId: '',
            action: 'skipped',
            reason: 'Data anterior ao início do padrão semanal',
          });
          continue;
        }

        const dayOfWeek = targetDate.getDay(); // 0-6

        // 5. Calcular weekNumber para a data atual (suporte a padrões multi-semana)
        const weekNumber = this.calculateWeekNumber(
          targetDate,
          patternStartDate,
          pattern.numberOfWeeks,
        );

        // 6. Buscar assignments do padrão para este weekNumber + dia da semana
        const dayAssignments = pattern.assignments.filter(
          (a) => a.weekNumber === weekNumber && a.dayOfWeek === dayOfWeek,
        );

        // 6. Para cada assignment (turno):
        for (const assignment of dayAssignments) {
          try {
            const shiftTemplateId = assignment.shiftTemplateId;

            // Verificar se já existe plantão para esta data+turno
            const existing = await this.tenantContext.client.shift.findFirst({
              where: {
                date: dateStr,
                shiftTemplateId,
                deletedAt: null,
              },
            });

            if (existing) {
              // Não sobrescreve plantões existentes (preserva ajustes manuais)
              result.skipped++;
              result.details.push({
                date: dateStr,
                shiftTemplateId,
                action: 'skipped',
                reason: 'Plantão já existe (preservando ajuste manual)',
              });
              continue;
            }

            // Criar plantão
            const shift = await this.tenantContext.client.shift.create({
              data: {
                tenantId: this.tenantContext.tenantId,
                date: dateStr,
                shiftTemplateId,
                teamId: assignment.teamId,
                status: assignment.teamId ? 'CONFIRMED' : 'SCHEDULED',
                isFromPattern: true,
                patternId: pattern.id,
                createdBy: userId,
                versionNumber: 1,
              },
            });

            // Se tem equipe designada, criar assignments dos membros ativos
            if (assignment.teamId && assignment.team) {
              const team = assignment.team;

              // Apenas adicionar membros se equipe está ativa
              if (team.isActive) {
                for (const member of team.members) {
                  await this.tenantContext.client.shiftAssignment.create({
                    data: {
                      tenantId: this.tenantContext.tenantId,
                      shiftId: shift.id,
                      userId: member.userId,
                      isFromTeam: true,
                      assignedBy: userId,
                    },
                  });
                }
              }
            }

            result.generated++;
            result.details.push({
              date: dateStr,
              shiftTemplateId,
              action: 'generated',
              teamId: assignment.teamId || undefined,
            });
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            const errorStack = error instanceof Error ? error.stack : undefined;
            result.errors.push({
              date: dateStr,
              shiftTemplateId: assignment.shiftTemplateId,
              error: errorMessage,
            });
            this.logger.error(
              `Erro ao gerar plantão [${dateStr}] [${assignment.shiftTemplateId}]: ${errorMessage}`,
              errorStack,
            );
          }
        }
      }

      this.logger.log(
        `[Tenant ${this.tenantContext.tenantId}] Geração concluída: ${result.generated} gerados, ${result.skipped} pulados, ${result.errors.length} erros`,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Erro na geração de plantões [Tenant ${this.tenantContext.tenantId}]: ${errorMessage}`,
        errorStack,
      );
      result.errors.push({
        date: '',
        shiftTemplateId: '',
        error: errorMessage,
      });
    }

    return result;
  }

  /**
   * Calcula o número da semana dentro do ciclo do padrão
   *
   * @param date Data do plantão a ser gerado
   * @param patternStartDate Data de início do padrão
   * @param numberOfWeeks Número de semanas no ciclo (1-4)
   * @returns Número da semana (0 a numberOfWeeks-1)
   *
   * @example
   * // Padrão quinzenal (2 semanas) começando em 2026-01-19 (Domingo)
   * calculateWeekNumber(new Date('2026-01-19'), new Date('2026-01-19'), 2) // → 0 (semana 0)
   * calculateWeekNumber(new Date('2026-01-26'), new Date('2026-01-19'), 2) // → 1 (semana 1)
   * calculateWeekNumber(new Date('2026-02-02'), new Date('2026-01-19'), 2) // → 0 (reinicia ciclo)
   */
  private calculateWeekNumber(
    date: Date,
    patternStartDate: Date,
    numberOfWeeks: number,
  ): number {
    const daysSinceStart = Math.floor(
      (date.getTime() - patternStartDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const weeksSinceStart = Math.floor(daysSinceStart / 7);
    const weekNumber = weeksSinceStart % numberOfWeeks;

    return weekNumber;
  }
}
