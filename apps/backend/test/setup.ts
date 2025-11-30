/**
 * Global Test Setup
 *
 * Este arquivo é executado antes de todos os testes.
 * Configura variáveis de ambiente e utilitários globais.
 */

// Configurar variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-min-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-bytes-a';

// Mock de console.log para testes mais limpos (opcional)
global.console = {
  ...console,
  log: jest.fn(), // Silenciar logs durante testes
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Manter error para debugar falhas
};

// Aumentar timeout para testes E2E
jest.setTimeout(30000);
