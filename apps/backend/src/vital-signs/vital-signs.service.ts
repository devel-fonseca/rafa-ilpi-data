import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVitalSignDto } from './dto/create-vital-sign.dto';
import { UpdateVitalSignDto } from './dto/update-vital-sign.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ChangeType } from '@prisma/client';

@Injectable()
export class VitalSignsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Criar registro de sinais vitais COM versionamento
   */
  async create(
    tenantId: string,
    userId: string,
    createDto: CreateVitalSignDto,
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

    const vitalSign = await this.prisma.vitalSign.create({
      data: {
        tenantId,
        residentId: createDto.residentId,
        userId: createDto.userId || userId,
        timestamp: createDto.timestamp,
        systolicBloodPressure: createDto.systolicBloodPressure,
        diastolicBloodPressure: createDto.diastolicBloodPressure,
        temperature: createDto.temperature,
        heartRate: createDto.heartRate,
        oxygenSaturation: createDto.oxygenSaturation,
        bloodGlucose: createDto.bloodGlucose,
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
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.info('Sinal vital criado com sucesso', {
      vitalSignId: vitalSign.id,
      residentId: createDto.residentId,
      tenantId,
      userId,
    });

    return vitalSign;
  }

  /**
   * Buscar sinal vital por ID
   */
  async findOne(tenantId: string, id: string) {
    const vitalSign = await this.prisma.vitalSign.findFirst({
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
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!vitalSign) {
      throw new NotFoundException('Sinal vital não encontrado');
    }

    return vitalSign;
  }

  /**
   * Buscar sinais vitais de um residente
   */
  async findByResident(
    tenantId: string,
    residentId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: any = {
      tenantId,
      residentId,
      deletedAt: null,
    };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    return await this.prisma.vitalSign.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Atualizar sinal vital COM versionamento
   */
  async update(
    tenantId: string,
    userId: string,
    id: string,
    updateDto: UpdateVitalSignDto,
  ) {
    const { changeReason, ...updateData } = updateDto;

    const vitalSign = await this.prisma.vitalSign.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!vitalSign) {
      this.logger.error('Erro ao atualizar sinal vital', {
        error: 'Sinal vital não encontrado',
        vitalSignId: id,
        tenantId,
        userId,
      });
      throw new NotFoundException('Sinal vital não encontrado');
    }

    const previousData = {
      systolicBloodPressure: vitalSign.systolicBloodPressure,
      diastolicBloodPressure: vitalSign.diastolicBloodPressure,
      temperature: vitalSign.temperature,
      heartRate: vitalSign.heartRate,
      oxygenSaturation: vitalSign.oxygenSaturation,
      bloodGlucose: vitalSign.bloodGlucose,
      timestamp: vitalSign.timestamp,
      versionNumber: vitalSign.versionNumber,
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

    const newVersionNumber = vitalSign.versionNumber + 1;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedVitalSign = await tx.vitalSign.update({
        where: { id },
        data: {
          ...(updateData as any),
          versionNumber: newVersionNumber,
          updatedBy: userId,
        },
      });

      const newData = {
        systolicBloodPressure: updatedVitalSign.systolicBloodPressure,
        diastolicBloodPressure: updatedVitalSign.diastolicBloodPressure,
        temperature: updatedVitalSign.temperature,
        heartRate: updatedVitalSign.heartRate,
        oxygenSaturation: updatedVitalSign.oxygenSaturation,
        bloodGlucose: updatedVitalSign.bloodGlucose,
        timestamp: updatedVitalSign.timestamp,
        versionNumber: updatedVitalSign.versionNumber,
      };

      await tx.vitalSignHistory.create({
        data: {
          tenantId,
          vitalSignId: id,
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

      return updatedVitalSign;
    });

    this.logger.info('Sinal vital atualizado com versionamento', {
      vitalSignId: id,
      versionNumber: newVersionNumber,
      changedFields,
      tenantId,
      userId,
    });

    return result;
  }

  /**
   * Soft delete de sinal vital COM versionamento
   */
  async remove(
    tenantId: string,
    userId: string,
    id: string,
    deleteReason: string,
  ) {
    const vitalSign = await this.prisma.vitalSign.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!vitalSign) {
      this.logger.error('Erro ao remover sinal vital', {
        error: 'Sinal vital não encontrado',
        vitalSignId: id,
        tenantId,
        userId,
      });
      throw new NotFoundException('Sinal vital não encontrado');
    }

    const previousData = {
      systolicBloodPressure: vitalSign.systolicBloodPressure,
      diastolicBloodPressure: vitalSign.diastolicBloodPressure,
      temperature: vitalSign.temperature,
      heartRate: vitalSign.heartRate,
      oxygenSaturation: vitalSign.oxygenSaturation,
      bloodGlucose: vitalSign.bloodGlucose,
      timestamp: vitalSign.timestamp,
      versionNumber: vitalSign.versionNumber,
      deletedAt: null,
    };

    const newVersionNumber = vitalSign.versionNumber + 1;

    const result = await this.prisma.$transaction(async (tx) => {
      const deletedVitalSign = await tx.vitalSign.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          versionNumber: newVersionNumber,
          updatedBy: userId,
        },
      });

      await tx.vitalSignHistory.create({
        data: {
          tenantId,
          vitalSignId: id,
          versionNumber: newVersionNumber,
          changeType: ChangeType.DELETE,
          changeReason: deleteReason,
          previousData: previousData as any,
          newData: {
            ...previousData,
            deletedAt: deletedVitalSign.deletedAt,
            versionNumber: newVersionNumber,
          } as any,
          changedFields: ['deletedAt'],
          changedAt: new Date(),
          changedBy: userId,
        },
      });

      return deletedVitalSign;
    });

    this.logger.info('Sinal vital removido com versionamento', {
      vitalSignId: id,
      versionNumber: newVersionNumber,
      tenantId,
      userId,
    });

    return {
      message: 'Sinal vital removido com sucesso',
      vitalSign: result,
    };
  }

  /**
   * Consultar histórico completo de sinal vital
   */
  async getHistory(vitalSignId: string, tenantId: string) {
    const vitalSign = await this.prisma.vitalSign.findFirst({
      where: { id: vitalSignId, tenantId },
    });

    if (!vitalSign) {
      this.logger.error('Erro ao consultar histórico de sinal vital', {
        error: 'Sinal vital não encontrado',
        vitalSignId,
        tenantId,
      });
      throw new NotFoundException('Sinal vital não encontrado');
    }

    const history = await this.prisma.vitalSignHistory.findMany({
      where: {
        vitalSignId,
        tenantId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    this.logger.info('Histórico de sinal vital consultado', {
      vitalSignId,
      totalVersions: history.length,
      tenantId,
    });

    return {
      vitalSignId,
      residentId: vitalSign.residentId,
      timestamp: vitalSign.timestamp,
      systolicBloodPressure: vitalSign.systolicBloodPressure,
      diastolicBloodPressure: vitalSign.diastolicBloodPressure,
      temperature: vitalSign.temperature,
      heartRate: vitalSign.heartRate,
      oxygenSaturation: vitalSign.oxygenSaturation,
      bloodGlucose: vitalSign.bloodGlucose,
      currentVersion: vitalSign.versionNumber,
      totalVersions: history.length,
      history,
    };
  }

  /**
   * Consultar versão específica do histórico
   */
  async getHistoryVersion(
    vitalSignId: string,
    versionNumber: number,
    tenantId: string,
  ) {
    const vitalSign = await this.prisma.vitalSign.findFirst({
      where: { id: vitalSignId, tenantId },
    });

    if (!vitalSign) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: 'Sinal vital não encontrado',
        vitalSignId,
        versionNumber,
        tenantId,
      });
      throw new NotFoundException('Sinal vital não encontrado');
    }

    const historyVersion = await this.prisma.vitalSignHistory.findFirst({
      where: {
        vitalSignId,
        versionNumber,
        tenantId,
      },
    });

    if (!historyVersion) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: `Versão ${versionNumber} não encontrada para este sinal vital`,
        vitalSignId,
        versionNumber,
        tenantId,
      });
      throw new NotFoundException(
        `Versão ${versionNumber} não encontrada para este sinal vital`,
      );
    }

    this.logger.info('Versão específica do histórico consultada', {
      vitalSignId,
      versionNumber,
      tenantId,
    });

    return historyVersion;
  }
}
