import {
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConditionDto } from './dto/create-condition.dto';
import { UpdateConditionDto } from './dto/update-condition-versioned.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ChangeType } from '@prisma/client';

@Injectable()
export class ConditionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Criar nova condição COM versionamento
   */
  async create(
    tenantId: string,
    userId: string,
    createDto: CreateConditionDto,
  ) {
    const resident = await this.prisma.resident.findFirst({
      where: {
        id: createDto.residentId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    const condition = await this.prisma.condition.create({
      data: {
        tenantId,
        residentId: createDto.residentId,
        condition: createDto.condition,
        icdCode: createDto.icdCode,
        notes: createDto.notes,
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
      tenantId,
      userId,
    });

    return condition;
  }

  /**
   * Listar todas as condições de um residente
   */
  async findByResidentId(tenantId: string, residentId: string) {
    return this.prisma.condition.findMany({
      where: {
        residentId,
        tenantId,
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
  async findOne(tenantId: string, id: string) {
    const condition = await this.prisma.condition.findFirst({
      where: {
        id,
        tenantId,
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
    tenantId: string,
    userId: string,
    id: string,
    updateDto: UpdateConditionDto,
  ) {
    const { changeReason, ...updateData } = updateDto;

    const condition = await this.prisma.condition.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!condition) {
      this.logger.error('Erro ao atualizar condição', {
        error: 'Condição não encontrada',
        conditionId: id,
        tenantId,
        userId,
      });
      throw new NotFoundException('Condição não encontrada');
    }

    const previousData = {
      condition: condition.condition,
      icdCode: condition.icdCode,
      notes: condition.notes,
      residentId: condition.residentId,
      versionNumber: condition.versionNumber,
    };

    const changedFields: string[] = [];
    (Object.keys(updateData) as Array<keyof typeof updateData>).forEach(
      (key) => {
        if (
          updateData[key] !== undefined &&
          JSON.stringify(updateData[key]) !==
            JSON.stringify((previousData as any)[key])
        ) {
          changedFields.push(key as string);
        }
      },
    );

    const newVersionNumber = condition.versionNumber + 1;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedCondition = await tx.condition.update({
        where: { id },
        data: {
          ...(updateData as any),
          versionNumber: newVersionNumber,
          updatedBy: userId,
        },
      });

      const newData = {
        condition: updatedCondition.condition,
        icdCode: updatedCondition.icdCode,
        notes: updatedCondition.notes,
        residentId: updatedCondition.residentId,
        versionNumber: updatedCondition.versionNumber,
      };

      await tx.conditionHistory.create({
        data: {
          tenantId,
          conditionId: id,
          versionNumber: newVersionNumber,
          changeType: ChangeType.UPDATE,
          changeReason,
          previousData: previousData as any,
          newData: newData as any,
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
      tenantId,
      userId,
    });

    return result;
  }

  /**
   * Soft delete de condição COM versionamento
   */
  async remove(
    tenantId: string,
    userId: string,
    id: string,
    deleteReason: string,
  ) {
    const condition = await this.prisma.condition.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!condition) {
      this.logger.error('Erro ao remover condição', {
        error: 'Condição não encontrada',
        conditionId: id,
        tenantId,
        userId,
      });
      throw new NotFoundException('Condição não encontrada');
    }

    const previousData = {
      condition: condition.condition,
      icdCode: condition.icdCode,
      notes: condition.notes,
      residentId: condition.residentId,
      versionNumber: condition.versionNumber,
      deletedAt: null,
    };

    const newVersionNumber = condition.versionNumber + 1;

    const result = await this.prisma.$transaction(async (tx) => {
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
          tenantId,
          conditionId: id,
          versionNumber: newVersionNumber,
          changeType: ChangeType.DELETE,
          changeReason: deleteReason,
          previousData: previousData as any,
          newData: {
            ...previousData,
            deletedAt: deletedCondition.deletedAt,
            versionNumber: newVersionNumber,
          } as any,
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
      tenantId,
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
  async getHistory(conditionId: string, tenantId: string) {
    const condition = await this.prisma.condition.findFirst({
      where: { id: conditionId, tenantId },
    });

    if (!condition) {
      this.logger.error('Erro ao consultar histórico de condição', {
        error: 'Condição não encontrada',
        conditionId,
        tenantId,
      });
      throw new NotFoundException('Condição não encontrada');
    }

    const history = await this.prisma.conditionHistory.findMany({
      where: {
        conditionId,
        tenantId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    this.logger.info('Histórico de condição consultado', {
      conditionId,
      totalVersions: history.length,
      tenantId,
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
    tenantId: string,
  ) {
    const condition = await this.prisma.condition.findFirst({
      where: { id: conditionId, tenantId },
    });

    if (!condition) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: 'Condição não encontrada',
        conditionId,
        versionNumber,
        tenantId,
      });
      throw new NotFoundException('Condição não encontrada');
    }

    const historyVersion = await this.prisma.conditionHistory.findFirst({
      where: {
        conditionId,
        versionNumber,
        tenantId,
      },
    });

    if (!historyVersion) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: `Versão ${versionNumber} não encontrada para esta condição`,
        conditionId,
        versionNumber,
        tenantId,
      });
      throw new NotFoundException(
        `Versão ${versionNumber} não encontrada para esta condição`,
      );
    }

    this.logger.info('Versão específica do histórico consultada', {
      conditionId,
      versionNumber,
      tenantId,
    });

    return historyVersion;
  }
}
