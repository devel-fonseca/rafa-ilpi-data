import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Registra um novo usuário
   */
  async register(registerDto: RegisterDto) {
    const { tenantId, name, email, password } = registerDto;

    // Verificar se tenant existe
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: { include: { plan: true } } },
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

    const maxUsers = tenant.subscription?.plan.maxUsers || 0;
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
        role: userCount === 0 ? 'ADMIN' : 'USER', // Primeiro usuário é ADMIN
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

    return {
      message: 'Usuário criado com sucesso',
      user,
    };
  }

  /**
   * Login do usuário
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Buscar usuário
    const user = await this.prisma.user.findFirst({
      where: { email },
      include: {
        tenant: {
          include: {
            subscription: {
              include: { plan: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Verificar se usuário está ativo
    if (!user.isActive) {
      throw new UnauthorizedException('Usuário desativado');
    }

    // Verificar senha
    const isPasswordValid = await this.comparePasswords(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Gerar tokens
    const tokens = await this.generateTokens(user);

    // Salvar refresh token no banco
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    // Remover senha do retorno
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
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
