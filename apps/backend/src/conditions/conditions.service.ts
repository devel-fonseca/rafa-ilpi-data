import {
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { CreateConditionDto } from './dto/create-condition.dto';
import { UpdateConditionDto } from './dto/update-condition-versioned.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ChangeType, Prisma } from '@prisma/client';

@Injectable()
export class ConditionsService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Criar nova condição COM versionamento
   */
  async create(
    userId: string,
    createDto: CreateConditionDto,
  ) {
    const resident = await this.tenantContext.client.resident.findFirst({
      where: {
        id: createDto.residentId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    const condition = await this.tenantContext.client.condition.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        residentId: createDto.residentId,
        condition: createDto.condition,
        icdCode: createDto.icdCode,
        notes: createDto.notes,
        contraindications: createDto.contraindications,
        versionNumber: 1,
        createdBy: userId,
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.info('Condição registrada com sucesso', {
      conditionId: condition.id,
      residentId: createDto.residentId,
      condition: createDto.condition,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    return condition;
  }

  /**
   * Listar todas as condições de um residente
   */
  async findByResidentId(residentId: string) {
    return this.tenantContext.client.condition.findMany({
      where: {
        residentId,
        deletedAt: null,
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Buscar uma condição específica
   */
  async findOne(id: string) {
    const condition = await this.tenantContext.client.condition.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!condition) {
      throw new NotFoundException('Condição não encontrada');
    }

    return condition;
  }

  /**
   * Atualizar condição COM versionamento
   */
  async update(
    userId: string,
    id: string,
    updateDto: UpdateConditionDto,
  ) {
    const { changeReason, ...updateData } = updateDto;

    const condition = await this.tenantContext.client.condition.findFirst({
      where: { id, deletedAt: null },
    });

    if (!condition) {
      this.logger.error('Erro ao atualizar condição', {
        error: 'Condição não encontrada',
        conditionId: id,
        tenantId: this.tenantContext.tenantId,
        userId,
      });
      throw new NotFoundException('Condição não encontrada');
    }

    const previousData = {
      condition: condition.condition,
      icdCode: condition.icdCode,
      notes: condition.notes,
      contraindications: condition.contraindications,
      residentId: condition.residentId,
      versionNumber: condition.versionNumber,
    };

    const changedFields: string[] = [];
    (Object.keys(updateData) as Array<keyof typeof updateData>).forEach(
      (key) => {
        if (
          updateData[key] !== undefined &&
          JSON.stringify(updateData[key]) !==
            JSON.stringify((previousData as Record<string, unknown>)[key])
        ) {
          changedFields.push(key as string);
        }
      },
    );

    const newVersionNumber = condition.versionNumber + 1;

    const result = await this.tenantContext.client.$transaction(async (tx) => {
      const updatedCondition = await tx.condition.update({
        where: { id },
        data: {
          ...updateData,
          versionNumber: newVersionNumber,
          updatedBy: userId,
        },
      });

      const newData = {
        condition: updatedCondition.condition,
        icdCode: updatedCondition.icdCode,
        notes: updatedCondition.notes,
        contraindications: updatedCondition.contraindications,
        residentId: updatedCondition.residentId,
        versionNumber: updatedCondition.versionNumber,
      };

      await tx.conditionHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          conditionId: id,
          versionNumber: newVersionNumber,
          changeType: ChangeType.UPDATE,
          changeReason,
          previousData: previousData as Prisma.InputJsonValue,
          newData: newData as Prisma.InputJsonValue,
          changedFields,
          changedAt: new Date(),
          changedBy: userId,
        },
      });

      return updatedCondition;
    });

    this.logger.info('Condição atualizada com versionamento', {
      conditionId: id,
      versionNumber: newVersionNumber,
      changedFields,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    return result;
  }

  /**
   * Soft delete de condição COM versionamento
   */
  async remove(
    userId: string,
    id: string,
    deleteReason: string,
  ) {
    const condition = await this.tenantContext.client.condition.findFirst({
      where: { id, deletedAt: null },
    });

    if (!condition) {
      this.logger.error('Erro ao remover condição', {
        error: 'Condição não encontrada',
        conditionId: id,
        tenantId: this.tenantContext.tenantId,
        userId,
      });
      throw new NotFoundException('Condição não encontrada');
    }

    const previousData = {
      condition: condition.condition,
      icdCode: condition.icdCode,
      notes: condition.notes,
      contraindications: condition.contraindications,
      residentId: condition.residentId,
      versionNumber: condition.versionNumber,
      deletedAt: null,
    };

    const newVersionNumber = condition.versionNumber + 1;

    const result = await this.tenantContext.client.$transaction(async (tx) => {
      const deletedCondition = await tx.condition.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          versionNumber: newVersionNumber,
          updatedBy: userId,
        },
      });

      await tx.conditionHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          conditionId: id,
          versionNumber: newVersionNumber,
          changeType: ChangeType.DELETE,
          changeReason: deleteReason,
          previousData: previousData as Prisma.InputJsonValue,
          newData: {
            ...previousData,
            deletedAt: deletedCondition.deletedAt,
            versionNumber: newVersionNumber,
          } as Prisma.InputJsonValue,
          changedFields: ['deletedAt'],
          changedAt: new Date(),
          changedBy: userId,
        },
      });

      return deletedCondition;
    });

    this.logger.info('Condição removida com versionamento', {
      conditionId: id,
      versionNumber: newVersionNumber,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    return {
      message: 'Condição removida com sucesso',
      condition: result,
    };
  }

  /**
   * Consultar histórico completo de condição
   */
  async getHistory(conditionId: string) {
    const condition = await this.tenantContext.client.condition.findFirst({
      where: { id: conditionId },
    });

    if (!condition) {
      this.logger.error('Erro ao consultar histórico de condição', {
        error: 'Condição não encontrada',
        conditionId,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException('Condição não encontrada');
    }

    const history = await this.tenantContext.client.conditionHistory.findMany({
      where: {
        conditionId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    this.logger.info('Histórico de condição consultado', {
      conditionId,
      totalVersions: history.length,
      tenantId: this.tenantContext.tenantId,
    });

    return {
      conditionId,
      condition: condition.condition,
      conditionName: condition.condition,
      currentVersion: condition.versionNumber,
      totalVersions: history.length,
      history,
    };
  }

  /**
   * Consultar versão específica do histórico
   */
  async getHistoryVersion(
    conditionId: string,
    versionNumber: number,
  ) {
    const condition = await this.tenantContext.client.condition.findFirst({
      where: { id: conditionId },
    });

    if (!condition) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: 'Condição não encontrada',
        conditionId,
        versionNumber,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException('Condição não encontrada');
    }

    const historyVersion = await this.tenantContext.client.conditionHistory.findFirst({
      where: {
        conditionId,
        versionNumber,
      },
    });

    if (!historyVersion) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: `Versão ${versionNumber} não encontrada para esta condição`,
        conditionId,
        versionNumber,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException(
        `Versão ${versionNumber} não encontrada para esta condição`,
      );
    }

    this.logger.info('Versão específica do histórico consultada', {
      conditionId,
      versionNumber,
      tenantId: this.tenantContext.tenantId,
    });

    return historyVersion;
  }
}
