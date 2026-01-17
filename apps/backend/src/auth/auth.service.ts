import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { addMilliseconds } from 'date-fns';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UserProfilesService } from '../user-profiles/user-profiles.service';
import { EmailService } from '../email/email.service';
import { JwtCacheService } from './jwt-cache.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SelectTenantDto } from './dto/select-tenant.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangeType, AccessAction, Prisma, PrismaClient } from '@prisma/client';

/**
 * AuthService - Serviço de Autenticação e Autorização
 *
 * ⚠️ EXCEÇÃO ARQUITETURAL: Este service NÃO usa TenantContextService
 *
 * JUSTIFICATIVA:
 * - TenantContext é inicializado APÓS validação do JWT (no JwtAuthGuard)
 * - AuthService CRIA o JWT (login/register) → contexto ainda não existe
 * - AuthService VALIDA tokens expirados → contexto pode estar inválido
 * - AuthService busca users cross-tenant → precisa iterar múltiplos schemas
 *
 * PADRÃO UTILIZADO:
 * 1. Métodos PRÉ-autenticação (login, refresh, logout):
 *    → Usam lógica manual de roteamento multi-schema
 *    → Buscam tenantId do payload e chamam getTenantClient()
 *
 * 2. Métodos PÓS-autenticação (changePassword, etc):
 *    → PODEM usar TenantContext (context já inicializado pelo guard)
 *    → Ainda usam lógica manual por consistência com (1)
 *
 * TRADE-OFF ACEITO:
 * - Duplicação de lógica de roteamento (~50 linhas extras)
 * - Ganho: Código explícito, auditável, sem dependências circulares
 *
 * @see TenantContextService - Usado por 95% dos outros services
 * @see JwtAuthGuard - Responsável por inicializar TenantContext
 */
