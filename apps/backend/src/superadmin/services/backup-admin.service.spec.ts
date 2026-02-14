import { NotFoundException } from '@nestjs/common'
import { BackupAdminService } from './backup-admin.service'

jest.mock('../utils/database-backup.util', () => ({
  createFullDatabaseBackup: jest.fn(),
  createTenantDatabaseBackup: jest.fn(),
  findDatabaseBackupById: jest.fn(),
  listDatabaseBackups: jest.fn(),
  restoreFullDatabaseBackupById: jest.fn(),
  restoreTenantDatabaseBackupById: jest.fn(),
}))

import {
  createFullDatabaseBackup,
  createTenantDatabaseBackup,
  findDatabaseBackupById,
  listDatabaseBackups,
  restoreFullDatabaseBackupById,
  restoreTenantDatabaseBackupById,
} from '../utils/database-backup.util'

describe('BackupAdminService', () => {
  let service: BackupAdminService

  const prismaMock = {
    tenant: {
      findUnique: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    service = new BackupAdminService(prismaMock as never)
  })

  it('createFullBackup should delegate to util', async () => {
    ;(createFullDatabaseBackup as jest.Mock).mockResolvedValue({
      id: 'full_1',
      fileName: 'full_1.sql',
      filePath: '/tmp/full_1.sql',
      scope: 'full',
      tenantId: null,
      tenantName: null,
      tenantSchemaName: null,
      sizeBytes: 1234,
      createdAt: '2026-02-14T00:00:00.000Z',
      updatedAt: '2026-02-14T00:00:00.000Z',
    })

    const result = await service.createFullBackup()
    expect(result.id).toBe('full_1')
    expect(createFullDatabaseBackup).toHaveBeenCalledTimes(1)
  })

  it('createTenantBackup should throw when tenant does not exist', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(null)

    await expect(service.createTenantBackup('tenant-x')).rejects.toThrow(
      NotFoundException,
    )
  })

  it('createTenantBackup should call util with tenant data', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({
      id: 'tenant-1',
      name: 'ILPI Teste',
      schemaName: 'tenant_ilpi_teste',
    })
    ;(createTenantDatabaseBackup as jest.Mock).mockResolvedValue({
      id: 'tenant_1',
      fileName: 'tenant_1.sql',
      filePath: '/tmp/tenant_1.sql',
      scope: 'tenant',
      tenantId: 'tenant-1',
      tenantName: 'ILPI Teste',
      tenantSchemaName: 'tenant_ilpi_teste',
      sizeBytes: 4321,
      createdAt: '2026-02-14T00:00:00.000Z',
      updatedAt: '2026-02-14T00:00:00.000Z',
    })

    await service.createTenantBackup('tenant-1')

    expect(createTenantDatabaseBackup).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      tenantName: 'ILPI Teste',
      tenantSchemaName: 'tenant_ilpi_teste',
    })
  })

  it('listBackups should pass through filters', async () => {
    ;(listDatabaseBackups as jest.Mock).mockResolvedValue([])
    await service.listBackups(10, 'tenant', 'tenant-1')
    expect(listDatabaseBackups).toHaveBeenCalledWith({
      limit: 10,
      scope: 'tenant',
      tenantId: 'tenant-1',
    })
  })

  it('getBackupByIdOrThrow should throw when backup not found', async () => {
    ;(findDatabaseBackupById as jest.Mock).mockResolvedValue(null)

    await expect(service.getBackupByIdOrThrow('missing')).rejects.toThrow(
      NotFoundException,
    )
  })

  it('restoreFullBackup should call util', async () => {
    ;(restoreFullDatabaseBackupById as jest.Mock).mockResolvedValue({
      backupId: 'full_1',
      filePath: '/tmp/full_1.sql',
      scope: 'full',
      targetSchemaName: null,
      startedAt: '2026-02-14T00:00:00.000Z',
      finishedAt: '2026-02-14T00:00:01.000Z',
      durationMs: 1000,
    })

    const result = await service.restoreFullBackup('full_1')
    expect(result.scope).toBe('full')
    expect(restoreFullDatabaseBackupById).toHaveBeenCalledWith('full_1')
  })

  it('restoreTenantBackup should resolve tenant schema and call util', async () => {
    ;(findDatabaseBackupById as jest.Mock).mockResolvedValue({
      id: 'tenant_bkp_1',
      fileName: 'tenant_bkp_1.sql',
      filePath: '/tmp/tenant_bkp_1.sql',
      scope: 'tenant',
      tenantId: 'tenant-1',
      tenantName: 'ILPI',
      tenantSchemaName: 'tenant_old',
      sizeBytes: 1,
      createdAt: '2026-02-14T00:00:00.000Z',
      updatedAt: '2026-02-14T00:00:00.000Z',
    })
    prismaMock.tenant.findUnique.mockResolvedValue({
      id: 'tenant-1',
      schemaName: 'tenant_current',
    })
    ;(restoreTenantDatabaseBackupById as jest.Mock).mockResolvedValue({
      backupId: 'tenant_bkp_1',
      filePath: '/tmp/tenant_bkp_1.sql',
      scope: 'tenant',
      targetSchemaName: 'tenant_current',
      startedAt: '2026-02-14T00:00:00.000Z',
      finishedAt: '2026-02-14T00:00:01.000Z',
      durationMs: 1000,
    })

    const result = await service.restoreTenantBackup('tenant_bkp_1')
    expect(result.targetSchemaName).toBe('tenant_current')
    expect(restoreTenantDatabaseBackupById).toHaveBeenCalledWith(
      'tenant_bkp_1',
      'tenant_current',
    )
  })
})
