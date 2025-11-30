/**
 * Fixtures de Users para testes
 */

export const mockAdminUser = {
  id: 'user-admin-123',
  tenantId: 'tenant-test-123',
  email: 'admin@ilpi-teste.com',
  password: '$2b$10$XYZ...', // Hash bcrypt de 'password123'
  name: 'Administrador Teste',
  role: 'admin',
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  deletedAt: null,
};

export const mockRegularUser = {
  id: 'user-regular-456',
  tenantId: 'tenant-test-123',
  email: 'user@ilpi-teste.com',
  password: '$2b$10$ABC...',
  name: 'Usuário Regular',
  role: 'user',
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  deletedAt: null,
};

export const mockViewerUser = {
  id: 'user-viewer-789',
  tenantId: 'tenant-test-123',
  email: 'viewer@ilpi-teste.com',
  password: '$2b$10$DEF...',
  name: 'Usuário Visualizador',
  role: 'viewer',
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  deletedAt: null,
};

// Usuário de outro tenant (para testes de isolamento)
export const mockUserOtherTenant = {
  id: 'user-other-999',
  tenantId: 'tenant-other-999',
  email: 'user@outro-tenant.com',
  password: '$2b$10$GHI...',
  name: 'Usuário de Outro Tenant',
  role: 'admin',
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  deletedAt: null,
};

export const mockInactiveUser = {
  id: 'user-inactive-111',
  tenantId: 'tenant-test-123',
  email: 'inactive@ilpi-teste.com',
  password: '$2b$10$JKL...',
  name: 'Usuário Inativo',
  role: 'user',
  isActive: false,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  deletedAt: null,
};
