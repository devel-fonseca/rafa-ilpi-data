import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClinicalProfileDto } from './dto/create-clinical-profile.dto';
import { UpdateClinicalProfileDto } from './dto/update-clinical-profile.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ChangeType } from '@prisma/client';

@Injectable()
export class ClinicalProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Criar perfil clínico COM versionamento
   */
  async create(
    tenantId: string,
    userId: string,
    createDto: CreateClinicalProfileDto,
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

    const existing = await this.prisma.clinicalProfile.findFirst({
      where: {
        residentId: createDto.residentId,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Já existe um perfil clínico para este residente',
      );
    }

    const profile = await this.prisma.clinicalProfile.create({
      data: {
        tenantId,
        residentId: createDto.residentId,
        healthStatus: createDto.healthStatus,
        specialNeeds: createDto.specialNeeds,
        functionalAspects: createDto.functionalAspects,
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

    this.logger.info('Perfil clínico criado com sucesso', {
      profileId: profile.id,
      residentId: createDto.residentId,
      tenantId,
      userId,
    });

    return profile;
  }

  /**
   * Buscar perfil clínico de um residente
   */
  async findByResidentId(tenantId: string, residentId: string) {
    const profile = await this.prisma.clinicalProfile.findFirst({
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
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        updater: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(
        'Perfil clínico não encontrado para este residente',
      );
    }

    return profile;
  }

  /**
   * Buscar perfil clínico por ID
   */
  async findOne(tenantId: string, id: string) {
    const profile = await this.prisma.clinicalProfile.findFirst({
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
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        updater: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil clínico não encontrado');
    }

    return profile;
  }

  /**
   * Atualizar perfil clínico COM versionamento
   */
  async update(
    tenantId: string,
    userId: string,
    id: string,
    updateDto: UpdateClinicalProfileDto,
  ) {
    const { changeReason, ...updateData } = updateDto;

    const profile = await this.prisma.clinicalProfile.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!profile) {
      this.logger.error('Erro ao atualizar perfil clínico', {
        error: 'Perfil clínico não encontrado',
        profileId: id,
        tenantId,
        userId,
      });
      throw new NotFoundException('Perfil clínico não encontrado');
    }

    const previousData = {
      healthStatus: profile.healthStatus,
      specialNeeds: profile.specialNeeds,
      functionalAspects: profile.functionalAspects,
      residentId: profile.residentId,
      versionNumber: profile.versionNumber,
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

    const newVersionNumber = profile.versionNumber + 1;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedProfile = await tx.clinicalProfile.update({
        where: { id },
        data: {
          ...(updateData as any),
          versionNumber: newVersionNumber,
          updatedBy: userId,
        },
      });

      const newData = {
        healthStatus: updatedProfile.healthStatus,
        specialNeeds: updatedProfile.specialNeeds,
        functionalAspects: updatedProfile.functionalAspects,
        residentId: updatedProfile.residentId,
        versionNumber: updatedProfile.versionNumber,
      };

      await tx.clinicalProfileHistory.create({
        data: {
          tenantId,
          clinicalProfileId: id,
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

      return updatedProfile;
    });

    this.logger.info('Perfil clínico atualizado com versionamento', {
      profileId: id,
      versionNumber: newVersionNumber,
      changedFields,
      tenantId,
      userId,
    });

    return result;
  }

  /**
   * Soft delete de perfil clínico COM versionamento
   */
  async remove(
    tenantId: string,
    userId: string,
    id: string,
    deleteReason: string,
  ) {
    const profile = await this.prisma.clinicalProfile.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!profile) {
      this.logger.error('Erro ao remover perfil clínico', {
        error: 'Perfil clínico não encontrado',
        profileId: id,
        tenantId,
        userId,
      });
      throw new NotFoundException('Perfil clínico não encontrado');
    }

    const previousData = {
      healthStatus: profile.healthStatus,
      specialNeeds: profile.specialNeeds,
      functionalAspects: profile.functionalAspects,
      residentId: profile.residentId,
      versionNumber: profile.versionNumber,
      deletedAt: null,
    };

    const newVersionNumber = profile.versionNumber + 1;

    const result = await this.prisma.$transaction(async (tx) => {
      const deletedProfile = await tx.clinicalProfile.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          versionNumber: newVersionNumber,
          updatedBy: userId,
        },
      });

      await tx.clinicalProfileHistory.create({
        data: {
          tenantId,
          clinicalProfileId: id,
          versionNumber: newVersionNumber,
          changeType: ChangeType.DELETE,
          changeReason: deleteReason,
          previousData: previousData as any,
          newData: {
            ...previousData,
            deletedAt: deletedProfile.deletedAt,
            versionNumber: newVersionNumber,
          } as any,
          changedFields: ['deletedAt'],
          changedAt: new Date(),
          changedBy: userId,
        },
      });

      return deletedProfile;
    });

    this.logger.info('Perfil clínico removido com versionamento', {
      profileId: id,
      versionNumber: newVersionNumber,
      tenantId,
      userId,
    });

    return {
      message: 'Perfil clínico removido com sucesso',
      profile: result,
    };
  }

  /**
   * Consultar histórico completo de perfil clínico
   */
  async getHistory(profileId: string, tenantId: string) {
    const profile = await this.prisma.clinicalProfile.findFirst({
      where: { id: profileId, tenantId },
    });

    if (!profile) {
      this.logger.error('Erro ao consultar histórico de perfil clínico', {
        error: 'Perfil clínico não encontrado',
        profileId,
        tenantId,
      });
      throw new NotFoundException('Perfil clínico não encontrado');
    }

    const history = await this.prisma.clinicalProfileHistory.findMany({
      where: {
        clinicalProfileId: profileId,
        tenantId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    this.logger.info('Histórico de perfil clínico consultado', {
      profileId,
      totalVersions: history.length,
      tenantId,
    });

    return {
      clinicalProfileId: profileId,
      residentId: profile.residentId,
      healthStatus: profile.healthStatus,
      currentVersion: profile.versionNumber,
      totalVersions: history.length,
      history,
    };
  }

  /**
   * Consultar versão específica do histórico
   */
  async getHistoryVersion(
    profileId: string,
    versionNumber: number,
    tenantId: string,
  ) {
    const profile = await this.prisma.clinicalProfile.findFirst({
      where: { id: profileId, tenantId },
    });

    if (!profile) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: 'Perfil clínico não encontrado',
        profileId,
        versionNumber,
        tenantId,
      });
      throw new NotFoundException('Perfil clínico não encontrado');
    }

    const historyVersion = await this.prisma.clinicalProfileHistory.findFirst({
      where: {
        clinicalProfileId: profileId,
        versionNumber,
        tenantId,
      },
    });

    if (!historyVersion) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: `Versão ${versionNumber} não encontrada para este perfil clínico`,
        profileId,
        versionNumber,
        tenantId,
      });
      throw new NotFoundException(
        `Versão ${versionNumber} não encontrada para este perfil clínico`,
      );
    }

    this.logger.info('Versão específica do histórico consultada', {
      profileId,
      versionNumber,
      tenantId,
    });

    return historyVersion;
  }
}
