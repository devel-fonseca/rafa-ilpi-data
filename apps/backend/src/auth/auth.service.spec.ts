/**
 * Testes Unitários - AuthService
 *
 * CRÍTICO: Testes de autenticação, registro, refresh tokens
 * Falha aqui = brecha de segurança crítica
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockPrismaService } from '../../test/mocks/prisma.mock';
import { mockTenant, mockTenantFree } from '../../test/fixtures/tenant.fixture';
import { mockAdminUser, mockRegularUser, mockUserOtherTenant } from '../../test/fixtures/user.fixture';

// Mock bcrypt ANTES de importar
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                JWT_SECRET: 'test-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('register()', () => {
    const registerDto = {
      tenantId: mockTenant.id,
      name: 'Novo Usuário',
      email: 'novo@teste.com',
      password: 'senha123',
    };

    it('deve criar um novo usuário com sucesso', async () => {
      const mockSubscription = {
        plan: { maxUsers: 10 },
      };

      const mockTenantWithPlan = {
        ...mockTenant,
        subscriptions: [mockSubscription],
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenantWithPlan);
      prisma.user.findUnique.mockResolvedValue(null); // Email não existe
      prisma.user.count.mockResolvedValue(2); // 2 usuários existentes
      prisma.user.create.mockResolvedValue({
        id: 'new-user-123',
        ...registerDto,
        role: 'user',
        isActive: true,
        createdAt: new Date(),
      });

      const result = await service.register(registerDto);

      expect(result.message).toBe('Usuário criado com sucesso');
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(registerDto.email);
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('deve criar primeiro usuário como ADMIN', async () => {
      const mockTenantWithPlan = {
        ...mockTenant,
        subscriptions: [{ plan: { maxUsers: 10 } }],
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenantWithPlan);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.count.mockResolvedValue(0); // ZERO usuários = primeiro

      prisma.user.create.mockImplementation((args: any) => {
        return Promise.resolve({
          id: 'first-user',
          ...args.data,
          isActive: true,
          createdAt: new Date(),
        });
      });

      await service.register(registerDto);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'admin', // DEVE SER ADMIN
          }),
        })
      );
    });

    it('deve lançar erro se tenant não existe', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Tenant não encontrado'
      );
    });

    it('deve lançar erro se email já existe no tenant', async () => {
      const mockTenantWithPlan = {
        ...mockTenant,
        subscriptions: [{ plan: { maxUsers: 10 } }],
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenantWithPlan);
      prisma.user.findUnique.mockResolvedValue(mockAdminUser); // Email JÁ existe

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Email já cadastrado para este tenant'
      );
    });

    it('deve respeitar limite de usuários do plano', async () => {
      const mockTenantWithPlan = {
        ...mockTenant,
        subscriptions: [{ plan: { maxUsers: 2 } }], // Limite de 2
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenantWithPlan);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.count.mockResolvedValue(2); // JÁ TEM 2 usuários

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Limite de 2 usuários atingido'
      );
    });

    it('deve permitir usuários ilimitados se maxUsers = -1', async () => {
      const mockTenantWithPlan = {
        ...mockTenant,
        subscriptions: [{ plan: { maxUsers: -1 } }], // ILIMITADO
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenantWithPlan);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.count.mockResolvedValue(1000); // 1000 usuários
      prisma.user.create.mockResolvedValue({
        id: 'new-user',
        ...registerDto,
        role: 'user',
        isActive: true,
        createdAt: new Date(),
      });

      await expect(service.register(registerDto)).resolves.not.toThrow();
    });

    it('deve fazer hash da senha antes de salvar', async () => {
      const mockTenantWithPlan = {
        ...mockTenant,
        subscriptions: [{ plan: { maxUsers: 10 } }],
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenantWithPlan);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.count.mockResolvedValue(1);
      const bcrypt = require('bcrypt');
      bcrypt.hash.mockResolvedValue('$2b$10$hashedpassword123');

      prisma.user.create.mockImplementation((args: any) => {
        // Verifica que a senha foi hasheada
        expect(args.data.password).not.toBe(registerDto.password);
        expect(args.data.password).toMatch(/^\$2[aby]\$\d+\$/); // Formato bcrypt

        return Promise.resolve({
          id: 'new-user',
          ...args.data,
          isActive: true,
          createdAt: new Date(),
        });
      });

      await service.register(registerDto);
    });
  });

  describe('login()', () => {
    const loginDto = {
      email: mockAdminUser.email,
      password: 'password123',
    };

    it('deve fazer login com sucesso para usuário com um único tenant', async () => {
      const mockUserWithTenant = {
        ...mockAdminUser,
        tenant: {
          ...mockTenant,
          subscriptions: [{ plan: { name: 'Básico' } }],
        },
      };

      prisma.user.findMany.mockResolvedValue([mockUserWithTenant]);
      prisma.user.update.mockResolvedValue(mockUserWithTenant);
      prisma.refreshToken.create.mockResolvedValue({});

      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(true);
      (jwtService.sign as jest.Mock).mockReturnValue('mock-jwt-token');

      const result = await service.login(loginDto);

      expect((result as any).user).toBeDefined();
      expect((result as any).accessToken).toBe('mock-jwt-token');
      expect((result as any).refreshToken).toBe('mock-jwt-token');
      expect((result as any).user.password).toBeUndefined(); // Senha removida
    });

    it('deve retornar lista de tenants se usuário tem múltiplos', async () => {
      const mockUser2 = {
        ...mockAdminUser,
        id: 'user-2',
        tenantId: 'tenant-2',
        tenant: {
          id: 'tenant-2',
          name: 'Tenant 2',
          status: 'active',
          subscriptions: [{ plan: { name: 'Enterprise' } }],
        },
      };

      const mockUserWithTenant1 = {
        ...mockAdminUser,
        tenant: {
          ...mockTenant,
          subscriptions: [{ plan: { name: 'Básico' } }],
        },
      };

      prisma.user.findMany.mockResolvedValue([mockUserWithTenant1, mockUser2]);
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result.requiresTenantSelection).toBe(true);
      expect(result.tenants).toHaveLength(2);
      expect(result.tenants![0].name).toBe(mockTenant.name);
      expect(result.tenants![1].name).toBe('Tenant 2');
    });

    it('deve lançar erro se credenciais inválidas (email)', async () => {
      prisma.user.findMany.mockResolvedValue([]); // Nenhum usuário encontrado

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Credenciais inválidas'
      );
    });

    it('deve lançar erro se senha incorreta', async () => {
      const mockUserWithTenant = {
        ...mockAdminUser,
        tenant: mockTenant,
      };

      prisma.user.findMany.mockResolvedValue([mockUserWithTenant]);
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(false); // Senha INCORRETA

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Credenciais inválidas'
      );
    });

    it('deve atualizar lastLogin ao fazer login', async () => {
      const mockUserWithTenant = {
        ...mockAdminUser,
        tenant: {
          ...mockTenant,
          subscriptions: [{ plan: { name: 'Básico' } }],
        },
      };

      prisma.user.findMany.mockResolvedValue([mockUserWithTenant]);
      prisma.user.update.mockResolvedValue(mockUserWithTenant);
      prisma.refreshToken.create.mockResolvedValue({});

      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(true);
      (jwtService.sign as jest.Mock).mockReturnValue('token');

      await service.login(loginDto);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockAdminUser.id },
          data: expect.objectContaining({
            lastLogin: expect.any(Date),
          }),
        })
      );
    });

    it('deve salvar refresh token no banco', async () => {
      const mockUserWithTenant = {
        ...mockAdminUser,
        tenant: {
          ...mockTenant,
          subscriptions: [{ plan: { name: 'Básico' } }],
        },
      };

      prisma.user.findMany.mockResolvedValue([mockUserWithTenant]);
      prisma.user.update.mockResolvedValue(mockUserWithTenant);
      prisma.refreshToken.create.mockResolvedValue({});

      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(true);
      (jwtService.sign as jest.Mock).mockReturnValue('refresh-token-123');

      await service.login(loginDto);

      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockAdminUser.id,
            token: 'refresh-token-123',
            expiresAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('refresh()', () => {
    it('deve gerar novos tokens com refresh token válido', async () => {
      const mockStoredToken = {
        id: 'token-123',
        token: 'valid-refresh-token',
        userId: mockAdminUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias no futuro
        user: mockAdminUser,
      };

      prisma.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
      prisma.refreshToken.delete.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});
      (jwtService.sign as jest.Mock).mockReturnValue('new-token');

      const result = await service.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('new-token');
      expect(result.refreshToken).toBe('new-token');
    });

    it('deve DELETAR refresh token antigo (rotation)', async () => {
      const mockStoredToken = {
        id: 'token-old-123',
        token: 'old-refresh-token',
        userId: mockAdminUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        user: mockAdminUser,
      };

      prisma.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
      prisma.refreshToken.delete.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});
      (jwtService.sign as jest.Mock).mockReturnValue('new-token');

      await service.refresh('old-refresh-token');

      // CRÍTICO: Token antigo DEVE ser deletado (rotation)
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-old-123' },
      });
    });

    it('deve lançar erro se refresh token não existe', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('invalid-token')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('deve lançar erro se refresh token expirou', async () => {
      const mockExpiredToken = {
        id: 'token-expired',
        token: 'expired-token',
        userId: mockAdminUser.id,
        expiresAt: new Date(Date.now() - 1000), // EXPIRADO (no passado)
        user: mockAdminUser,
      };

      prisma.refreshToken.findUnique.mockResolvedValue(mockExpiredToken);
      prisma.refreshToken.delete.mockResolvedValue({});

      await expect(service.refresh('expired-token')).rejects.toThrow(
        UnauthorizedException
      );

      // Token expirado DEVE ser deletado
      expect(prisma.refreshToken.delete).toHaveBeenCalled();
    });

    it('deve lançar erro se usuário está inativo', async () => {
      const mockInactiveUser = {
        ...mockAdminUser,
        isActive: false, // INATIVO
      };

      const mockStoredToken = {
        id: 'token-123',
        token: 'valid-token',
        userId: mockInactiveUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        user: mockInactiveUser,
      };

      prisma.refreshToken.findUnique.mockResolvedValue(mockStoredToken);

      await expect(service.refresh('valid-token')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('logout()', () => {
    it('deve deletar todos os refresh tokens do usuário', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.logout(mockAdminUser.id);

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockAdminUser.id },
      });
      expect(result.message).toBe('Logout realizado com sucesso');
    });
  });

  describe('Segurança - JWT Payload', () => {
    it('deve incluir tenantId no JWT para multi-tenancy', async () => {
      const mockUserWithTenant = {
        ...mockAdminUser,
        tenant: {
          ...mockTenant,
          subscriptions: [{ plan: { name: 'Básico' } }],
        },
      };

      prisma.user.findMany.mockResolvedValue([mockUserWithTenant]);
      prisma.user.update.mockResolvedValue(mockUserWithTenant);
      prisma.refreshToken.create.mockResolvedValue({});

      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(true);

      (jwtService.sign as jest.Mock).mockImplementation((payload) => {
        // Verifica que o payload contém tenantId (CRÍTICO para multi-tenancy)
        expect(payload.tenantId).toBe(mockAdminUser.tenantId);
        expect(payload.sub).toBe(mockAdminUser.id);
        expect(payload.email).toBe(mockAdminUser.email);
        expect(payload.role).toBe(mockAdminUser.role);

        return 'mock-token';
      });

      await service.login({
        email: mockAdminUser.email,
        password: 'password123',
      });

      expect(jwtService.sign).toHaveBeenCalled();
    });
  });
});
