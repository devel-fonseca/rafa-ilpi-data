import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantCacheService } from '../../tenants/tenant-cache.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tenantCacheService: TenantCacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Payload contém: { sub, email, tenantId, role }
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário não autorizado');
    }

    // Buscar tenant do cache (otimização: evita JOIN e query pesada em toda request)
    let tenant = null;
    if (user.tenantId) {
      tenant = await this.tenantCacheService.get(user.tenantId);
    }

    // Retorna o usuário que será adicionado ao request
    // IMPORTANTE: O campo 'sub' é necessário para o controller
    return {
      sub: user.id, // Campo esperado pelo controller (req.user.sub)
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenant,
    };
  }
}
