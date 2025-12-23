import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserProfilesService } from '../user-profiles/user-profiles.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SelectTenantDto } from './dto/select-tenant.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userProfilesService: UserProfilesService,
  ) {}

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

    // Verificar se email já existe para este tenant
    const existingUser = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('Email já cadastrado para este tenant');
    }

    // Verificar limite de usuários do plano
    const userCount = await this.prisma.user.count({
      where: { tenantId },
    });

    const maxUsers = tenant.subscriptions[0]?.plan.maxUsers || 0;
    if (maxUsers !== -1 && userCount >= maxUsers) {
      throw new BadRequestException(
        `Limite de ${maxUsers} usuários atingido para o plano atual`,
      );
    }

    // Hash da senha
    const hashedPassword = await this.hashPassword(password);

    // Criar usuário
    const user = await this.prisma.user.create({
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

    // Criar perfil vazio automaticamente para o usuário (exceto SUPERADMIN)
    if (user.tenantId) {
      try {
        await this.prisma.userProfile.create({
          data: {
            userId: user.id,
            tenantId: user.tenantId,
            createdBy: user.id, // O próprio usuário é o criador do perfil
          },
        });
      } catch (error) {
        // Se falhar ao criar perfil, apenas loga mas não interrompe o registro
        console.error('Erro ao criar perfil de usuário:', error);
      }
    }

    return {
      message: 'Usuário criado com sucesso',
      user,
    };
  }

  /**
   * Login do usuário - Verifica se tem múltiplos tenants
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Buscar todos os cadastros do usuário (pode ter múltiplos tenants ou SUPERADMIN)
    const users = await this.prisma.user.findMany({
      where: {
        email,
        isActive: true,
      },
      include: {
        profile: true, // Incluir perfil do usuário (positionCode, etc)
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
                  in: ['active', 'trialing'],
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
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // Gerar tokens
      const tokens = await this.generateTokens(user);

      // Salvar refresh token no banco
      await this.saveRefreshToken(user.id, tokens.refreshToken);

      // Remover senha do retorno e adicionar plan no tenant
      const { password: _, tenant, ...userWithoutPassword } = user;

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
  async selectTenant(selectTenantDto: SelectTenantDto) {
    const { email, password, tenantId } = selectTenantDto;

    // Buscar usuário no tenant específico
    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },
      include: {
        profile: true, // Incluir perfil do usuário (positionCode, etc)
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
                  in: ['active', 'trialing'],
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
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Gerar tokens
    const tokens = await this.generateTokens(user);

    // Salvar refresh token no banco
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    // Remover senha do retorno e adicionar plan no tenant
    const { password: _, tenant, ...userWithoutPassword } = user;

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

  /**
   * Renovar access token usando refresh token
   */
  async refresh(refreshToken: string) {
    try {
      // Verificar se refresh token existe no banco
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Refresh token inválido');
      }

      // Verificar se token expirou
      if (storedToken.expiresAt < new Date()) {
        // Remover token expirado
        await this.prisma.refreshToken.delete({
          where: { id: storedToken.id },
        });
        throw new UnauthorizedException('Refresh token expirado');
      }

      // Verificar se usuário está ativo
      if (!storedToken.user.isActive) {
        throw new UnauthorizedException('Usuário desativado');
      }

      // Gerar novos tokens
      const tokens = await this.generateTokens(storedToken.user);

      // Remover token antigo e salvar novo
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      await this.saveRefreshToken(storedToken.user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  /**
   * Logout (remover refresh token)
   */
  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { message: 'Logout realizado com sucesso' };
  }

  /**
   * Gerar access token e refresh token
   */
  private async generateTokens(user: any) {
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
   */
  private async saveRefreshToken(userId: string, token: string) {
    const expiresIn =
      this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d';
    const expiresInMs = this.parseTimeToMs(expiresIn);
    const expiresAt = new Date(Date.now() + expiresInMs);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
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
}
