import {
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { CreateDietaryRestrictionDto } from './dto/create-dietary-restriction.dto';
import { UpdateDietaryRestrictionDto } from './dto/update-dietary-restriction.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ChangeType } from '@prisma/client';

@Injectable()
export class DietaryRestrictionsService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Criar nova restrição alimentar COM versionamento
   */
  async create(
    userId: string,
    createDto: CreateDietaryRestrictionDto,
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

    const dietaryRestriction = await this.tenantContext.client.dietaryRestriction.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        residentId: createDto.residentId,
        restrictionType: createDto.restrictionType,
        description: createDto.description,
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
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.info('Restrição alimentar registrada com sucesso', {
      dietaryRestrictionId: dietaryRestriction.id,
      residentId: createDto.residentId,
      restrictionType: createDto.restrictionType,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    return dietaryRestriction;
  }

  /**
   * Listar todas as restrições alimentares de um residente
   */
  async findByResidentId(residentId: string) {
    return this.tenantContext.client.dietaryRestriction.findMany({
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
        creator: {
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
   * Buscar uma restrição alimentar específica
   */
  async findOne(id: string) {
    const dietaryRestriction = await this.tenantContext.client.dietaryRestriction.findFirst({
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
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!dietaryRestriction) {
      throw new NotFoundException('Restrição alimentar não encontrada');
    }

    return dietaryRestriction;
  }

  /**
   * Atualizar restrição alimentar COM versionamento
   */
  async update(
    userId: string,
    id: string,
    updateDto: UpdateDietaryRestrictionDto,
  ) {
    const { changeReason, ...updateData } = updateDto;

    const dietaryRestriction = await this.tenantContext.client.dietaryRestriction.findFirst({
      where: { id, deletedAt: null },
    });

    if (!dietaryRestriction) {
      this.logger.error('Erro ao atualizar restrição alimentar', {
        error: 'Restrição alimentar não encontrada',
        dietaryRestrictionId: id,
        tenantId: this.tenantContext.tenantId,
        userId,
      });
      throw new NotFoundException('Restrição alimentar não encontrada');
    }

    const previousData = {
      restrictionType: dietaryRestriction.restrictionType,
      description: dietaryRestriction.description,
      notes: dietaryRestriction.notes,
      residentId: dietaryRestriction.residentId,
      versionNumber: dietaryRestriction.versionNumber,
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

    const newVersionNumber = dietaryRestriction.versionNumber + 1;

    const result = await this.tenantContext.client.$transaction(async (tx) => {
      const updated = await tx.dietaryRestriction.update({
        where: { id },
        data: {
          ...(updateData as any),
          versionNumber: newVersionNumber,
          updatedBy: userId,
        },
      });

      const newData = {
        restrictionType: updated.restrictionType,
        description: updated.description,
        notes: updated.notes,
        residentId: updated.residentId,
        versionNumber: updated.versionNumber,
      };

      await tx.dietaryRestrictionHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          dietaryRestrictionId: id,
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

      return updated;
    });

    this.logger.info('Restrição alimentar atualizada com versionamento', {
      dietaryRestrictionId: id,
      versionNumber: newVersionNumber,
      changedFields,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    return result;
  }

  /**
   * Soft delete de restrição alimentar COM versionamento
   */
  async remove(
    userId: string,
    id: string,
    deleteReason: string,
  ) {
    const dietaryRestriction = await this.tenantContext.client.dietaryRestriction.findFirst({
      where: { id, deletedAt: null },
    });

    if (!dietaryRestriction) {
      this.logger.error('Erro ao remover restrição alimentar', {
        error: 'Restrição alimentar não encontrada',
        dietaryRestrictionId: id,
        tenantId: this.tenantContext.tenantId,
        userId,
      });
      throw new NotFoundException('Restrição alimentar não encontrada');
    }

    const previousData = {
      restrictionType: dietaryRestriction.restrictionType,
      description: dietaryRestriction.description,
      notes: dietaryRestriction.notes,
      residentId: dietaryRestriction.residentId,
      versionNumber: dietaryRestriction.versionNumber,
      deletedAt: null,
    };

    const newVersionNumber = dietaryRestriction.versionNumber + 1;

    const result = await this.tenantContext.client.$transaction(async (tx) => {
      const deleted = await tx.dietaryRestriction.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          versionNumber: newVersionNumber,
          updatedBy: userId,
        },
      });

      await tx.dietaryRestrictionHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          dietaryRestrictionId: id,
          versionNumber: newVersionNumber,
          changeType: ChangeType.DELETE,
          changeReason: deleteReason,
          previousData: previousData as any,
          newData: {
            ...previousData,
            deletedAt: deleted.deletedAt,
            versionNumber: newVersionNumber,
          } as any,
          changedFields: ['deletedAt'],
          changedAt: new Date(),
          changedBy: userId,
        },
      });

      return deleted;
    });

    this.logger.info('Restrição alimentar removida com versionamento', {
      dietaryRestrictionId: id,
      versionNumber: newVersionNumber,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    return {
      message: 'Restrição alimentar removida com sucesso',
      dietaryRestriction: result,
    };
  }

  /**
   * Consultar histórico completo de restrição alimentar
   */
  async getHistory(dietaryRestrictionId: string) {
    const dietaryRestriction = await this.tenantContext.client.dietaryRestriction.findFirst({
      where: { id: dietaryRestrictionId },
    });

    if (!dietaryRestriction) {
      this.logger.error('Erro ao consultar histórico de restrição alimentar', {
        error: 'Restrição alimentar não encontrada',
        dietaryRestrictionId,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException('Restrição alimentar não encontrada');
    }

    const history = await this.tenantContext.client.dietaryRestrictionHistory.findMany({
      where: {
        dietaryRestrictionId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    this.logger.info('Histórico de restrição alimentar consultado', {
      dietaryRestrictionId,
      totalVersions: history.length,
      tenantId: this.tenantContext.tenantId,
    });

    return {
      dietaryRestrictionId,
      restrictionType: dietaryRestriction.restrictionType,
      restrictionDescription: dietaryRestriction.restrictionType,
      description: dietaryRestriction.description,
      currentVersion: dietaryRestriction.versionNumber,
      totalVersions: history.length,
      history,
    };
  }

  /**
   * Consultar versão específica do histórico
   */
  async getHistoryVersion(
    dietaryRestrictionId: string,
    versionNumber: number,
  ) {
    const dietaryRestriction = await this.tenantContext.client.dietaryRestriction.findFirst({
      where: { id: dietaryRestrictionId },
    });

    if (!dietaryRestriction) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: 'Restrição alimentar não encontrada',
        dietaryRestrictionId,
        versionNumber,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException('Restrição alimentar não encontrada');
    }

    const historyVersion = await this.tenantContext.client.dietaryRestrictionHistory.findFirst({
      where: {
        dietaryRestrictionId,
        versionNumber,
      },
    });

    if (!historyVersion) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: `Versão ${versionNumber} não encontrada para esta restrição alimentar`,
        dietaryRestrictionId,
        versionNumber,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException(
        `Versão ${versionNumber} não encontrada para esta restrição alimentar`,
      );
    }

    this.logger.info('Versão específica do histórico consultada', {
      dietaryRestrictionId,
      versionNumber,
      tenantId: this.tenantContext.tenantId,
    });

    return historyVersion;
  }
}
