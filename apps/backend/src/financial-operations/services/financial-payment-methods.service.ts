import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantContextService } from '../../prisma/tenant-context.service';
import {
  CreatePaymentMethodDto,
  QueryPaymentMethodsDto,
  UpdatePaymentMethodDto,
} from '../dto';

@Injectable()
export class FinancialPaymentMethodsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  async findAll(query: QueryPaymentMethodsDto) {
    return this.tenantContext.client.financialPaymentMethod.findMany({
      where: {
        tenantId: this.tenantContext.tenantId,
        deletedAt: null,
        ...(query.activeOnly ? { isActive: true } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { code: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const method = await this.tenantContext.client.financialPaymentMethod.findFirst({
      where: {
        id,
        tenantId: this.tenantContext.tenantId,
        deletedAt: null,
      },
    });

    if (!method) {
      throw new NotFoundException('Método de pagamento não encontrado');
    }

    return method;
  }

  async create(dto: CreatePaymentMethodDto) {
    try {
      return await this.tenantContext.client.financialPaymentMethod.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          name: dto.name,
          code: dto.code,
          description: dto.description,
          // Tradeoff MVP: por decisão de produto, todo pagamento é baixa manual.
          // Mantemos o campo para compatibilidade futura sem romper schema/API.
          requiresManualConfirmation: true,
          allowsInstallments: dto.allowsInstallments ?? false,
          maxInstallments: dto.maxInstallments ?? 1,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Já existe método com este código');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdatePaymentMethodDto) {
    await this.findOne(id);

    try {
      return await this.tenantContext.client.financialPaymentMethod.update({
        where: { id },
        data: {
          ...dto,
          // Mesmo comportamento da criação: confirmação manual obrigatória.
          requiresManualConfirmation: true,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Já existe método com este código');
      }
      throw error;
    }
  }
}
