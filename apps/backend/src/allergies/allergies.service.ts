import {
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAllergyDto } from './dto/create-allergy.dto';
import { UpdateAllergyDto } from './dto/update-allergy-versioned.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ChangeType } from '@prisma/client';

@Injectable()
export class AllergiesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Criar nova alergia COM versionamento
   */
  async create(tenantId: string, userId: string, createDto: CreateAllergyDto) {
    // Verificar se residente existe e pertence ao tenant
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

    // Criar alergia
    const allergy = await this.prisma.allergy.create({
      data: {
        tenantId,
        residentId: createDto.residentId,
        substance: createDto.substance,
        reaction: createDto.reaction,
        severity: createDto.severity,
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

    this.logger.info('Alergia registrada com sucesso', {
      allergyId: allergy.id,
      residentId: createDto.residentId,
      substance: createDto.substance,
      tenantId,
      userId,
    });

    return allergy;
  }

  /**
   * Listar todas as alergias de um residente
   */
  async findByResidentId(tenantId: string, residentId: string) {
    return this.prisma.allergy.findMany({
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
   * Buscar uma alergia específica
   */
  async findOne(tenantId: string, id: string) {
    const allergy = await this.prisma.allergy.findFirst({
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

    if (!allergy) {
      throw new NotFoundException('Alergia não encontrada');
    }

    return allergy;
  }

  /**
   * Atualizar alergia COM versionamento
   */
  async update(
    tenantId: string,
    userId: string,
    id: string,
    updateDto: UpdateAllergyDto,
  ) {
    const { changeReason, ...updateData } = updateDto;

    // Buscar alergia existente
    const allergy = await this.prisma.allergy.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!allergy) {
      this.logger.error('Erro ao atualizar alergia', {
        error: 'Alergia não encontrada',
        allergyId: id,
        tenantId,
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
            JSON.stringify((previousData as any)[key])
        ) {
          changedFields.push(key as string);
        }
      },
    );

    const newVersionNumber = allergy.versionNumber + 1;

    // Executar update e criar histórico em transação atômica
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedAllergy = await tx.allergy.update({
        where: { id },
        data: {
          ...(updateData as any),
          versionNumber: newVersionNumber,
          updatedBy: userId,
        },
      });

      const newData = {
        substance: updatedAllergy.substance,
        reaction: updatedAllergy.reaction,
        severity: updatedAllergy.severity,
        notes: updatedAllergy.notes,
        residentId: updatedAllergy.residentId,
        versionNumber: updatedAllergy.versionNumber,
      };

      await tx.allergyHistory.create({
        data: {
          tenantId,
          allergyId: id,
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

      return updatedAllergy;
    });

    this.logger.info('Alergia atualizada com versionamento', {
      allergyId: id,
      versionNumber: newVersionNumber,
      changedFields,
      tenantId,
      userId,
    });

    return result;
  }

  /**
   * Soft delete de alergia COM versionamento
   */
  async remove(
    tenantId: string,
    userId: string,
    id: string,
    deleteReason: string,
  ) {
    const allergy = await this.prisma.allergy.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!allergy) {
      this.logger.error('Erro ao remover alergia', {
        error: 'Alergia não encontrada',
        allergyId: id,
        tenantId,
        userId,
      });
      throw new NotFoundException('Alergia não encontrada');
    }

    const previousData = {
      substance: allergy.substance,
      reaction: allergy.reaction,
      severity: allergy.severity,
      notes: allergy.notes,
      residentId: allergy.residentId,
      versionNumber: allergy.versionNumber,
      deletedAt: null,
    };

    const newVersionNumber = allergy.versionNumber + 1;

    const result = await this.prisma.$transaction(async (tx) => {
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
          tenantId,
          allergyId: id,
          versionNumber: newVersionNumber,
          changeType: ChangeType.DELETE,
          changeReason: deleteReason,
          previousData: previousData as any,
          newData: {
            ...previousData,
            deletedAt: deletedAllergy.deletedAt,
            versionNumber: newVersionNumber,
          } as any,
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
      tenantId,
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
  async getHistory(allergyId: string, tenantId: string) {
    const allergy = await this.prisma.allergy.findFirst({
      where: { id: allergyId, tenantId },
    });

    if (!allergy) {
      this.logger.error('Erro ao consultar histórico de alergia', {
        error: 'Alergia não encontrada',
        allergyId,
        tenantId,
      });
      throw new NotFoundException('Alergia não encontrada');
    }

    const history = await this.prisma.allergyHistory.findMany({
      where: {
        allergyId,
        tenantId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    this.logger.info('Histórico de alergia consultado', {
      allergyId,
      totalVersions: history.length,
      tenantId,
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
    tenantId: string,
  ) {
    const allergy = await this.prisma.allergy.findFirst({
      where: { id: allergyId, tenantId },
    });

    if (!allergy) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: 'Alergia não encontrada',
        allergyId,
        versionNumber,
        tenantId,
      });
      throw new NotFoundException('Alergia não encontrada');
    }

    const historyVersion = await this.prisma.allergyHistory.findFirst({
      where: {
        allergyId,
        versionNumber,
        tenantId,
      },
    });

    if (!historyVersion) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: `Versão ${versionNumber} não encontrada para esta alergia`,
        allergyId,
        versionNumber,
        tenantId,
      });
      throw new NotFoundException(
        `Versão ${versionNumber} não encontrada para esta alergia`,
      );
    }

    this.logger.info('Versão específica do histórico consultada', {
      allergyId,
      versionNumber,
      tenantId,
    });

    return historyVersion;
  }
}
