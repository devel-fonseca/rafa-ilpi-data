/**
 * Testes Unitários - AuditInterceptor
 *
 * CRÍTICO: Interceptor que registra TODAS as ações do sistema
 * Falha aqui = perda de rastreabilidade = não conformidade LGPD
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { AuditInterceptor, AUDIT_ACTION_KEY, AUDIT_ENTITY_KEY } from './audit.interceptor';
import { AuditService } from './audit.service';
import { mockAdminUser } from '../../test/fixtures/user.fixture';
import { mockTenant } from '../../test/fixtures/tenant.fixture';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let auditService: AuditService;
  let reflector: Reflector;

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockReflector = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditInterceptor,
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    interceptor = module.get<AuditInterceptor>(AuditInterceptor);
    auditService = module.get<AuditService>(AuditService);
    reflector = module.get<Reflector>(Reflector);

    jest.clearAllMocks();
  });

  const createMockExecutionContext = (options: {
    user?: any;
    method?: string;
    url?: string;
    params?: any;
    body?: any;
    ip?: string;
    userAgent?: string;
    auditAction?: string;
    auditEntity?: string;
  }): ExecutionContext => {
    const request = {
      user: options.user !== undefined ? options.user : { ...mockAdminUser, tenantId: mockTenant.id, tenant: mockTenant },
      method: options.method || 'POST',
      url: options.url || '/api/residents',
      params: options.params || {},
      body: options.body || {},
      ip: options.ip || '127.0.0.1',
      headers: {
        'user-agent': options.userAgent || 'test-agent',
      },
      connection: {},
    };

    mockReflector.get.mockImplementation((key: string) => {
      if (key === AUDIT_ACTION_KEY) return options.auditAction;
      if (key === AUDIT_ENTITY_KEY) return options.auditEntity;
      return undefined;
    });

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: jest.fn(),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  const createMockCallHandler = (response?: any): CallHandler => {
    return {
      handle: () => of(response || { id: 'entity-123', name: 'Test' }),
    } as CallHandler;
  };

  describe('Registro de Auditoria', () => {
    it('deve registrar auditoria quando metadados presentes', async () => {
      const context = createMockExecutionContext({
        auditAction: 'CREATE',
        auditEntity: 'Resident',
        body: { fullName: 'João Silva' },
      });

      const handler = createMockCallHandler({ id: 'resident-123' });

      await new Promise<void>((resolve) => {
        interceptor.intercept(context, handler).subscribe({
          complete: () => {
            expect(auditService.log).toHaveBeenCalled();
            resolve();
          },
        });
      });
    });

    it('deve NÃO registrar se metadados ausentes', async () => {
      const context = createMockExecutionContext({
        auditAction: undefined, // SEM metadados
        auditEntity: undefined,
      });

      const handler = createMockCallHandler();

      await new Promise<void>((resolve) => {
        interceptor.intercept(context, handler).subscribe({
          complete: () => {
            expect(auditService.log).not.toHaveBeenCalled();
            resolve();
          },
        });
      });
    });

    it('deve NÃO registrar se usuário não autenticado', (done) => {
      const context = createMockExecutionContext({
        user: null, // SEM usuário
        auditAction: 'CREATE',
        auditEntity: 'Resident',
      });

      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(auditService.log).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('deve NÃO registrar se tenant não presente no usuário', (done) => {
      const context = createMockExecutionContext({
        user: { id: 'user-1', name: 'Test' }, // SEM tenant
        auditAction: 'CREATE',
        auditEntity: 'Resident',
      });

      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(auditService.log).not.toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('Dados Registrados', () => {
    it('deve registrar entityType e action', async () => {
      const context = createMockExecutionContext({
        auditAction: 'UPDATE',
        auditEntity: 'Prescription',
      });

      const handler = createMockCallHandler();

      await new Promise<void>((resolve) => {
        interceptor.intercept(context, handler).subscribe({
          complete: () => {
            expect(auditService.log).toHaveBeenCalledWith(
              expect.objectContaining({
                entityType: 'Prescription',
                action: 'UPDATE',
              })
            );
            resolve();
          },
        });
      });
    });

    it('deve registrar userId, userName e tenantId', async () => {
      const context = createMockExecutionContext({
        auditAction: 'CREATE',
        auditEntity: 'Resident',
      });

      const handler = createMockCallHandler();

      await new Promise<void>((resolve) => {
        interceptor.intercept(context, handler).subscribe({
          complete: () => {
            expect(auditService.log).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: mockAdminUser.id,
                userName: mockAdminUser.name,
                tenantId: mockTenant.id,
              })
            );
            resolve();
          },
        });
      });
    });

    it('deve registrar IP e User-Agent', async () => {
      const context = createMockExecutionContext({
        auditAction: 'CREATE',
        auditEntity: 'Resident',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      });

      const handler = createMockCallHandler();

      await new Promise<void>((resolve) => {
        interceptor.intercept(context, handler).subscribe({
          complete: () => {
            expect(auditService.log).toHaveBeenCalledWith(
              expect.objectContaining({
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0',
              })
            );
            resolve();
          },
        });
      });
    });

    it('deve extrair entityId de params.id', async () => {
      const context = createMockExecutionContext({
        auditAction: 'UPDATE',
        auditEntity: 'Resident',
        params: { id: 'resident-456' },
      });

      const handler = createMockCallHandler();

      await new Promise<void>((resolve) => {
        interceptor.intercept(context, handler).subscribe({
          complete: () => {
            expect(auditService.log).toHaveBeenCalledWith(
              expect.objectContaining({
                entityId: 'resident-456',
              })
            );
            resolve();
          },
        });
      });
    });

    it('deve extrair entityId de response.id se params vazio', async () => {
      const context = createMockExecutionContext({
        auditAction: 'CREATE',
        auditEntity: 'Resident',
        params: {},
      });

      const handler = createMockCallHandler({ id: 'resident-789' });

      await new Promise<void>((resolve) => {
        interceptor.intercept(context, handler).subscribe({
          complete: () => {
            expect(auditService.log).toHaveBeenCalledWith(
              expect.objectContaining({
                entityId: 'resident-789',
              })
            );
            resolve();
          },
        });
      });
    });

    it('deve registrar método HTTP e path em details', async () => {
      const context = createMockExecutionContext({
        auditAction: 'CREATE',
        auditEntity: 'Resident',
        method: 'POST',
        url: '/api/residents',
      });

      const handler = createMockCallHandler();

      await new Promise<void>((resolve) => {
        interceptor.intercept(context, handler).subscribe({
          complete: () => {
            expect(auditService.log).toHaveBeenCalledWith(
              expect.objectContaining({
                details: expect.objectContaining({
                  method: 'POST',
                  path: '/api/residents',
                }),
              })
            );
            resolve();
          },
        });
      });
    });

    it('deve registrar tempo de execução', async () => {
      const context = createMockExecutionContext({
        auditAction: 'CREATE',
        auditEntity: 'Resident',
      });

      const handler = createMockCallHandler();

      await new Promise<void>((resolve) => {
        interceptor.intercept(context, handler).subscribe({
          complete: () => {
            expect(auditService.log).toHaveBeenCalledWith(
              expect.objectContaining({
                details: expect.objectContaining({
                  executionTime: expect.stringMatching(/^\d+ms$/),
                }),
              })
            );
            resolve();
          },
        });
      });
    });
  });

  describe('Request Body (CREATE/UPDATE)', () => {
    it('deve incluir request body em CREATE', async () => {
      const context = createMockExecutionContext({
        auditAction: 'CREATE',
        auditEntity: 'Resident',
        body: { fullName: 'Maria Silva', cpf: '12345678901' },
      });

      const handler = createMockCallHandler();

      await new Promise<void>((resolve) => {
        interceptor.intercept(context, handler).subscribe({
          complete: () => {
            expect(auditService.log).toHaveBeenCalledWith(
              expect.objectContaining({
                details: expect.objectContaining({
                  requestBody: {
                    fullName: 'Maria Silva',
                    cpf: '12345678901',
                  },
                }),
              })
            );
            resolve();
          },
        });
      });
    });

    it('deve incluir request body em UPDATE', async () => {
      const context = createMockExecutionContext({
        auditAction: 'UPDATE',
        auditEntity: 'Resident',
        body: { status: 'ATIVO' },
      });

      const handler = createMockCallHandler();

      await new Promise<void>((resolve) => {
        interceptor.intercept(context, handler).subscribe({
          complete: () => {
            expect(auditService.log).toHaveBeenCalledWith(
              expect.objectContaining({
                details: expect.objectContaining({
                  requestBody: { status: 'ATIVO' },
                }),
              })
            );
            resolve();
          },
        });
      });
    });

    it('deve REMOVER campo password do body (segurança)', async () => {
      const context = createMockExecutionContext({
        auditAction: 'CREATE',
        auditEntity: 'User',
        body: {
          email: 'user@test.com',
          password: 'senha-super-secreta',
          name: 'Test User',
        },
      });

      const handler = createMockCallHandler();

      await new Promise<void>((resolve) => {
        interceptor.intercept(context, handler).subscribe({
          complete: () => {
            const logCall = (auditService.log as jest.Mock).mock.calls[0][0];
            expect(logCall.details.requestBody.password).toBeUndefined();
            expect(logCall.details.requestBody.email).toBe('user@test.com');
            expect(logCall.details.requestBody.name).toBe('Test User');
            resolve();
          },
        });
      });
    });

    it('deve NÃO incluir body em ações READ', async () => {
      const context = createMockExecutionContext({
        auditAction: 'READ',
        auditEntity: 'Resident',
        body: { someData: 'test' },
      });

      const handler = createMockCallHandler();

      await new Promise<void>((resolve) => {
        interceptor.intercept(context, handler).subscribe({
          complete: () => {
            const logCall = (auditService.log as jest.Mock).mock.calls[0][0];
            expect(logCall.details.requestBody).toBeUndefined();
            resolve();
          },
        });
      });
    });
  });

  describe('DELETE Actions', () => {
    it('deve incluir dados deletados em DELETE', async () => {
      const deletedData = {
        id: 'resident-123',
        fullName: 'João Silva',
        status: 'ATIVO',
      };

      const context = createMockExecutionContext({
        auditAction: 'DELETE',
        auditEntity: 'Resident',
      });

      const handler = createMockCallHandler(deletedData);

      await new Promise<void>((resolve) => {
        interceptor.intercept(context, handler).subscribe({
          complete: () => {
            expect(auditService.log).toHaveBeenCalledWith(
              expect.objectContaining({
                details: expect.objectContaining({
                  deletedData,
                }),
              })
            );
            resolve();
          },
        });
      });
    });
  });

  describe('Tratamento de Erros', () => {
    it('NÃO deve interromper operação se auditoria falhar', (done) => {
      mockAuditService.log.mockRejectedValue(new Error('Database error'));

      const context = createMockExecutionContext({
        auditAction: 'CREATE',
        auditEntity: 'Resident',
      });

      const handler = createMockCallHandler({ id: 'resident-123' });

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          // Operação DEVE continuar mesmo com erro na auditoria
          expect(result.id).toBe('resident-123');
        },
        complete: () => {
          done();
        },
      });
    });

    it('deve logar erro no console se auditoria falhar', (done) => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAuditService.log.mockRejectedValue(new Error('Audit failed'));

      const context = createMockExecutionContext({
        auditAction: 'CREATE',
        auditEntity: 'Resident',
      });

      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          // Aguardar um tick para o erro assíncrono ser logado
          setTimeout(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith(
              'Failed to create audit log:',
              expect.any(Error)
            );
            consoleErrorSpy.mockRestore();
            done();
          }, 100);
        },
      });
    });
  });

  describe('Compliance & Segurança', () => {
    it('deve SEMPRE incluir tenantId (multi-tenancy)', async () => {
      const context = createMockExecutionContext({
        auditAction: 'CREATE',
        auditEntity: 'Resident',
      });

      const handler = createMockCallHandler();

      await new Promise<void>((resolve) => {
        interceptor.intercept(context, handler).subscribe({
          complete: () => {
            const logCall = (auditService.log as jest.Mock).mock.calls[0][0];
            expect(logCall.tenantId).toBe(mockTenant.id);
            expect(logCall.tenantId).toBeDefined();
            resolve();
          },
        });
      });
    });

    it('deve registrar informações para rastreabilidade LGPD', async () => {
      const context = createMockExecutionContext({
        auditAction: 'VIEW',
        auditEntity: 'Resident',
        ip: '10.0.0.1',
        userAgent: 'Chrome/90.0',
      });

      const handler = createMockCallHandler();

      await new Promise<void>((resolve) => {
        interceptor.intercept(context, handler).subscribe({
          complete: () => {
            const logCall = (auditService.log as jest.Mock).mock.calls[0][0];

            // LGPD Art. 37: "O controlador e o operador devem manter
            // registro das operações de tratamento de dados pessoais"
            expect(logCall.userId).toBeDefined(); // Quem
            expect(logCall.action).toBeDefined(); // O quê
            expect(logCall.entityType).toBeDefined(); // Em qual entidade
            expect(logCall.ipAddress).toBeDefined(); // De onde
            expect(logCall.userAgent).toBeDefined(); // Como
            // Quando = timestamp automático

            resolve();
          },
        });
      });
    });
  });
});
