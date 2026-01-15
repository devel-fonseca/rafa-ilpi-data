import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { CreateClinicalProfileDto } from './dto/create-clinical-profile.dto';
import { UpdateClinicalProfileDto } from './dto/update-clinical-profile.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ChangeType } from '@prisma/client';

@Injectable()
export class ClinicalProfilesService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Criar perfil clínico COM versionamento
   */
  async create(
    userId: string,
    createDto: CreateClinicalProfileDto,
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

    const existing = await this.tenantContext.client.clinicalProfile.findFirst({
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

    const profile = await this.tenantContext.client.clinicalProfile.create({
      data: {
        tenantId: this.tenantContext.tenantId,
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
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    return profile;
  }

  /**
   * Buscar perfil clínico de um residente
   */
  async findByResidentId(residentId: string) {
    const profile = await this.tenantContext.client.clinicalProfile.findFirst({
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
  async findOne(id: string) {
    const profile = await this.tenantContext.client.clinicalProfile.findFirst({
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
    userId: string,
    id: string,
    updateDto: UpdateClinicalProfileDto,
  ) {
    const { changeReason, mobilityAid, ...updateData } = updateDto;

    const profile = await this.tenantContext.client.clinicalProfile.findFirst({
      where: { id, deletedAt: null },
      include: {
        resident: true,
      },
    });

    if (!profile) {
      this.logger.error('Erro ao atualizar perfil clínico', {
        error: 'Perfil clínico não encontrado',
        profileId: id,
        tenantId: this.tenantContext.tenantId,
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

    const result = await this.tenantContext.client.$transaction(async (tx) => {
      // 1. Atualizar o perfil clínico
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

      // 2. Criar histórico do perfil clínico
      await tx.clinicalProfileHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
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

      // 3. Se mobilityAid foi fornecido, atualizar também o residente
      if (mobilityAid !== undefined && profile.resident.mobilityAid !== mobilityAid) {
        const residentPreviousMobilityAid = profile.resident.mobilityAid;
        const residentVersionNumber = profile.resident.versionNumber + 1;

        await tx.resident.update({
          where: { id: profile.residentId },
          data: {
            mobilityAid,
            versionNumber: residentVersionNumber,
            updatedBy: userId,
          },
        });

        // 4. Criar histórico no residente
        await tx.residentHistory.create({
          data: {
            tenantId: this.tenantContext.tenantId,
            residentId: profile.residentId,
            versionNumber: residentVersionNumber,
            changeType: ChangeType.UPDATE,
            changeReason: `Atualizado via edição de Aspectos Funcionais: ${changeReason}`,
            changedFields: ['mobilityAid'],
            previousData: {
              ...profile.resident,
              mobilityAid: residentPreviousMobilityAid,
            } as any,
            newData: {
              ...profile.resident,
              mobilityAid,
              versionNumber: residentVersionNumber,
            } as any,
            changedAt: new Date(),
            changedBy: userId,
          },
        });

        this.logger.info('Campo mobilityAid sincronizado com residente', {
          residentId: profile.residentId,
          previousValue: residentPreviousMobilityAid,
          newValue: mobilityAid,
          versionNumber: residentVersionNumber,
          tenantId: this.tenantContext.tenantId,
          userId,
        });
      }

      return updatedProfile;
    });

    this.logger.info('Perfil clínico atualizado com versionamento', {
      profileId: id,
      versionNumber: newVersionNumber,
      changedFields,
      mobilityAidUpdated: mobilityAid !== undefined,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    return result;
  }

  /**
   * Soft delete de perfil clínico COM versionamento
   */
  async remove(
    userId: string,
    id: string,
    deleteReason: string,
  ) {
    const profile = await this.tenantContext.client.clinicalProfile.findFirst({
      where: { id, deletedAt: null },
    });

    if (!profile) {
      this.logger.error('Erro ao remover perfil clínico', {
        error: 'Perfil clínico não encontrado',
        profileId: id,
        tenantId: this.tenantContext.tenantId,
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

    const result = await this.tenantContext.client.$transaction(async (tx) => {
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
          tenantId: this.tenantContext.tenantId,
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
      tenantId: this.tenantContext.tenantId,
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
  async getHistory(profileId: string) {
    const profile = await this.tenantContext.client.clinicalProfile.findFirst({
      where: { id: profileId },
    });

    if (!profile) {
      this.logger.error('Erro ao consultar histórico de perfil clínico', {
        error: 'Perfil clínico não encontrado',
        profileId,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException('Perfil clínico não encontrado');
    }

    const history = await this.tenantContext.client.clinicalProfileHistory.findMany({
      where: {
        clinicalProfileId: profileId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    this.logger.info('Histórico de perfil clínico consultado', {
      profileId,
      totalVersions: history.length,
      tenantId: this.tenantContext.tenantId,
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
  ) {
    const profile = await this.tenantContext.client.clinicalProfile.findFirst({
      where: { id: profileId },
    });

    if (!profile) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: 'Perfil clínico não encontrado',
        profileId,
        versionNumber,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException('Perfil clínico não encontrado');
    }

    const historyVersion = await this.tenantContext.client.clinicalProfileHistory.findFirst({
      where: {
        clinicalProfileId: profileId,
        versionNumber,
      },
    });

    if (!historyVersion) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: `Versão ${versionNumber} não encontrada para este perfil clínico`,
        profileId,
        versionNumber,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException(
        `Versão ${versionNumber} não encontrada para este perfil clínico`,
      );
    }

    this.logger.info('Versão específica do histórico consultada', {
      profileId,
      versionNumber,
      tenantId: this.tenantContext.tenantId,
    });

    return historyVersion;
  }
}
