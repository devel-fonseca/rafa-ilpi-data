import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Plan, PlanType } from '@prisma/client';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista todos os planos disponíveis
   */
  async findAll(): Promise<Plan[]> {
    return this.prisma.plan.findMany({
      orderBy: {
        price: 'asc',
      },
    });
  }

  /**
   * Busca um plano específico por ID
   */
  async findOne(id: string): Promise<Plan> {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('Plano não encontrado');
    }

    return plan;
  }

  /**
   * Busca um plano por tipo (FREE, BASICO, PROFISSIONAL, ENTERPRISE)
   */
  async findByType(type: string): Promise<Plan> {
    const plan = await this.prisma.plan.findFirst({
      where: { type: type as PlanType },
    });

    if (!plan) {
      throw new NotFoundException(`Plano ${type} não encontrado`);
    }

    return plan;
  }

  /**
   * Compara dois planos e retorna informações sobre o upgrade/downgrade
   */
  async comparePlans(currentPlanId: string, targetPlanId: string) {
    const [currentPlan, targetPlan] = await Promise.all([
      this.findOne(currentPlanId),
      this.findOne(targetPlanId),
    ]);

    const currentPrice = currentPlan.price ? Number(currentPlan.price) : 0;
    const targetPrice = targetPlan.price ? Number(targetPlan.price) : 0;

    const isUpgrade = targetPrice > currentPrice;
    const isDowngrade = targetPrice < currentPrice;

    return {
      currentPlan,
      targetPlan,
      isUpgrade,
      isDowngrade,
      priceDifference: targetPrice - currentPrice,
      residentsDifference: targetPlan.maxResidents - currentPlan.maxResidents,
      usersDifference: targetPlan.maxUsers - currentPlan.maxUsers,
    };
  }
}