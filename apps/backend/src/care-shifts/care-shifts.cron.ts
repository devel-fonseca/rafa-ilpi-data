import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { differenceInSeconds } from 'date-fns';
import { Prisma } from '@prisma/client';
import { ShiftGeneratorService } from './services';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';

/**
 * Cron Job para geração automática de plantões
 *
 * SCHEDULE: Diariamente às 02:00 AM (horário do servidor)
 * FUNÇÃO: Gera plantões dos próximos 14 dias com base no padrão semanal ativo
 * COMPORTAMENTO: NÃO sobrescreve plantões existentes (preserva ajustes manuais)
 */
@Injectable()
export class CareShiftsCron {
  private readonly logger = new Logger(CareShiftsCron.name);
  private isRunning = false; // Previne execuções concorrentes

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Cron job principal - Executa diariamente às 02:00 AM
   *
   * Cron Expression: '0 2 * * *'
   * - 0: minuto 0
   * - 2: hora 2 (02:00 AM)
   * - *: todos os dias do mês
   * - *: todos os meses
   * - *: todos os dias da semana
   */
  @Cron('0 2 * * *', {
    name: 'generate-care-shifts',
    timeZone: 'America/Sao_Paulo', // GMT-3
  })
  async handleDailyShiftGeneration() {
    // Prevenir execuções concorrentes
    if (this.isRunning) {
      this.logger.warn(
        '[Cron] Geração anterior ainda em andamento. Pulando execução.',
      );
      return;
    }

    this.isRunning = true;
    const startTime = new Date();

    this.logger.log(
      '╔══════════════════════════════════════════════════════════════╗',
    );
    this.logger.log(
      '║  🕐 CRON JOB: Geração Automática de Plantões (02:00 AM)    ║',
    );
    this.logger.log(
      '╚══════════════════════════════════════════════════════════════╝',
    );

    try {
      // 1. Buscar todos os tenants ativos
      const tenants = await this.prisma.tenant.findMany({
        where: {
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          schemaName: true,
        },
      });

      if (tenants.length === 0) {
        this.logger.warn('[Cron] Nenhum tenant ativo encontrado.');
        return;
      }

      this.logger.log(`[Cron] Processando ${tenants.length} tenant(s)...`);

      let totalGenerated = 0;
      let totalSkipped = 0;
      let totalErrors = 0;
      const tenantResults: Array<{
        tenantId: string;
        tenantName: string;
        generated: number;
        skipped: number;
        errors: number;
        success: boolean;
      }> = [];

      // 2. Para cada tenant, gerar plantões no seu schema
      for (const tenant of tenants) {
        try {
          this.logger.log(
            `[Cron] [${tenant.name}] Iniciando geração de plantões...`,
          );

          // Criar ShiftGeneratorService com contexto do tenant
          // Nota: ShiftGeneratorService é REQUEST-scoped, mas aqui estamos em contexto global
          // Vamos usar o PrismaService diretamente com schema switching
          const generator = await this.createGeneratorForTenant(tenant.schemaName);

          // Gerar plantões (próximos 14 dias)
          const result = await generator.generateShiftsFromPattern(14, 'SYSTEM');

          totalGenerated += result.generated;
          totalSkipped += result.skipped;
          totalErrors += result.errors.length;

          tenantResults.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            generated: result.generated,
            skipped: result.skipped,
            errors: result.errors.length,
            success: result.errors.length === 0,
          });

          if (result.errors.length > 0) {
            this.logger.error(
              `[Cron] [${tenant.name}] ${result.errors.length} erro(s) durante geração:`,
            );
            result.errors.forEach((error) => {
              this.logger.error(
                `  - ${error.date} [${error.shiftTemplateId}]: ${error.error}`,
              );
            });
          }

          this.logger.log(
            `[Cron] [${tenant.name}] ✅ Geração concluída: ${result.generated} gerados, ${result.skipped} pulados`,
          );
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          const errorStack = error instanceof Error ? error.stack : undefined;
          totalErrors++;
          tenantResults.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            generated: 0,
            skipped: 0,
            errors: 1,
            success: false,
          });

