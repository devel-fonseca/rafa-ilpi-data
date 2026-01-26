import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * TenantStatsRefreshJob
 *
 * Job responsável por atualizar cache de estatísticas dos tenants.
 * Resolve problema N+1 queries em TenantAdminService.findAll()
 *
 * Atualiza:
 * - usersCount: Quantidade de usuários ativos por tenant
 * - residentsCount: Quantidade de residentes ativos por tenant
 *
 * Execução: A cada 15 minutos (otimização: stats sempre frescos)
 */
@Injectable()
export class TenantStatsRefreshJob {
  private readonly logger = new Logger(TenantStatsRefreshJob.name)

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_30_MINUTES) // A cada 30 minutos
  async handleStatsRefresh() {
    this.logger.log('📊 Iniciando atualização de stats dos tenants...')

    try {
      // Buscar todos os tenants ativos
      const tenants = await this.prisma.tenant.findMany({
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          schemaName: true,
        },
      })

      this.logger.log(`📋 ${tenants.length} tenants encontrados`)

      let successCount = 0
      let errorCount = 0

      for (const tenant of tenants) {
        try {
          // Consultar counts nos schemas específicos
          const [usersResult, residentsResult] = await Promise.all([
            this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
              `SELECT COUNT(*) as count FROM "${tenant.schemaName}"."users" WHERE "deletedAt" IS NULL`
            ),
            this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
              `SELECT COUNT(*) as count FROM "${tenant.schemaName}"."residents" WHERE "deletedAt" IS NULL`
            ),
          ])

          const usersCount = Number(usersResult[0].count)
          const residentsCount = Number(residentsResult[0].count)

          // Upsert no cache de stats
          await this.prisma.tenantStats.upsert({
            where: {
              tenantId: tenant.id,
            },
            create: {
              tenantId: tenant.id,
              usersCount,
              residentsCount,
              lastUpdatedAt: new Date(),
            },
            update: {
              usersCount,
              residentsCount,
              lastUpdatedAt: new Date(),
            },
          })

          successCount++
        } catch (error) {
          this.logger.error(
            `❌ Erro ao atualizar stats do tenant ${tenant.id}:`,
            error
          )
          errorCount++
        }
      }

      this.logger.log(
        `✅ Atualização de stats concluída: ${successCount} success, ${errorCount} errors`
      )
    } catch (error) {
      this.logger.error('❌ Erro crítico ao atualizar stats dos tenants:', error)
    }
  }

  /**
   * Método manual para refresh imediato (útil após criar novo tenant)
   */
  async refreshTenantStats(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { schemaName: true },
    })

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} não encontrado`)
    }

    const [usersResult, residentsResult] = await Promise.all([
      this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*) as count FROM "${tenant.schemaName}"."users" WHERE "deletedAt" IS NULL`
      ),
      this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*) as count FROM "${tenant.schemaName}"."residents" WHERE "deletedAt" IS NULL`
      ),
    ])

    const usersCount = Number(usersResult[0].count)
    const residentsCount = Number(residentsResult[0].count)

    await this.prisma.tenantStats.upsert({
      where: {
        tenantId,
      },
      create: {
        tenantId,
        usersCount,
        residentsCount,
        lastUpdatedAt: new Date(),
      },
      update: {
        usersCount,
        residentsCount,
        lastUpdatedAt: new Date(),
      },
    })

    this.logger.log(`✅ Stats refreshed for tenant ${tenantId}`)
  }
}
