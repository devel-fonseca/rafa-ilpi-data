import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Health Indicator para validar integridade dos tenant schemas
 *
 * Valida:
 * - Existência de schemas PostgreSQL para cada tenant ativo
 * - Presença de tabelas críticas (residents, users, beds)
 * - Consistência entre registro em public.tenants e schema real
 *
 * Usado em /health/tenant-schemas para monitoramento proativo
 */
@Injectable()
export class TenantSchemasHealth {
  private readonly logger = new Logger(TenantSchemasHealth.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifica se schema PostgreSQL existe
   */
  private async schemaExists(schemaName: string): Promise<boolean> {
    const result = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = '${schemaName}'`,
    );
    return result.length > 0;
  }

  /**
   * Verifica se tabelas críticas existem no schema
   */
  private async criticalTablesExist(
    schemaName: string,
  ): Promise<{ table: string; exists: boolean }[]> {
    const criticalTables = ['residents', 'users', 'beds', 'rooms'];

    const checks = await Promise.all(
      criticalTables.map(async (table) => {
        const result = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schemaName}' AND table_name = '${table}'`,
        );
        return {
          table,
          exists: result.length > 0,
        };
      }),
    );

    return checks;
  }

  /**
   * Executa health check completo dos tenant schemas
   */
  async check(): Promise<{
    status: 'ok' | 'error';
    tenantsChecked: number;
    issues: string[];
    details?: any;
  }> {
    try {
      // Buscar tenants ativos
      const tenants = await this.prisma.tenant.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, schemaName: true },
      });

      const issues: string[] = [];
      const details: any[] = [];

      // Validar cada schema
      for (const tenant of tenants) {
        const tenantIssues: string[] = [];

        try {
          // 1. Verificar se schema existe
          const exists = await this.schemaExists(tenant.schemaName);

          if (!exists) {
            tenantIssues.push(`Schema ${tenant.schemaName} não existe`);
          } else {
            // 2. Verificar tabelas críticas
            const tableChecks = await this.criticalTablesExist(
              tenant.schemaName,
            );

            const missingTables = tableChecks
              .filter((check) => !check.exists)
              .map((check) => check.table);

            if (missingTables.length > 0) {
              tenantIssues.push(
                `Tabelas ausentes: ${missingTables.join(', ')}`,
              );
            }
          }
        } catch (error) {
          tenantIssues.push(`Erro ao validar: ${error.message}`);
        }

        // Adicionar ao relatório
        details.push({
          tenant: tenant.name,
          schema: tenant.schemaName,
          status: tenantIssues.length === 0 ? 'ok' : 'error',
          issues: tenantIssues,
        });

        if (tenantIssues.length > 0) {
          issues.push(`[${tenant.name}] ${tenantIssues.join('; ')}`);
        }
      }

      const status = issues.length === 0 ? 'ok' : 'error';

      if (status === 'error') {
        this.logger.error(`❌ Health check falhou para tenant schemas:`, {
          issues,
          details,
        });
      } else {
        this.logger.log(`✅ Health check OK para ${tenants.length} tenants`);
      }

      return {
        status,
        tenantsChecked: tenants.length,
        issues,
        details,
      };
    } catch (error) {
      this.logger.error('💥 Erro ao executar health check:', error);

      return {
        status: 'error',
        tenantsChecked: 0,
        issues: [`Erro fatal: ${error.message}`],
      };
    }
  }
}