          this.logger.error(
            `[Cron] [${tenant.name}] ❌ Erro crítico na geração: ${errorMessage}`,
            errorStack,
          );
        }
      }

      // 3. Resumo final
      const duration = differenceInSeconds(new Date(), startTime).toFixed(2);

      this.logger.log(
        '╔══════════════════════════════════════════════════════════════╗',
      );
      this.logger.log(
        '║  📊 RESUMO DA GERAÇÃO AUTOMÁTICA                            ║',
      );
      this.logger.log(
        '╚══════════════════════════════════════════════════════════════╝',
      );
      this.logger.log(`   Tenants processados: ${tenants.length}`);
      this.logger.log(`   Plantões gerados: ${totalGenerated}`);
      this.logger.log(`   Plantões pulados: ${totalSkipped}`);
      this.logger.log(`   Erros: ${totalErrors}`);
      this.logger.log(`   Duração: ${duration}s`);
      this.logger.log(
        '──────────────────────────────────────────────────────────────',
      );

      // Log detalhado por tenant
      tenantResults.forEach((result) => {
        const status = result.success ? '✅' : '❌';
        this.logger.log(
          `   ${status} [${result.tenantName}] Gerados: ${result.generated}, Pulados: ${result.skipped}, Erros: ${result.errors}`,
        );
      });

      this.logger.log(
        '══════════════════════════════════════════════════════════════',
      );

      // 4. Alertar se houve muitos erros
      if (totalErrors > tenants.length * 0.5) {
        this.logger.error(
          `[Cron] ⚠️ ALERTA: Mais de 50% dos tenants tiveram erros na geração!`,
        );
        // TODO: Enviar notificação para administradores do sistema
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `[Cron] ❌ Erro fatal no cron job: ${errorMessage}`,
        errorStack,
      );
      // TODO: Enviar notificação crítica para administradores
    } finally {
      this.isRunning = false;
      const duration = differenceInSeconds(new Date(), startTime).toFixed(2);
      this.logger.log(
        `[Cron] 🏁 Execução finalizada em ${duration}s. Próxima execução: amanhã às 02:00 AM`,
      );
    }
  }

  /**
   * Método auxiliar para criar ShiftGeneratorService para um tenant específico
   */
  private async createGeneratorForTenant(
    schemaName: string,
  ): Promise<ShiftGeneratorService> {
    // Criar um Prisma Client específico para este schema
    const tenantClient = this.prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            // Executar queries no schema do tenant
            const [, result] = await this.prisma.$transaction([
              this.prisma.$executeRawUnsafe(`SET search_path TO "${schemaName}"`),
              query(args),
            ]);
            return result;
          },
        },
      },
    });

    // Criar TenantContextService mockado
    const tenantContext = {
      client: tenantClient,
      tenantId: schemaName, // Usamos schemaName como ID temporário
    } as unknown as TenantContextService;

    return new ShiftGeneratorService(tenantContext);
  }

  /**
   * Método auxiliar para executar geração manual (via endpoint ou testes)
   * NÃO é um cron job, usado apenas para testes ou execução forçada
   */
  async executeManualGeneration(tenantId?: string): Promise<{
    totalGenerated: number;
    totalSkipped: number;
    totalErrors: number;
    tenants: number;
  }> {
    this.logger.log('[Manual] Executando geração manual de plantões...');

    const where: Prisma.TenantWhereInput = {
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (tenantId) {
      where.id = tenantId;
    }

    const tenants = await this.prisma.tenant.findMany({
      where,
      select: {
        id: true,
        name: true,
        schemaName: true,
      },
    });

    let totalGenerated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const tenant of tenants) {
      try {
        const generator = await this.createGeneratorForTenant(tenant.schemaName);
        const result = await generator.generateShiftsFromPattern(14, 'MANUAL');

        totalGenerated += result.generated;
        totalSkipped += result.skipped;
        totalErrors += result.errors.length;

        this.logger.log(
          `[Manual] [${tenant.name}] ${result.generated} gerados, ${result.skipped} pulados`,
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        totalErrors++;
        this.logger.error(
          `[Manual] [${tenant.name}] Erro: ${errorMessage}`,
        );
      }
    }

    return {
      totalGenerated,
      totalSkipped,
      totalErrors,
      tenants: tenants.length,
    };
  }
}
