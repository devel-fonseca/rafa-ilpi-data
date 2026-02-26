import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ACTIVE_STATUSES } from '../../payments/types/subscription-status.enum';
import { FinancialContractTransactionsService } from '../services/financial-contract-transactions.service';

@Injectable()
export class FinancialContractTransactionsJob {
  private readonly logger = new Logger(FinancialContractTransactionsJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contractTransactionsService: FinancialContractTransactionsService,
  ) {}

  /**
   * Sincroniza mensalidades de contratos diariamente.
   * Idempotente por tenant/contrato/competência/fonte.
   */
  @Cron('10 2 * * *', {
    name: 'financialContractTransactionsSync',
    timeZone: 'America/Sao_Paulo',
  })
  async syncCurrentCompetence(): Promise<void> {
    this.logger.log('Iniciando sincronização automática de mensalidades por contrato');

    try {
      const tenants = await this.prisma.tenant.findMany({
        where: {
          deletedAt: null,
          subscriptions: {
            some: {
              status: { in: ACTIVE_STATUSES },
            },
          },
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      let successCount = 0;
      let errorCount = 0;

      for (const tenant of tenants) {
        try {
          await this.contractTransactionsService.ensureForTenant({
            tenantId: tenant.id,
            strictCategory: false,
          });
          successCount++;
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Falha ao sincronizar mensalidades para tenant ${tenant.name} (${tenant.id})`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }

      this.logger.log(
        `Sincronização automática concluída. Tenants processados=${tenants.length}, sucesso=${successCount}, falhas=${errorCount}`,
      );
    } catch (error) {
      this.logger.error(
        'Erro crítico na sincronização automática de mensalidades',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
