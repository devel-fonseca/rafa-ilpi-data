import {
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { CreateAllergyDto } from './dto/create-allergy.dto';
import { UpdateAllergyDto } from './dto/update-allergy-versioned.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ChangeType, Prisma } from '@prisma/client';
import { AllergyVersionData } from './interfaces/allergy-version-data.interface';

@Injectable()
export class AllergiesService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Criar nova alergia COM versionamento
   */
  async create(userId: string, createDto: CreateAllergyDto) {
    // Verificar se residente existe
    const resident = await this.tenantContext.client.resident.findFirst({
      where: {
        id: createDto.residentId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    // Criar alergia
    const allergy = await this.tenantContext.client.allergy.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        residentId: createDto.residentId,
        substance: createDto.substance,
        reaction: createDto.reaction,
        severity: createDto.severity,
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

    this.logger.info('Alergia registrada com sucesso', {
      allergyId: allergy.id,
      residentId: createDto.residentId,
      substance: createDto.substance,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    return allergy;
  }

  /**
   * Listar todas as alergias de um residente
   */
  async findByResidentId(residentId: string) {
    return this.tenantContext.client.allergy.findMany({
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
   * Buscar uma alergia específica
   */
  async findOne(id: string) {
    const allergy = await this.tenantContext.client.allergy.findFirst({
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

    if (!allergy) {
      throw new NotFoundException('Alergia não encontrada');
    }

    return allergy;
  }

  /**
   * Atualizar alergia COM versionamento
   */
  async update(
    userId: string,
    id: string,
    updateDto: UpdateAllergyDto,
  ) {
    const { changeReason, ...updateData } = updateDto;

    // Buscar alergia existente
    const allergy = await this.tenantContext.client.allergy.findFirst({
      where: { id, deletedAt: null },
    });

    if (!allergy) {
      this.logger.error('Erro ao atualizar alergia', {
        error: 'Alergia não encontrada',
        allergyId: id,
        tenantId: this.tenantContext.tenantId,
        userId,
      });
      throw new NotFoundException('Alergia não encontrada');
    }

    // Capturar estado anterior
    const previousData = {
      substance: allergy.substance,
      reaction: allergy.reaction,
      severity: allergy.severity,
      notes: allergy.notes,
      contraindications: allergy.contraindications,
      residentId: allergy.residentId,
      versionNumber: allergy.versionNumber,
    };

    // Detectar campos alterados
    const changedFields: string[] = [];
    (Object.keys(updateData) as Array<keyof typeof updateData>).forEach(
      (key) => {
        if (
          updateData[key] !== undefined &&
          JSON.stringify(updateData[key]) !==
            JSON.stringify((previousData as AllergyVersionData)[key])
        ) {
          changedFields.push(key as string);
        }
      },
    );

    const newVersionNumber = allergy.versionNumber + 1;

    // Executar update e criar histórico em transação atômica
    const result = await this.tenantContext.client.$transaction(async (tx) => {
      const updatedAllergy = await tx.allergy.update({
        where: { id },
        data: {
          ...updateData,
          versionNumber: newVersionNumber,
          updatedBy: userId,
        },
      });

      const newData = {
        substance: updatedAllergy.substance,
        reaction: updatedAllergy.reaction,
        severity: updatedAllergy.severity,
        notes: updatedAllergy.notes,
        contraindications: updatedAllergy.contraindications,
        residentId: updatedAllergy.residentId,
        versionNumber: updatedAllergy.versionNumber,
      };

      await tx.allergyHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          allergyId: id,
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

      return updatedAllergy;
    });

    this.logger.info('Alergia atualizada com versionamento', {
      allergyId: id,
      versionNumber: newVersionNumber,
      changedFields,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    return result;
  }

  /**
   * Soft delete de alergia COM versionamento
   */
  async remove(
    userId: string,
    id: string,
    deleteReason: string,
  ) {
    const allergy = await this.tenantContext.client.allergy.findFirst({
      where: { id, deletedAt: null },
    });

    if (!allergy) {
      this.logger.error('Erro ao remover alergia', {
        error: 'Alergia não encontrada',
        allergyId: id,
        tenantId: this.tenantContext.tenantId,
        userId,
      });
      throw new NotFoundException('Alergia não encontrada');
    }

    const previousData = {
      substance: allergy.substance,
      reaction: allergy.reaction,
      severity: allergy.severity,
      notes: allergy.notes,
      contraindications: allergy.contraindications,
      residentId: allergy.residentId,
      versionNumber: allergy.versionNumber,
      deletedAt: null,
    };

    const newVersionNumber = allergy.versionNumber + 1;

    const result = await this.tenantContext.client.$transaction(async (tx) => {
      const deletedAllergy = await tx.allergy.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          versionNumber: newVersionNumber,
          updatedBy: userId,
        },
      });

      await tx.allergyHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          allergyId: id,
          versionNumber: newVersionNumber,
          changeType: ChangeType.DELETE,
          changeReason: deleteReason,
          previousData: previousData as Prisma.InputJsonValue,
          newData: {
            ...previousData,
            deletedAt: deletedAllergy.deletedAt,
            versionNumber: newVersionNumber,
          } as Prisma.InputJsonValue,
          changedFields: ['deletedAt'],
          changedAt: new Date(),
          changedBy: userId,
        },
      });

      return deletedAllergy;
    });

    this.logger.info('Alergia removida com versionamento', {
      allergyId: id,
      versionNumber: newVersionNumber,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    return {
      message: 'Alergia removida com sucesso',
      allergy: result,
    };
  }

  /**
   * Consultar histórico completo de alergia
   */
  async getHistory(allergyId: string) {
    const allergy = await this.tenantContext.client.allergy.findFirst({
      where: { id: allergyId },
    });

    if (!allergy) {
      this.logger.error('Erro ao consultar histórico de alergia', {
        error: 'Alergia não encontrada',
        allergyId,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException('Alergia não encontrada');
    }

    const history = await this.tenantContext.client.allergyHistory.findMany({
      where: {
        allergyId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    this.logger.info('Histórico de alergia consultado', {
      allergyId,
      totalVersions: history.length,
      tenantId: this.tenantContext.tenantId,
    });

    return {
      allergyId,
      substance: allergy.substance,
      allergySubstance: allergy.substance,
      currentVersion: allergy.versionNumber,
      totalVersions: history.length,
      history,
    };
  }

  /**
   * Consultar versão específica do histórico
   */
  async getHistoryVersion(
    allergyId: string,
    versionNumber: number,
  ) {
    const allergy = await this.tenantContext.client.allergy.findFirst({
      where: { id: allergyId },
    });

    if (!allergy) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: 'Alergia não encontrada',
        allergyId,
        versionNumber,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException('Alergia não encontrada');
    }

    const historyVersion = await this.tenantContext.client.allergyHistory.findFirst({
      where: {
        allergyId,
        versionNumber,
      },
    });

    if (!historyVersion) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: `Versão ${versionNumber} não encontrada para esta alergia`,
        allergyId,
        versionNumber,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException(
        `Versão ${versionNumber} não encontrada para esta alergia`,
      );
    }

    this.logger.info('Versão específica do histórico consultada', {
      allergyId,
      versionNumber,
      tenantId: this.tenantContext.tenantId,
    });

    return historyVersion;
  }
}
