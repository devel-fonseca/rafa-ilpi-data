import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { addDays } from 'date-fns'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * SubscriptionAdminService
 *
 * Serviço responsável pela gestão de subscriptions pelo SuperAdmin:
 * - Mudar plano de tenant (com validações)
 * - Estender período de trial
 * - Cancelar subscription
 * - Reativar subscription
 * - Aplicar descontos e preços personalizados
 * - Histórico de subscriptions
 */
@Injectable()
export class SubscriptionAdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mudar plano de um tenant
   * Cria nova subscription e cancela a antiga
   */
  async changePlan(tenantId: string, newPlanId: string, reason?: string) {
    // Buscar tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!tenant) {
      throw new NotFoundException(`Tenant com ID ${tenantId} não encontrado`)
    }

    // Buscar novo plano
    const newPlan = await this.prisma.plan.findUnique({
      where: { id: newPlanId },
    })

    if (!newPlan) {
      throw new NotFoundException(`Plano com ID ${newPlanId} não encontrado`)
    }

    // Verificar se já tem subscription ativa
    const currentSubscription = tenant.subscriptions[0]
    if (!currentSubscription) {
      throw new BadRequestException('Tenant não possui subscription ativa')
    }

    // Verificar se não é o mesmo plano
    if (currentSubscription.planId === newPlanId) {
      throw new BadRequestException('Tenant já está neste plano')
    }

    // Cancelar subscription antiga
    await this.prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        status: 'cancelled',
      },
    })

    // Criar nova subscription
    const now = new Date()
    const newSubscription = await this.prisma.subscription.create({
      data: {
        tenantId,
        planId: newPlanId,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: addDays(now, 30), // Padrão: 30 dias
      },
      include: { plan: true },
    })

    // Criar alerta de mudança de plano
    await this.prisma.systemAlert.create({
      data: {
        tenantId,
        type: 'SYSTEM_ERROR', // Usar tipo existente (TODO: adicionar PLAN_CHANGED)
        severity: 'INFO',
        title: 'Plano Alterado',
        message: `Plano alterado de "${currentSubscription.planId}" para "${newPlan.name}". ${reason || ''}`,
        metadata: {
          oldPlanId: currentSubscription.planId,
          newPlanId,
          reason,
        },
      },
    })

    return newSubscription
  }

  /**
   * Estender período atual de uma subscription
   */
  async extendPeriod(subscriptionId: string, days: number) {
    if (days <= 0 || days > 365) {
      throw new BadRequestException('Período deve ser entre 1 e 365 dias')
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    })

    if (!subscription) {
      throw new NotFoundException(`Subscription com ID ${subscriptionId} não encontrada`)
    }

    if (!subscription.currentPeriodEnd) {
      throw new BadRequestException('Subscription não possui período definido')
    }

    const newEndDate = addDays(subscription.currentPeriodEnd, days)

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { currentPeriodEnd: newEndDate },
      include: { plan: true, tenant: true },
    })

    // Criar alerta
    await this.prisma.systemAlert.create({
      data: {
        tenantId: subscription.tenantId,
        type: 'SYSTEM_ERROR',
        severity: 'INFO',
        title: 'Período de Subscription Estendido',
        message: `Subscription estendida por ${days} dias. Nova data de término: ${newEndDate.toLocaleDateString('pt-BR')}`,
        metadata: { days, newEndDate },
      },
    })

    return updated
  }

  /**
   * Cancelar subscription
   * Muda status para cancelled e registra motivo
   */
  async cancel(subscriptionId: string, reason: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tenant: true, plan: true },
    })

    if (!subscription) {
      throw new NotFoundException(`Subscription com ID ${subscriptionId} não encontrada`)
    }

    if (subscription.status === 'cancelled') {
      throw new BadRequestException('Subscription já está cancelada')
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'cancelled',
      },
    })

    // Criar alerta de cancelamento
    await this.prisma.systemAlert.create({
      data: {
        tenantId: subscription.tenantId,
        type: 'SUBSCRIPTION_CANCELLED',
        severity: 'WARNING',
        title: 'Subscription Cancelada',
        message: `Subscription do plano "${subscription.plan.name}" foi cancelada. Motivo: ${reason}`,
        metadata: { reason, planId: subscription.planId },
      },
    })

    // Atualizar status do tenant para CANCELLED
    await this.prisma.tenant.update({
      where: { id: subscription.tenantId },
      data: { status: 'CANCELLED' },
    })

    return updated
  }

  /**
   * Reativar subscription cancelada
   * Cria nova subscription baseada na anterior
   */
  async reactivate(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tenant: true, plan: true },
    })

    if (!subscription) {
      throw new NotFoundException(`Subscription com ID ${subscriptionId} não encontrada`)
    }

    if (subscription.status !== 'cancelled') {
      throw new BadRequestException('Apenas subscriptions canceladas podem ser reativadas')
    }

    // Criar nova subscription (não reativar a antiga)
    const now = new Date()
    const newSubscription = await this.prisma.subscription.create({
      data: {
        tenantId: subscription.tenantId,
        planId: subscription.planId,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: addDays(now, 30),
      },
      include: { plan: true },
    })

    // Reativar tenant
    await this.prisma.tenant.update({
      where: { id: subscription.tenantId },
      data: { status: 'ACTIVE' },
    })

    // Criar alerta
    await this.prisma.systemAlert.create({
      data: {
        tenantId: subscription.tenantId,
        type: 'SYSTEM_ERROR',
        severity: 'INFO',
        title: 'Subscription Reativada',
        message: `Subscription do plano "${subscription.plan.name}" foi reativada`,
        metadata: { oldSubscriptionId: subscriptionId, newSubscriptionId: newSubscription.id },
      },
    })

    return newSubscription
  }

  /**
   * Listar histórico de subscriptions de um tenant
   */
  async getHistory(tenantId: string) {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { tenantId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    })

    return subscriptions
  }

  /**
   * Buscar detalhes de uma subscription
   */
  async findOne(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        plan: true,
        tenant: {
          include: {
            _count: {
              select: {
                users: true,
                residents: true,
              },
            },
          },
        },
      },
    })

    if (!subscription) {
      throw new NotFoundException(`Subscription com ID ${id} não encontrada`)
    }

    return subscription
  }

  /**
   * Aplicar desconto percentual a uma subscription
   *
   * @param subscriptionId ID da subscription
   * @param discountPercent Desconto de 0 a 100 (ex: 20 = 20% de desconto)
   * @param reason Razão do desconto (ex: "Promoção Black Friday", "Cliente VIP")
   */
  async applyDiscount(subscriptionId: string, discountPercent: number, reason: string) {
    // Validações
    if (discountPercent < 0 || discountPercent > 100) {
      throw new BadRequestException('Desconto deve estar entre 0 e 100')
    }

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Razão do desconto é obrigatória')
    }

    // Buscar subscription
    const subscription = await this.findOne(subscriptionId)

    // Atualizar com desconto
    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        discountPercent: new Decimal(discountPercent),
        discountReason: reason,
        customPrice: null, // Limpar customPrice se existir
      },
      include: { plan: true, tenant: true },
    })

    // Criar alerta
    await this.prisma.systemAlert.create({
      data: {
        tenantId: subscription.tenantId,
        type: 'SYSTEM_ERROR',
        severity: 'INFO',
        title: 'Desconto Aplicado',
        message: `Desconto de ${discountPercent}% aplicado à subscription. Motivo: ${reason}`,
        metadata: { subscriptionId, discountPercent, reason },
      },
    })

    return updated
  }

  /**
   * Aplicar preço customizado a uma subscription (override total do plan.price)
   *
   * @param subscriptionId ID da subscription
   * @param customPrice Novo preço fixo (substitui plan.price completamente)
   * @param reason Razão do preço customizado
   */
  async applyCustomPrice(subscriptionId: string, customPrice: number, reason: string) {
    // Validações
    if (customPrice < 0) {
      throw new BadRequestException('Preço customizado não pode ser negativo')
    }

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Razão do preço customizado é obrigatória')
    }

    // Buscar subscription
    const subscription = await this.findOne(subscriptionId)

    // Atualizar com preço customizado
    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        customPrice: new Decimal(customPrice),
        discountPercent: null, // Limpar desconto se existir
        discountReason: reason,
      },
      include: { plan: true, tenant: true },
    })

    // Criar alerta
    await this.prisma.systemAlert.create({
      data: {
        tenantId: subscription.tenantId,
        type: 'SYSTEM_ERROR',
        severity: 'INFO',
        title: 'Preço Customizado Aplicado',
        message: `Preço customizado de R$ ${customPrice.toFixed(2)} aplicado à subscription. Motivo: ${reason}`,
        metadata: { subscriptionId, customPrice, reason },
      },
    })

    return updated
  }

  /**
   * Remover desconto/preço customizado de uma subscription
   * Volta a usar o preço base do plano
   */
  async removeDiscount(subscriptionId: string) {
    const subscription = await this.findOne(subscriptionId)

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        discountPercent: null,
        discountReason: null,
        customPrice: null,
      },
      include: { plan: true, tenant: true },
    })

    // Criar alerta
    await this.prisma.systemAlert.create({
      data: {
        tenantId: subscription.tenantId,
        type: 'SYSTEM_ERROR',
        severity: 'INFO',
        title: 'Desconto Removido',
        message: 'Subscription voltou a usar o preço base do plano',
        metadata: { subscriptionId },
      },
    })

    return updated
  }
}
