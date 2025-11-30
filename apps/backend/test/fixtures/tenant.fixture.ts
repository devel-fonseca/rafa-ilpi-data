/**
 * Fixtures de Tenants para testes
 *
 * Dados mockados consistentes para usar em testes.
 */

import { TenantStatus, PlanType } from '@prisma/client';

export const mockTenant = {
  id: 'tenant-test-123',
  schemaName: 'tenant_test_123',
  name: 'ILPI Teste Ltda',
  planType: PlanType.BASICO,
  status: TenantStatus.ACTIVE,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  deletedAt: null,
};

export const mockTenantFree = {
  id: 'tenant-free-456',
  schemaName: 'tenant_free_456',
  name: 'ILPI Free',
  planType: PlanType.FREE,
  status: TenantStatus.ACTIVE,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  deletedAt: null,
};

export const mockTenantEnterprise = {
  id: 'tenant-enterprise-789',
  schemaName: 'tenant_enterprise_789',
  name: 'ILPI Enterprise Corp',
  planType: PlanType.ENTERPRISE,
  status: TenantStatus.ACTIVE,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  deletedAt: null,
};

export const mockTenantSuspended = {
  id: 'tenant-suspended-999',
  schemaName: 'tenant_suspended_999',
  name: 'ILPI Suspensa',
  planType: PlanType.BASICO,
  status: TenantStatus.SUSPENDED,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  deletedAt: null,
};