@Injectable()
export class AuthService {
  /**
   * Cache in-memory de tenantId → schemaName
   * Reduz queries repetidas ao banco durante operações de auth
   */
  private schemaCache = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userProfilesService: UserProfilesService,
    private readonly emailService: EmailService,
    private readonly jwtCache: JwtCacheService,
  ) {}

  /**
   * Busca schemaName de um tenant com cache in-memory
   * Reduz queries repetidas durante operações de autenticação
   *
   * @param tenantId - ID do tenant
   * @returns schemaName do tenant
   * @throws Error se tenant não existe
   */
  private async getSchemaName(tenantId: string): Promise<string> {
    if (!this.schemaCache.has(tenantId)) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { schemaName: true },
      });

      if (!tenant) {
        throw new Error(`Tenant ${tenantId} not found`);
      }

      this.schemaCache.set(tenantId, tenant.schemaName);
    }

    return this.schemaCache.get(tenantId)!;
  }

  /**
   * Registra um novo usuário
   */
  async register(registerDto: RegisterDto) {
    const { tenantId, name, email, password } = registerDto;

    // Verificar se tenant existe
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscriptions: { include: { plan: true }, take: 1 } },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant não encontrado');
    }

    // ✅ Obter tenant client para acessar User no schema de tenant
    const tenantClient = this.prisma.getTenantClient(tenant.schemaName);

    // Verificar se email já existe para este tenant
    const existingUser = await tenantClient.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });

    if (existingUser) {
      throw new ConflictException('Email já cadastrado para este tenant');
    }

    // Verificar limite de usuários do plano
    const userCount = await tenantClient.user.count({
      where: { deletedAt: null },
    });

    const maxUsers = tenant.subscriptions[0]?.plan.maxUsers || 0;
    if (maxUsers !== -1 && userCount >= maxUsers) {
      throw new BadRequestException(
        `Limite de ${maxUsers} usuários atingido para o plano atual`,
      );
    }

    // Hash da senha
    const hashedPassword = await this.hashPassword(password);

    // Criar usuário E perfil em transação atômica (tudo ou nada)
    const user = await tenantClient.$transaction(async (tx) => {
      // 1. Criar usuário
      const newUser = await tx.user.create({
        data: {
          tenantId,
          name,
          email,
          password: hashedPassword,
          role: userCount === 0 ? 'admin' : 'user', // Primeiro usuário é admin
        },
        select: {
          id: true,
          tenantId: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      // 2. Criar perfil automaticamente para o usuário (exceto SUPERADMIN)
      if (newUser.tenantId) {
        await tx.userProfile.create({
          data: {
            userId: newUser.id,
            tenantId: newUser.tenantId,
            createdBy: newUser.id, // O próprio usuário é o criador do perfil
          },
        });
      }

      return newUser;
    });

    return {
      message: 'Usuário criado com sucesso',
      user,
    };
  }

  /**
   * Login do usuário - Verifica se tem múltiplos tenants
   *
   * ARQUITETURA MULTI-TENANT:
   * Busca users por email em AMBOS os contextos:
   * - public.users (SUPERADMIN com tenantId=null)
   * - tenant_xyz.users (users de tenants)
   */
  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const { email, password } = loginDto;

    // Buscar todos os cadastros do usuário (pode ter múltiplos tenants ou SUPERADMIN)
    // STEP 1: Buscar em public schema (SUPERADMIN)
    // eslint-disable-next-line no-restricted-syntax
    const superAdminUsers = await this.prisma.user.findMany({
      where: {
        email,
        isActive: true,
        tenantId: null, // Apenas SUPERADMIN
      },
      include: {
        profile: true,
        tenant: {
          include: {
            profile: {
              select: {
                tradeName: true,
              },
            },
            subscriptions: {
              include: { plan: true },
              where: {
                status: {
                  in: ['ACTIVE', 'TRIAL', 'active', 'trialing'],
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
        },
      },
    });

    // STEP 2: Buscar em todos os tenant schemas
    const tenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null },
      select: { id: true, schemaName: true, name: true, status: true },
    });

    const tenantUsersPromises = tenants.map(async (tenant) => {
      try {
        const tenantClient = this.prisma.getTenantClient(tenant.schemaName);
        const user = await tenantClient.user.findFirst({
          where: {
            email,
            isActive: true,
            deletedAt: null,
          },
          include: {
            profile: true,
          },
        });

        if (!user) return null;

        // Buscar dados do tenant no public schema
        const fullTenant = await this.prisma.tenant.findUnique({
          where: { id: tenant.id },
          include: {
            profile: {
              select: {
                tradeName: true,
              },
            },
            subscriptions: {
              include: { plan: true },
              where: {
                status: {
                  in: ['ACTIVE', 'TRIAL', 'active', 'trialing'],
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
        });

        return {
          ...user,
          tenant: fullTenant,
        };
      } catch (error) {
        console.error(`Erro ao buscar user em ${tenant.schemaName}:`, error.message);
        return null;
      }
    });

    const tenantUsers = (await Promise.all(tenantUsersPromises)).filter((u) => u !== null);

    // STEP 3: Combinar resultados
    const users = [...superAdminUsers, ...tenantUsers];

    if (users.length === 0) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Verificar senha em qualquer um dos cadastros (assumindo mesma senha)
    let passwordValid = false;
    for (const user of users) {
      const isValid = await this.comparePasswords(password, user.password);
      if (isValid) {
        passwordValid = true;
        break;
      }
    }

    if (!passwordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Se usuário tem apenas um tenant, fazer login direto
    if (users.length === 1) {
      const user = users[0];

      // Atualizar lastLogin
      // ✅ Usar client correto baseado em tenantId
      if (user.tenantId) {
        const schemaName = await this.getSchemaName(user.tenantId);
        const tenantClient = this.prisma.getTenantClient(schemaName);
        await tenantClient.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });
      } else {
        // SUPERADMIN (tenantId = null)
        // eslint-disable-next-line no-restricted-syntax
        await this.prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });
      }

      // Gerar tokens
      const tokens = await this.generateTokens(user);

      // Salvar refresh token no banco
      await this.saveRefreshToken(user.id, user.tenantId, tokens.refreshToken, ipAddress, userAgent);

      // Registrar log de acesso (LOGIN bem-sucedido)
      if (user.tenantId) {
        await this.logAccess(
          user.id,
          user.tenantId,
          AccessAction.LOGIN,
          'SUCCESS',
          ipAddress,
          userAgent,
        );
      }

      // Remover senha do retorno e adicionar plan no tenant
      const { password: _password, tenant, ...userWithoutPassword } = user;

      // Adicionar campo plan diretamente no tenant para facilitar acesso no frontend
      const tenantWithPlan = tenant ? {
        ...tenant,
        plan: tenant.subscriptions[0]?.plan?.name || 'Free',
      } : null;

      return {
        user: {
          ...userWithoutPassword,
          tenant: tenantWithPlan,
        },
        ...tokens,
      };
    }

    // Se usuário tem múltiplos tenants, retornar lista para seleção
    // Filtrar apenas usuários com tenant (excluir SUPERADMIN se estiver na lista)
    const usersWithTenant = users.filter(u => u.tenant !== null);

    return {
      requiresTenantSelection: true,
      tenants: usersWithTenant.map((user) => ({
        id: user.tenant!.id,
        name: user.tenant!.name,
        role: user.role,
        status: user.tenant!.status,
        plan: user.tenant!.subscriptions[0]?.plan?.name || 'Free',
      })),
    };
  }

  /**
   * Login com tenant específico (quando usuário tem múltiplos)
   */
  async selectTenant(selectTenantDto: SelectTenantDto, ipAddress?: string, userAgent?: string) {
    const { email, password, tenantId } = selectTenantDto;

    // Buscar tenant e obter schema name
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        profile: {
          select: {
            tradeName: true,
          },
        },
        subscriptions: {
          include: { plan: true },
          where: {
            status: {
              in: ['ACTIVE', 'TRIAL', 'active', 'trialing'],
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    // ✅ Usar tenant client para buscar usuário
    const tenantClient = this.prisma.getTenantClient(tenant.schemaName);
    const user = await tenantClient.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
      include: {
        profile: true, // Incluir perfil do usuário (positionCode, etc)
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado neste tenant');
    }

    // Verificar se usuário está ativo
    if (!user.isActive) {
      throw new UnauthorizedException('Usuário desativado');
    }

    // Verificar senha
    const isPasswordValid = await this.comparePasswords(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Atualizar lastLogin
    await tenantClient.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Gerar tokens
    const tokens = await this.generateTokens(user);

    // Salvar refresh token no banco
    await this.saveRefreshToken(user.id, user.tenantId, tokens.refreshToken, ipAddress, userAgent);

    // Registrar log de acesso (LOGIN bem-sucedido)
    if (user.tenantId) {
      await this.logAccess(
        user.id,
        user.tenantId,
        AccessAction.LOGIN,
        'SUCCESS',
        ipAddress,
        userAgent,
      );
    }

    // Remover senha do retorno e adicionar plan no tenant
    const { password: _password2, ...userWithoutPassword } = user;

    // Adicionar campo plan diretamente no tenant para facilitar acesso no frontend
    const tenantWithPlan = {
      ...tenant,
      plan: tenant.subscriptions[0]?.plan?.name || 'Free',
    };

    return {
      user: {
        ...userWithoutPassword,
        tenant: tenantWithPlan,
      },
      ...tokens,
    };
  }

  /**
   * Renovar access token usando refresh token
   *
   * ⚠️ LÓGICA MANUAL DE MULTI-TENANCY (não usa TenantContext)
   *
   * ARQUITETURA MULTI-SCHEMA DISCOVERY:
   * Busca o refreshToken em TODOS os schemas (public + todos os tenants)
   * porque não sabemos em qual schema o token está armazenado.
   *
   * JUSTIFICATIVA:
   * - Método é chamado COM token expirado (contexto pode estar inválido)
   * - Não temos tenantId no payload da requisição (apenas o token)
   * - Precisa buscar em múltiplos schemas para encontrar o token
   *
   * PERFORMANCE:
   * - Best case: O(1) - Token está em public (SUPERADMIN)
   * - Worst case: O(n) - Itera todos os N tenants até encontrar
   * - Otimização futura: Cache Redis (token → schemaName)
   *
   * @param refreshToken - Refresh token JWT a ser validado
   * @param ipAddress - IP da requisição (opcional, para auditoria)
   * @param userAgent - User-Agent do navegador (opcional)
   * @returns Novo par de tokens (accessToken + refreshToken)
   */
  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
    try {
      // ═══════════════════════════════════════════════════════════════════════
      // BUSCA MULTI-SCHEMA (Exceção Arquitetural)
      // ═══════════════════════════════════════════════════════════════════════

      // STEP 1: Tentar buscar em public schema (SUPERADMIN)
      // eslint-disable-next-line no-restricted-syntax
      let storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      let tenantSchemaName: string | null = null;

      // STEP 2: Se não encontrou em public, buscar em todos os tenant schemas
      if (!storedToken) {
        const tenants = await this.prisma.tenant.findMany({
          select: { id: true, schemaName: true },
        });

        for (const tenant of tenants) {
          try {
            const tenantClient = this.prisma.getTenantClient(tenant.schemaName);
            const tokenInTenant = await tenantClient.refreshToken.findUnique({
              where: { token: refreshToken },
              include: { user: true },
            });

            if (tokenInTenant) {
              storedToken = tokenInTenant;
              tenantSchemaName = tenant.schemaName;
              break; // Encontrou, parar de procurar
            }
          } catch (error) {
            // Schema não existe ou erro - continuar procurando
            console.error(`Erro ao buscar token no tenant ${tenant.schemaName}:`, error);
          }
        }
      }

      if (!storedToken) {
        throw new UnauthorizedException('Refresh token inválido');
      }

      // Verificar se token expirou
      if (storedToken.expiresAt < new Date()) {
        // Remover token expirado do schema correto
        if (tenantSchemaName) {
          const tenantClient = this.prisma.getTenantClient(tenantSchemaName);
          await tenantClient.refreshToken.delete({
            where: { id: storedToken.id },
          });
        } else {
          await this.prisma.refreshToken.delete({
            where: { id: storedToken.id },
          });
        }
        throw new UnauthorizedException('Refresh token expirado');
      }

      // Verificar se usuário está ativo
      if (!storedToken.user.isActive) {
        throw new UnauthorizedException('Usuário desativado');
      }

      // Gerar novos tokens
      const tokens = await this.generateTokens(storedToken.user);

      // Remover token antigo do schema correto
      if (tenantSchemaName) {
        const tenantClient = this.prisma.getTenantClient(tenantSchemaName);
        await tenantClient.refreshToken.delete({
          where: { id: storedToken.id },
        });

        // Cleanup: remover tokens expirados deste usuário (evita acúmulo)
        tenantClient.refreshToken
          .deleteMany({
            where: {
              userId: storedToken.user.id,
              expiresAt: {
                lt: new Date(),
              },
            },
          })
          .catch((error) => {
            console.error(
              '[REFRESH] Erro ao limpar tokens expirados:',
              error.message,
            );
          });
      } else {
        await this.prisma.refreshToken.delete({
          where: { id: storedToken.id },
        });

        // Cleanup para SUPERADMIN
        this.prisma.refreshToken
          .deleteMany({
            where: {
              userId: storedToken.user.id,
              expiresAt: {
                lt: new Date(),
              },
            },
          })
          .catch((error) => {
            console.error(
              '[REFRESH] Erro ao limpar tokens expirados:',
              error.message,
            );
          });
      }

      // Salvar novo refresh token
      await this.saveRefreshToken(
        storedToken.user.id,
        storedToken.user.tenantId,
        tokens.refreshToken,
        ipAddress || storedToken.ipAddress || undefined,
        userAgent || storedToken.userAgent || undefined,
      );

      return tokens;
    } catch (_error) {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  /**
   * Logout (remover refresh token)
   * Se refreshToken for fornecido, remove apenas essa sessão específica.
   * Se não for fornecido, remove todas as sessões (comportamento antigo, mantido para compatibilidade).
   */
  async logout(userId: string, refreshToken?: string, ipAddress?: string, userAgent?: string) {
    // Buscar usuário para obter tenantId
    // ✅ Tentar primeiro em public (SUPERADMIN)
    // eslint-disable-next-line no-restricted-syntax
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tenantId: true },
    });

    // Se não encontrou em public, buscar em tenant schemas
    if (!user) {
      const tenants = await this.prisma.tenant.findMany({
        where: { deletedAt: null },
        select: { schemaName: true },
      });

      for (const tenant of tenants) {
        try {
          const tenantClient = this.prisma.getTenantClient(tenant.schemaName);
          const tenantUser = await tenantClient.user.findUnique({
            where: { id: userId },
            select: { id: true, tenantId: true },
          });

          if (tenantUser) {
            user = tenantUser;
            break;
          }
        } catch (_error) {
          // Schema pode não existir, continuar
          continue;
        }
      }
    }

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // Obter tenant client correto (se for tenant user)
    const tenantId = user.tenantId;
    let targetClient: PrismaService | PrismaClient = this.prisma; // Default: public schema (SUPERADMIN)

    if (tenantId) {
      const schemaName = await this.getSchemaName(tenantId);
      targetClient = this.prisma.getTenantClient(schemaName);
    }

    // Se refreshToken foi fornecido, deletar apenas essa sessão específica
    if (refreshToken) {
      const deletedToken = await targetClient.refreshToken.deleteMany({
        where: {
          userId,
          token: refreshToken,
        },
      });

      // Se nenhum token foi deletado, significa que o token não existe ou já foi revogado
      if (deletedToken.count === 0) {
        // Não falhar silenciosamente - apenas logar e continuar
        console.log(`[LOGOUT] Refresh token não encontrado para userId ${userId}`);
      }
    } else {
      // Comportamento antigo: remover TODOS os refresh tokens do usuário
      await targetClient.refreshToken.deleteMany({
        where: { userId },
      });
    }

    // Registrar log de acesso (LOGOUT)
    if (user.tenantId) {
      await this.logAccess(
        user.id,
        user.tenantId,
        AccessAction.LOGOUT,
        'SUCCESS',
        ipAddress,
        userAgent,
      );
    }

    // ✅ OTIMIZAÇÃO: Invalidar cache JWT para forçar nova validação
    this.jwtCache.invalidate(userId);

    return { message: 'Logout realizado com sucesso' };
  }

  /**
   * Logout de sessão expirada (endpoint público)
   * Aceita apenas refreshToken, busca o userId associado, deleta o token e registra o log.
   * Usado quando accessToken expirou mas refreshToken ainda é válido.
   *
   * ARQUITETURA MULTI-TENANT:
   * Busca o refreshToken em TODOS os schemas (public + tenants)
   */
  async logoutExpired(refreshToken: string, ipAddress?: string, userAgent?: string) {
    // STEP 1: Tentar buscar em public schema (SUPERADMIN)
    // eslint-disable-next-line no-restricted-syntax
    let storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { select: { id: true, tenantId: true } } },
    });

    let tenantSchemaName: string | null = null;

    // STEP 2: Se não encontrou em public, buscar em todos os tenant schemas
    if (!storedToken) {
      const tenants = await this.prisma.tenant.findMany({
        select: { id: true, schemaName: true },
      });

      for (const tenant of tenants) {
        try {
          const tenantClient = this.prisma.getTenantClient(tenant.schemaName);
          const tokenInTenant = await tenantClient.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: { select: { id: true, tenantId: true } } },
          });

          if (tokenInTenant) {
            storedToken = tokenInTenant;
            tenantSchemaName = tenant.schemaName;
            break; // Encontrou, parar de procurar
          }
        } catch (error) {
          // Schema não existe ou erro - continuar procurando
          console.error(`Erro ao buscar token no tenant ${tenant.schemaName}:`, error);
        }
      }
    }

    if (!storedToken) {
      // Token não encontrado ou já foi revogado
      // Não falhar - retornar sucesso silenciosamente (best effort)
      console.log('[LOGOUT-EXPIRED] Refresh token não encontrado ou já revogado');
      return { message: 'Logout registrado' };
    }

    const userId = storedToken.user.id;
    const tenantId = storedToken.user.tenantId;

    // Deletar o refresh token do schema correto
    if (tenantSchemaName) {
      const tenantClient = this.prisma.getTenantClient(tenantSchemaName);
      await tenantClient.refreshToken.delete({
        where: { id: storedToken.id },
      });
    } else {
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
    }

    // Registrar log de acesso (LOGOUT com reason SESSION_EXPIRED)
    if (tenantId) {
      await this.logAccess(
        userId,
        tenantId,
        AccessAction.LOGOUT,
        'SUCCESS',
        ipAddress,
        userAgent,
        'SESSION_EXPIRED', // reason
      );
    }

    return { message: 'Logout de sessão expirada registrado com sucesso' };
  }

  /**
   * Esqueci minha senha - Solicita recuperação de senha
   * Sempre retorna sucesso (mesmo se email não existe) para prevenir enumeração de usuários
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto, ipAddress?: string) {
    const { email } = forgotPasswordDto;

    // Buscar usuário por email (qualquer tenant ou SUPERADMIN)
    // ✅ STEP 1: Buscar em public (SUPERADMIN)
    // eslint-disable-next-line no-restricted-syntax
    let user = await this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
        isActive: true,
        tenantId: null, // Apenas SUPERADMIN
      },
      select: {
        id: true,
        email: true,
        name: true,
        tenantId: true,
      },
    });

    let tenant: { id: string; name: string; profile: { tradeName: string | null } | null } | null = null;

    // STEP 2: Se não encontrou em public, buscar em tenant schemas
    if (!user) {
      const tenants = await this.prisma.tenant.findMany({
        where: { deletedAt: null },
        select: { id: true, schemaName: true, name: true },
      });

      for (const t of tenants) {
        try {
          const tenantClient = this.prisma.getTenantClient(t.schemaName);
          const tenantUser = await tenantClient.user.findFirst({
            where: {
              email,
              deletedAt: null,
              isActive: true,
            },
            select: {
              id: true,
              email: true,
              name: true,
              tenantId: true,
            },
          });

          if (tenantUser) {
            user = tenantUser;
            // Buscar tenant completo
            tenant = await this.prisma.tenant.findUnique({
              where: { id: t.id },
              select: {
                id: true,
                name: true,
                profile: {
                  select: {
                    tradeName: true,
                  },
                },
              },
            });
            break;
          }
        } catch (_error) {
          // Schema pode não existir, continuar
          continue;
        }
      }
    }

    // ✅ SEGURANÇA: SEMPRE retornar sucesso, mesmo se usuário não existe
    // Isso previne que atacantes enumerem emails válidos no sistema
    if (!user) {
      return {
        message:
          'Se o email estiver cadastrado, você receberá um link de recuperação em breve.',
      };
    }

    // Gerar token único (UUID v4 = 128-bit random)
    const token = crypto.randomUUID();

    // Hash SHA-256 do token (armazenar apenas o hash no banco)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Expiração: 1 hora
    const expiresAt = addMilliseconds(new Date(), 60 * 60 * 1000);

    // Invalidar tokens anteriores não utilizados deste usuário
    await this.prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    });

    // Criar novo token de reset
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: tokenHash,
        expiresAt,
        ipAddress: ipAddress || null,
      },
    });

    // Enviar email com link de recuperação
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password/${token}`;
    const tenantName = tenant?.profile?.tradeName || tenant?.name || 'Rafa ILPI';

    // Formatar data de expiração
    const expiresAtFormatted = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(expiresAt);

    await this.emailService.sendPasswordResetEmail(
      user.email,
      {
        name: user.name,
        resetUrl,
        expiresAt: expiresAtFormatted,
        tenantName,
      },
      user.tenantId!,
    );

    console.log(`🔐 Token de recuperação gerado para ${email}:`, token);
    console.log(`📧 Link de reset: ${resetUrl}`);

    return {
      message:
        'Se o email estiver cadastrado, você receberá um link de recuperação em breve.',
    };
  }

  /**
   * Resetar senha com token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    // Hash do token recebido para comparar com o banco
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Buscar token válido
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: {
        token: tokenHash,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            tenantId: true,
            versionNumber: true,
          },
        },
      },
    });

    // Validações de segurança
    if (!resetToken) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    if (resetToken.usedAt) {
      throw new BadRequestException('Token já foi utilizado');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Token expirado');
    }

    // Hash da nova senha
    const hashedPassword = await this.hashPassword(newPassword);

    // Incrementar versão do usuário
    const newVersionNumber = resetToken.user.versionNumber + 1;

    // Atualizar em transação atômica
    await this.prisma.$transaction(async (tx) => {
      // 1. Atualizar senha do usuário
      await tx.user.update({
        where: { id: resetToken.user.id },
        data: {
          password: hashedPassword,
          passwordResetRequired: false, // Remove flag de reset se existir
          versionNumber: newVersionNumber,
          updatedBy: resetToken.user.id, // Usuário atualiza a própria senha
        },
      });

      // 2. Marcar token como usado
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: {
          usedAt: new Date(),
        },
      });

      // 3. Invalidar TODOS os refresh tokens (força novo login em todas sessões)
      await tx.refreshToken.deleteMany({
        where: { userId: resetToken.user.id },
      });

      // 4. Criar entrada no histórico de auditoria
      await tx.userHistory.create({
        data: {
          tenantId: resetToken.user.tenantId!,
          userId: resetToken.user.id,
          versionNumber: newVersionNumber,
          changeType: ChangeType.UPDATE,
          changeReason: 'Senha resetada via recuperação de senha',
          previousData: {
            password: { passwordMasked: true },
            versionNumber: resetToken.user.versionNumber,
          } as Prisma.InputJsonValue,
          newData: {
            password: { passwordChanged: true },
            versionNumber: newVersionNumber,
          } as Prisma.InputJsonValue,
          changedFields: ['password'],
          changedAt: new Date(),
          changedBy: resetToken.user.id,
          changedByName: resetToken.user.name,
        },
      });

      // 5. Registrar log de acesso (PASSWORD_CHANGED)
      if (resetToken.user.tenantId) {
        await tx.accessLog.create({
          data: {
            userId: resetToken.user.id,
            tenantId: resetToken.user.tenantId,
            action: AccessAction.PASSWORD_CHANGED,
            status: 'SUCCESS',
            reason: 'Senha resetada via recuperação de senha',
            ipAddress: resetToken.ipAddress || 'IP Desconhecido',
            userAgent: 'Password Reset',
          },
        });
      }
    });

    return { message: 'Senha alterada com sucesso' };
  }

  /**
   * Gerar access token e refresh token
   */
  private async generateTokens(user: { id: string; email: string; tenantId: string | null; role: string; name: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Salvar refresh token no banco
   *
   * ⚠️ LÓGICA MANUAL DE MULTI-TENANCY (não usa TenantContext)
   *
   * IMPORTANTE: Salva no schema correto baseado em tenantId:
   * - tenantId = null → SUPERADMIN → public.refresh_tokens
   * - tenantId != null → Tenant user → tenant_xyz.refresh_tokens
   *
   * JUSTIFICATIVA:
   * Este método é chamado durante login/refresh, ANTES do TenantContext
   * ser inicializado pelo JwtAuthGuard. Não há contexto disponível ainda.
   *
   * @param userId - ID do usuário (UUID)
   * @param tenantId - ID do tenant (null = SUPERADMIN, UUID = tenant user)
   * @param token - Refresh token JWT assinado
   * @param ipAddress - IP da requisição (opcional, para auditoria)
   * @param userAgent - User-Agent do navegador (opcional, para detecção de device)
   */
  private async saveRefreshToken(
    userId: string,
    tenantId: string | null,
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const expiresIn =
      this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d';
    const expiresInMs = this.parseTimeToMs(expiresIn);
    const expiresAt = addMilliseconds(new Date(), expiresInMs);

    const device = this.parseUserAgent(userAgent);

    // ═══════════════════════════════════════════════════════════════════════
    // ROTEAMENTO MANUAL DE SCHEMA (Exceção Arquitetural)
    // ═══════════════════════════════════════════════════════════════════════
    // SUPERADMIN (tenantId=null) → public.refresh_tokens
    // Tenant User (tenantId!=null) → tenant_xyz.refresh_tokens
    //
    // NOTA: Não usa TenantContext porque este método é chamado DURANTE
    // o processo de autenticação, ANTES do contexto ser inicializado.
    // ═══════════════════════════════════════════════════════════════════════

    if (!tenantId) {
      // CASO 1: SUPERADMIN → Salvar em public schema
      await this.prisma.refreshToken.create({
        data: {
          userId,
          token,
          expiresAt,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          device: device || null,
          lastActivityAt: new Date(),
        },
      });
    } else {
      // CASO 2: Tenant User → Salvar no schema do tenant (cached)
      const schemaName = await this.getSchemaName(tenantId);
      const tenantClient = this.prisma.getTenantClient(schemaName);
      await tenantClient.refreshToken.create({
        data: {
          userId,
          token,
          expiresAt,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          device: device || null,
          lastActivityAt: new Date(),
        },
      });
    }
  }

  /**
   * Converter tempo (ex: "7d", "24h") para milissegundos
   */
  private parseTimeToMs(time: string): number {
    const unit = time.slice(-1);
    const value = parseInt(time.slice(0, -1));

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000; // 7 days default
    }
  }

  /**
   * Hash da senha
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Comparar senhas
   */
  private async comparePasswords(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Registrar log de acesso (LOGIN, LOGOUT, PASSWORD_CHANGED, etc)
   *
   * ⚠️ LÓGICA MANUAL DE MULTI-TENANCY (não usa TenantContext)
   *
   * IMPORTANTE: Salva no schema do tenant (tenant_xyz.access_logs)
   *
   * JUSTIFICATIVA:
   * Chamado durante login/logout, ANTES do TenantContext ser inicializado.
   * Precisa buscar o tenant manualmente para obter o schema correto.
   *
   * ARQUITETURA:
   * - AccessLogs são SEMPRE do tenant (nunca em public)
   * - SUPERADMIN não tem logs de acesso (tenantId sempre presente)
   * - Logs são append-only (nunca deletados, apenas arquivados)
   *
   * @param userId - ID do usuário (UUID)
   * @param tenantId - ID do tenant (sempre presente, nunca null)
   * @param action - Tipo de ação (LOGIN | LOGOUT | PASSWORD_CHANGED | SESSION_REVOKED)
   * @param status - Resultado (SUCCESS | FAILED)
   * @param ipAddress - IP da requisição (para auditoria de segurança)
   * @param userAgent - User-Agent do navegador (para detecção de device)
   * @param reason - Motivo de falha (ex: "INVALID_PASSWORD", "SESSION_EXPIRED")
   * @param metadata - Dados adicionais em JSON (opcional)
   */
  private async logAccess(
    userId: string,
    tenantId: string,
    action: AccessAction,
    status: 'SUCCESS' | 'FAILED',
    ipAddress?: string,
    userAgent?: string,
    reason?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const device = this.parseUserAgent(userAgent);

      // ═══════════════════════════════════════════════════════════════════════
      // ROTEAMENTO MANUAL DE SCHEMA (Exceção Arquitetural)
      // ═══════════════════════════════════════════════════════════════════════
      // AccessLogs são SEMPRE salvos no schema do tenant (tenant_xyz.access_logs)
      //
      // NOTA: Não usa TenantContext porque este método é chamado DURANTE
      // login/logout, ANTES do contexto ser inicializado pelo JwtAuthGuard.
      //
      // SEGURANÇA: Logs são append-only e isolados por tenant para compliance.
      // ═══════════════════════════════════════════════════════════════════════

      let schemaName: string;
      try {
        schemaName = await this.getSchemaName(tenantId);
      } catch (_error) {
        console.error(`Tenant ${tenantId} não encontrado ao registrar log de acesso`);
        return;
      }

      const tenantClient = this.prisma.getTenantClient(schemaName);
      await tenantClient.accessLog.create({
        data: {
          userId,
          tenantId,
          action,
          status,
          reason,
          ipAddress: ipAddress || 'IP Desconhecido',
          userAgent: userAgent || 'User-Agent Desconhecido',
          device,
          metadata: metadata as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      // Não lançar erro se falhar o log, apenas registrar no console
      console.error('Erro ao registrar log de acesso:', error);
    }
  }

  /**
   * Parsear User-Agent para extrair dispositivo e navegador
   */
  private parseUserAgent(userAgent?: string): string {
    if (!userAgent) return 'Dispositivo Desconhecido';

    // Detectar SO
    let os = 'Unknown OS';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    // Detectar navegador
    let browser = 'Unknown';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Edg')) browser = 'Edge';

    return `${browser} on ${os}`;
  }
}
