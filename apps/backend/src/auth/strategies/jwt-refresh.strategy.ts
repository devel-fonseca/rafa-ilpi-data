import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_REFRESH_SECRET'),
    });
  }

  async validate(payload: any) {
    // ✅ Arquitetura Híbrida: buscar em public (SUPERADMIN) ou tenant schema
    let user: any = null;

    // STEP 1: Tentar buscar SUPERADMIN em public schema
    // eslint-disable-next-line no-restricted-syntax
    const superAdminUser = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      // Se encontrar aqui, é SUPERADMIN (tenantId: null)
    });

    if (superAdminUser && superAdminUser.tenantId === null) {
      user = superAdminUser;
    } else if (payload.tenantId) {
      // STEP 2: Buscar em tenant schema específico
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: payload.tenantId },
        select: { schemaName: true },
      });

      if (tenant) {
        const tenantClient = this.prisma.getTenantClient(tenant.schemaName);
        user = await tenantClient.user.findUnique({
          where: { id: payload.sub },
        });
      }
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário não autorizado');
    }

    return {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
    };
  }
}
