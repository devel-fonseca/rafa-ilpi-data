import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ACTIVE_STATUSES } from '../../payments/types/subscription-status.enum';

/**
 * FeatureGuard - Guard para validar acesso baseado em features do plano
 *
 * Este guard verifica se o tenant do usuário tem acesso às features
 * requeridas pelo endpoint através do decorator @RequireFeatures
 *
 * Casos especiais:
 * - SUPERADMIN (tenantId = null): Acesso total sem validação
 * - TRIAL: respeita as features efetivas (plano + customizações)
 * - Core Features: residentes, usuarios, prontuario sempre permitidos
 *
 * @example
 * @Get('messages')
 * @UseGuards(JwtAuthGuard, FeatureGuard)
 * @RequireFeatures('mensagens')
 * async getMessages() { ... }
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  // Features core que estão sempre habilitadas em todos os planos
  private readonly CORE_FEATURES = ['residentes', 'usuarios', 'prontuario'];

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Obter features requeridas do decorator @RequireFeatures
    const requiredFeatures = this.reflector.getAllAndOverride<string[]>(
      'requiredFeatures',
      [context.getHandler(), context.getClass()],
    );

    // Se nenhuma feature é requerida, permitir acesso
    if (!requiredFeatures || requiredFeatures.length === 0) {
      return true;
    }

    // 2. Obter usuário do request (injetado pelo JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // SUPERADMIN (tenantId = null) tem acesso total sem validação
    if (!user?.tenantId) {
      return true;
    }

    // 3. Verificar se todas as features requeridas são core features
    const allAreCore = requiredFeatures.every((feature) =>
      this.CORE_FEATURES.includes(feature),
    );

    if (allAreCore) {
      return true; // Core features sempre permitidas
    }

    // 4. Buscar subscription ativa do tenant
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId: user.tenantId,
        status: { in: ACTIVE_STATUSES },
      },
      include: {
        plan: true,
        tenant: {
          select: { customFeatures: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new ForbiddenException(
        'Seu plano não está ativo. Entre em contato com o suporte.',
      );
    }

    // 5. Resolver features efetivas:
    // subscribedFeatures (snapshot) -> plan.features -> customFeatures (override)
    const subscribedFeatures =
      (subscription.subscribedFeatures as Record<string, boolean>) || {};
    const planFeatures =
      (subscription.plan.features as Record<string, boolean>) || {};
    const customFeatures =
      (subscription.tenant?.customFeatures as Record<string, boolean>) || {};

    const baseFeatures =
      Object.keys(subscribedFeatures).length > 0
        ? subscribedFeatures
        : planFeatures;

    const effectiveFeatures: Record<string, boolean> = { ...baseFeatures };
    Object.entries(customFeatures).forEach(([key, value]) => {
      if (value === false) {
        delete effectiveFeatures[key];
      } else if (value === true) {
        effectiveFeatures[key] = true;
      }
    });

    // Filtrar apenas features não-core para validação
    const nonCoreFeatures = requiredFeatures.filter(
      (feature) => !this.CORE_FEATURES.includes(feature),
    );

    const missingFeatures = nonCoreFeatures.filter(
      (feature) => effectiveFeatures[feature] !== true,
    );

    if (missingFeatures.length > 0) {
      const featureLabels = missingFeatures.join(', ');
      throw new ForbiddenException(
        `Seu plano não inclui: ${featureLabels}. Faça upgrade para acessar este recurso.`,
      );
    }

    return true;
  }
}
