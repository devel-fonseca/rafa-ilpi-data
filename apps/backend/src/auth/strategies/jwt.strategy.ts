import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantCacheService } from '../../tenants/tenant-cache.service';
import { JwtCacheService } from '../jwt-cache.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tenantCacheService: TenantCacheService,
    private readonly jwtCache: JwtCacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string; tenantId?: string | null; role: string }) {
    // Payload contém: { sub, email, tenantId, role }

    // ✅ OTIMIZAÇÃO: Verificar cache primeiro (30s TTL)
    const cachedUser = this.jwtCache.get(payload.sub);
    if (cachedUser) {
      return cachedUser; // Cache HIT - sem query ao banco
    }

    // ✅ Arquitetura Híbrida: buscar em public (SUPERADMIN) ou tenant schema
    let user: { id: string; email: string; name: string; role: string; tenantId: string | null; isActive: boolean } | null = null;

    // STEP 1: Tentar buscar SUPERADMIN em public schema
    // eslint-disable-next-line no-restricted-syntax
    const superAdminUser = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        deletedAt: null,
        tenantId: null, // Apenas SUPERADMIN
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

    if (superAdminUser) {
      user = superAdminUser;
    } else {
      // STEP 2: Buscar em tenant schemas
      // Se JWT contém tenantId, buscar diretamente naquele tenant
      if (payload.tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: payload.tenantId },
          select: { schemaName: true },
        });

        if (tenant) {
          const tenantClient = this.prisma.getTenantClient(tenant.schemaName);
          user = await tenantClient.user.findFirst({
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
        }
      } else {
        // Se não tem tenantId no payload, buscar em todos os schemas (fallback)
        const tenants = await this.prisma.tenant.findMany({
          where: { deletedAt: null },
          select: { schemaName: true },
        });

        for (const tenant of tenants) {
          const tenantClient = this.prisma.getTenantClient(tenant.schemaName);
          const foundUser = await tenantClient.user.findFirst({
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

          if (foundUser) {
            user = foundUser;
            break;
          }
        }
      }
    }

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
    const userPayload = {
      sub: user.id, // Campo esperado pelo controller (req.user.sub)
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenant: tenant ? {
        id: tenant.id,
        name: tenant.name,
        schemaName: tenant.schemaName,
        isActive: ('isActive' in tenant ? tenant.isActive : true) as boolean,
      } : null,
    };

    // ✅ OTIMIZAÇÃO: Cachear resultado por 30 segundos
    this.jwtCache.set(user.id, userPayload);

    return userPayload;
  }
}
