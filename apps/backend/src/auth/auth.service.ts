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
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UserProfilesService } from '../user-profiles/user-profiles.service';
import { EmailService } from '../email/email.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SelectTenantDto } from './dto/select-tenant.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangeType, AccessAction } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userProfilesService: UserProfilesService,
    private readonly emailService: EmailService,
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

    // Criar usuário E perfil em transação atômica (tudo ou nada)
    const user = await this.prisma.$transaction(async (prisma) => {
      // 1. Criar usuário
      const newUser = await prisma.user.create({
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
        await prisma.userProfile.create({
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
   */
  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
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
      await this.saveRefreshToken(user.id, tokens.refreshToken, ipAddress, userAgent);

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
  async selectTenant(selectTenantDto: SelectTenantDto, ipAddress?: string, userAgent?: string) {
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
    await this.saveRefreshToken(user.id, tokens.refreshToken, ipAddress, userAgent);

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
  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
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
      await this.saveRefreshToken(
        storedToken.user.id,
        tokens.refreshToken,
        ipAddress || storedToken.ipAddress || undefined,
        userAgent || storedToken.userAgent || undefined,
      );

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  /**
   * Logout (remover refresh token)
   */
  async logout(userId: string, ipAddress?: string, userAgent?: string) {
    // Buscar usuário para obter tenantId
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tenantId: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // Remover todos os refresh tokens do usuário
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

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

    return { message: 'Logout realizado com sucesso' };
  }

  /**
   * Esqueci minha senha - Solicita recuperação de senha
   * Sempre retorna sucesso (mesmo se email não existe) para prevenir enumeração de usuários
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto, ipAddress?: string) {
    const { email } = forgotPasswordDto;

    // Buscar usuário por email (qualquer tenant)
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
        isActive: true,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            profile: {
              select: {
                tradeName: true,
              },
            },
          },
        },
      },
    });

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
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

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
    const tenantName = user.tenant?.profile?.tradeName || user.tenant?.name || 'Rafa ILPI';

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
          } as any,
          newData: {
            password: { passwordChanged: true },
            versionNumber: newVersionNumber,
          } as any,
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
  private async saveRefreshToken(
    userId: string,
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const expiresIn =
      this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d';
    const expiresInMs = this.parseTimeToMs(expiresIn);
    const expiresAt = new Date(Date.now() + expiresInMs);

    const device = this.parseUserAgent(userAgent);

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
   */
  private async logAccess(
    userId: string,
    tenantId: string,
    action: AccessAction,
    status: 'SUCCESS' | 'FAILED',
    ipAddress?: string,
    userAgent?: string,
    reason?: string,
    metadata?: any,
  ): Promise<void> {
    try {
      const device = this.parseUserAgent(userAgent);

      await this.prisma.accessLog.create({
        data: {
          userId,
          tenantId,
          action,
          status,
          reason,
          ipAddress: ipAddress || 'IP Desconhecido',
          userAgent: userAgent || 'User-Agent Desconhecido',
          device,
          metadata,
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
