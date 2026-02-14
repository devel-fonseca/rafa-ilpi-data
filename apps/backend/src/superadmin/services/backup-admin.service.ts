import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import {
  createFullDatabaseBackup,
  createTenantDatabaseBackup,
  findDatabaseBackupById,
  listDatabaseBackups,
  restoreFullDatabaseBackupById,
  restoreTenantDatabaseBackupById,
  type BackupFileInfo,
  type RestoreResult,
} from '../utils/database-backup.util'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class BackupAdminService {
  private readonly logger = new Logger(BackupAdminService.name)
  constructor(private readonly prisma: PrismaService) {}

  async createFullBackup(): Promise<BackupFileInfo> {
    this.logger.log('Iniciando geração de backup full do banco de dados')
    const backup = await createFullDatabaseBackup()
    this.logger.log(
      `Backup full concluído: ${backup.fileName} (${backup.sizeBytes} bytes)`,
    )
    return backup
  }

  async createTenantBackup(tenantId: string): Promise<BackupFileInfo> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        schemaName: true,
      },
    })

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado')
    }

    this.logger.log(
      `Iniciando backup por tenant: ${tenant.id} (${tenant.schemaName})`,
    )

    const backup = await createTenantDatabaseBackup({
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSchemaName: tenant.schemaName,
    })

    this.logger.log(
      `Backup de tenant concluído: ${backup.fileName} (${backup.sizeBytes} bytes)`,
    )

    return backup
  }

  async listBackups(
    limit = 50,
    scope?: 'full' | 'tenant',
    tenantId?: string,
  ): Promise<BackupFileInfo[]> {
    return listDatabaseBackups({ limit, scope, tenantId })
  }

  async getBackupByIdOrThrow(id: string): Promise<BackupFileInfo> {
    const backup = await findDatabaseBackupById(id)
    if (!backup) {
      throw new NotFoundException('Backup não encontrado')
    }
    return backup
  }

  async restoreFullBackup(id: string): Promise<RestoreResult> {
    this.logger.warn(`Iniciando restore full do backup ${id}`)
    const result = await restoreFullDatabaseBackupById(id)
    this.logger.warn(
      `Restore full concluído para ${id} em ${result.durationMs}ms`,
    )
    return result
  }

  async restoreTenantBackup(id: string): Promise<RestoreResult> {
    const backup = await this.getBackupByIdOrThrow(id)
    if (backup.scope !== 'tenant') {
      throw new NotFoundException('Backup de tenant não encontrado')
    }

    const tenantId = backup.tenantId
    if (!tenantId) {
      throw new NotFoundException('Backup de tenant sem tenantId associado')
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        schemaName: true,
      },
    })

    if (!tenant) {
      throw new NotFoundException('Tenant associado ao backup não encontrado')
    }

    this.logger.warn(
      `Iniciando restore do tenant ${tenant.id} a partir do backup ${id}`,
    )

    const result = await restoreTenantDatabaseBackupById(id, tenant.schemaName)
    this.logger.warn(
      `Restore tenant concluído para backup ${id} em ${result.durationMs}ms`,
    )
    return result
  }
}
