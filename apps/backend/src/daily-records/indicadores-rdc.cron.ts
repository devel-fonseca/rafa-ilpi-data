import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { IndicadoresRdcService } from './indicadores-rdc.service';

/**
 * Serviço de cron job para cálculo automático dos indicadores RDC 502/2021.
 *
 * Executa diariamente às 02:00 (horário de baixo tráfego) para calcular
 * os indicadores do mês atual para todos os tenants ativos.
 */
@Injectable()
export class IndicadoresRdcCronService {
  private readonly logger = new Logger(IndicadoresRdcCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly indicadoresService: IndicadoresRdcService,
  ) {}

  /**
   * Executa diariamente às 02:00 (America/Sao_Paulo)
   * Calcula indicadores RDC do mês atual para todos os tenants
   */
  @Cron('0 2 * * *', {
    name: 'calculateRdcIndicators',
    timeZone: 'America/Sao_Paulo',
  })
  async calculateRdcIndicators(): Promise<void> {
    this.logger.log('Iniciando cálculo automático de indicadores RDC');

    try {
      // Buscar todos os tenants ativos
      const tenants = await this.prisma.tenant.findMany({
        where: {
          deletedAt: null,
          status: { in: ['TRIAL', 'ACTIVE'] }, // Apenas tenants ativos ou em trial
        },
        select: {
          id: true,
          name: true,
        },
      });

      this.logger.log(`Processando ${tenants.length} tenants`);

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // JavaScript months are 0-indexed

      let successCount = 0;
      let errorCount = 0;

      // Processar cada tenant sequencialmente para evitar sobrecarga do banco
      for (const tenant of tenants) {
        try {
          await this.indicadoresService.calculateMonthlyIndicators(
            tenant.id,
            year,
            month,
            undefined, // calculatedBy = system (undefined)
          );
          successCount++;
          this.logger.debug(`Indicadores calculados para tenant: ${tenant.name}`);
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Erro ao calcular indicadores para tenant ${tenant.name}`,
            {
              tenantId: tenant.id,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            },
          );
          // Continuar processando outros tenants mesmo se houver erro
        }
      }

      this.logger.log('Cálculo de indicadores RDC concluído', {
        totalTenants: tenants.length,
        success: successCount,
        errors: errorCount,
        year,
        month,
      });
    } catch (error) {
      this.logger.error('Erro crítico no cron de indicadores RDC', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Método manual para forçar recálculo de indicadores
   * Útil para recalcular meses anteriores ou corrigir dados
   */
  async manualCalculation(
    tenantId: string,
    year: number,
    month: number,
    calculatedBy: string,
  ): Promise<void> {
    this.logger.log('Cálculo manual de indicadores RDC solicitado', {
      tenantId,
      year,
      month,
      calculatedBy,
    });

    await this.indicadoresService.calculateMonthlyIndicators(
      tenantId,
      year,
      month,
      calculatedBy,
    );

    this.logger.log('Cálculo manual concluído', {
      tenantId,
      year,
      month,
    });
  }
}
