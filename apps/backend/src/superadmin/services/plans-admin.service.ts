import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { Prisma } from '@prisma/client'

/**
 * PlansAdminService
 *
 * Serviço para gerenciar Plans (Templates Globais de Planos).
 *
 * Funcionalidades:
 * - Listar todos os planos
 * - Atualizar planos (preço, limites, features)
 * - Toggle isPopular
 *
 * IMPORTANTE:
 * - Plans são templates globais que afetam TODOS os tenants
 * - Mudanças em Plans NÃO afetam subscriptions ativas (apenas novas)
 * - Para descontos personalizados, use SubscriptionAdminService
 */
@Injectable()
export class PlansAdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listar todos os planos
   */
  async findAll() {
    const plans = await this.prisma.plan.findMany({
      orderBy: [{ type: 'asc' }, { price: 'asc' }],
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    })

    // Formatar response com contagem de subscriptions ativas
    return Promise.all(
      plans.map(async (plan) => {
        const activeSubscriptionsCount = await this.prisma.subscription.count({
          where: {
            planId: plan.id,
            status: 'active',
          },
        })

        return {
          ...plan,
          totalSubscriptions: plan._count.subscriptions,
          activeSubscriptions: activeSubscriptionsCount,
        }
      }),
    )
  }

  /**
   * Buscar plano por ID
   */
  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    })

    if (!plan) {
      throw new NotFoundException(`Plano com ID ${id} não encontrado`)
    }

    return plan
  }

  /**
   * Atualizar plano (preço, limites, features)
   */
  async update(
    id: string,
    data: {
      price?: number
      annualDiscountPercent?: number
      maxUsers?: number
      maxResidents?: number
      displayName?: string
      features?: object
      isPopular?: boolean
      trialDays?: number
    },
  ) {
    // Validações
    if (data.price !== undefined && data.price < 0) {
      throw new BadRequestException('Preço não pode ser negativo')
    }
    if (data.annualDiscountPercent !== undefined) {
      if (data.annualDiscountPercent < 0 || data.annualDiscountPercent > 100) {
        throw new BadRequestException('Desconto anual deve estar entre 0 e 100%')
      }
    }
    if (data.maxUsers !== undefined && data.maxUsers < 1) {
      throw new BadRequestException('maxUsers deve ser no mínimo 1')
    }
    if (data.maxResidents !== undefined && data.maxResidents < 1) {
      throw new BadRequestException('maxResidents deve ser no mínimo 1')
    }

    // Verificar se plano existe
    await this.findOne(id)

    // Atualizar plano
    const updateData: Prisma.PlanUpdateInput = {}

    if (data.price !== undefined) {
      updateData.price = new Prisma.Decimal(data.price)
    }
    if (data.annualDiscountPercent !== undefined) {
      updateData.annualDiscountPercent = new Prisma.Decimal(data.annualDiscountPercent)
    }
    if (data.maxUsers !== undefined) {
      updateData.maxUsers = data.maxUsers
    }
    if (data.maxResidents !== undefined) {
      updateData.maxResidents = data.maxResidents
    }
    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName
    }
    if (data.features !== undefined) {
      updateData.features = data.features as Prisma.InputJsonValue
    }
    if (data.isPopular !== undefined) {
      updateData.isPopular = data.isPopular
    }
    if (data.trialDays !== undefined) {
      updateData.trialDays = data.trialDays
    }

    const updatedPlan = await this.prisma.plan.update({
      where: { id },
      data: updateData,
    })

    return updatedPlan
  }

  /**
   * Toggle isPopular flag
   */
  async togglePopular(id: string) {
    const plan = await this.findOne(id)

    const updatedPlan = await this.prisma.plan.update({
      where: { id },
      data: {
        isPopular: !plan.isPopular,
      },
    })

    return updatedPlan
  }

  /**
   * Toggle isActive flag
   * Permite ativar/desativar planos (exibição visual apenas)
   */
  async toggleActive(id: string) {
    const plan = await this.findOne(id)

    const updatedPlan = await this.prisma.plan.update({
      where: { id },
      data: {
        isActive: !plan.isActive,
      },
    })

    return updatedPlan
  }

  /**
   * Buscar estatísticas de um plano
   */
  async getStats(id: string) {
    await this.findOne(id)

    const [total, active, trialing, pastDue, canceled] = await Promise.all([
      this.prisma.subscription.count({ where: { planId: id } }),
      this.prisma.subscription.count({ where: { planId: id, status: 'active' } }),
      this.prisma.subscription.count({ where: { planId: id, status: 'trialing' } }),
      this.prisma.subscription.count({ where: { planId: id, status: 'past_due' } }),
      this.prisma.subscription.count({ where: { planId: id, status: 'canceled' } }),
    ])

    return {
      total,
      active,
      trialing,
      pastDue,
      canceled,
    }
  }
}
