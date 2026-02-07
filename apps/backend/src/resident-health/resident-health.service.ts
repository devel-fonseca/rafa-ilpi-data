import {
  Injectable,
  Scope,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ChangeType, Prisma } from '@prisma/client';
import { parseISO } from 'date-fns';
import { TenantContextService } from '../prisma/tenant-context.service';
import {
  CreateResidentBloodTypeDto,
  UpdateResidentBloodTypeDto,
  CreateResidentAnthropometryDto,
  UpdateResidentAnthropometryDto,
  CreateResidentDependencyAssessmentDto,
  UpdateResidentDependencyAssessmentDto,
} from './dto';

@Injectable({ scope: Scope.REQUEST })
export class ResidentHealthService {
  private readonly logger = new Logger(ResidentHealthService.name);

  constructor(private readonly tenantContext: TenantContextService) {}

  // ============================================================================
  // BLOOD TYPE
  // ============================================================================

  async getBloodType(residentId: string) {
    return this.tenantContext.client.residentBloodType.findFirst({
      where: {
        residentId,
        deletedAt: null,
      },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
        updatedByUser: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async createBloodType(userId: string, dto: CreateResidentBloodTypeDto) {
    // Verificar se já existe registro para este residente
    const existing = await this.tenantContext.client.residentBloodType.findFirst({
      where: { residentId: dto.residentId, deletedAt: null },
    });

    if (existing) {
      throw new BadRequestException(
        'Já existe um registro de tipo sanguíneo para este residente. Use a atualização.',
      );
    }

    const result = await this.tenantContext.client.$transaction(async (tx) => {
      const bloodType = await tx.residentBloodType.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          residentId: dto.residentId,
          bloodType: dto.bloodType,
          source: dto.source || null,
          confirmedAt: dto.confirmedAt ? parseISO(dto.confirmedAt) : null,
          createdBy: userId,
        },
      });

      // Criar histórico
      await tx.residentBloodTypeHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          residentBloodTypeId: bloodType.id,
          versionNumber: 1,
          changeType: ChangeType.CREATE,
          changeReason: 'Registro inicial de tipo sanguíneo',
          previousData: Prisma.JsonNull,
          newData: bloodType as unknown as Prisma.InputJsonValue,
          changedFields: ['bloodType', 'source', 'confirmedAt'],
          changedAt: new Date(),
          changedBy: userId,
        },
      });

      return bloodType;
    });

    this.logger.log(
      `Tipo sanguíneo registrado: ${dto.bloodType} para residente ${dto.residentId}`,
    );

    return result;
  }

  async updateBloodType(
    userId: string,
    id: string,
    dto: UpdateResidentBloodTypeDto,
  ) {
    const { changeReason, ...updateData } = dto;

    const existing = await this.tenantContext.client.residentBloodType.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Registro de tipo sanguíneo não encontrado');
    }

    const newVersion = existing.versionNumber + 1;

    const result = await this.tenantContext.client.$transaction(async (tx) => {
      const updated = await tx.residentBloodType.update({
        where: { id },
        data: {
          ...updateData,
          confirmedAt: updateData.confirmedAt
            ? parseISO(updateData.confirmedAt)
            : existing.confirmedAt,
          versionNumber: newVersion,
          updatedBy: userId,
        },
      });

      await tx.residentBloodTypeHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          residentBloodTypeId: id,
          versionNumber: newVersion,
          changeType: ChangeType.UPDATE,
          changeReason,
          previousData: existing as unknown as Prisma.InputJsonValue,
          newData: updated as unknown as Prisma.InputJsonValue,
          changedFields: Object.keys(updateData),
          changedAt: new Date(),
          changedBy: userId,
        },
      });

      return updated;
    });

    this.logger.log(`Tipo sanguíneo atualizado: ${id} (v${newVersion})`);

    return result;
  }

  // ============================================================================
  // ANTHROPOMETRY
  // ============================================================================

  async getAnthropometryRecords(residentId: string, limit = 10) {
    return this.tenantContext.client.residentAnthropometry.findMany({
      where: {
        residentId,
        deletedAt: null,
      },
      orderBy: { measurementDate: 'desc' },
      take: limit,
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async getLatestAnthropometry(residentId: string) {
    return this.tenantContext.client.residentAnthropometry.findFirst({
      where: {
        residentId,
        deletedAt: null,
      },
      orderBy: { measurementDate: 'desc' },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async createAnthropometry(userId: string, dto: CreateResidentAnthropometryDto) {
    // Se altura não foi informada, buscar a última altura válida do residente
    // (altura de idosos raramente muda, mas pode diminuir por osteoporose, sarcopenia, etc.)
    let heightToUse = dto.height;

    if (!heightToUse) {
      const lastWithHeight = await this.tenantContext.client.residentAnthropometry.findFirst({
        where: {
          residentId: dto.residentId,
          height: { not: null },
          deletedAt: null,
        },
        orderBy: { measurementDate: 'desc' },
        select: { height: true },
      });

      if (lastWithHeight?.height) {
        heightToUse = Number(lastWithHeight.height);
      }
    }

    // Calcular IMC se temos altura (informada ou da última medição)
    const bmi = heightToUse ? this.calculateBMI(dto.weight, heightToUse) : null;

    const result = await this.tenantContext.client.$transaction(async (tx) => {
      const record = await tx.residentAnthropometry.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          residentId: dto.residentId,
          // Só armazena a altura se foi explicitamente informada neste registro
          height: dto.height ? new Prisma.Decimal(dto.height) : null,
          weight: new Prisma.Decimal(dto.weight),
          bmi: bmi ? new Prisma.Decimal(bmi) : null,
          measurementDate: parseISO(dto.measurementDate),
          notes: dto.notes || null,
          createdBy: userId,
        },
      });

      // Campos alterados baseado no que foi informado
      const changedFields = ['weight', 'measurementDate'];
      if (dto.height) changedFields.unshift('height');
      if (bmi) changedFields.push('bmi');
      if (dto.notes) changedFields.push('notes');

      await tx.residentAnthropometryHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          residentAnthropometryId: record.id,
          versionNumber: 1,
          changeType: ChangeType.CREATE,
          changeReason: 'Registro de nova medição antropométrica',
          previousData: Prisma.JsonNull,
          newData: record as unknown as Prisma.InputJsonValue,
          changedFields,
          changedAt: new Date(),
          changedBy: userId,
        },
      });

      return record;
    });

    const heightStr = dto.height ? `${dto.height}m, ` : '';
    const bmiStr = bmi ? `, IMC ${bmi}` : '';
    this.logger.log(
      `Medição antropométrica registrada: ${dto.residentId} (${heightStr}${dto.weight}kg${bmiStr})`,
    );

    return result;
  }

  async updateAnthropometry(
    userId: string,
    id: string,
    dto: UpdateResidentAnthropometryDto,
  ) {
    const { changeReason, ...updateData } = dto;

    const existing = await this.tenantContext.client.residentAnthropometry.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Registro de antropometria não encontrado');
    }

    const height = updateData.height ?? Number(existing.height);
    const weight = updateData.weight ?? Number(existing.weight);
    const bmi = this.calculateBMI(weight, height);

    const newVersion = existing.versionNumber + 1;

    const result = await this.tenantContext.client.$transaction(async (tx) => {
      const updated = await tx.residentAnthropometry.update({
        where: { id },
        data: {
          height: new Prisma.Decimal(height),
          weight: new Prisma.Decimal(weight),
          bmi: new Prisma.Decimal(bmi),
          measurementDate: updateData.measurementDate
            ? parseISO(updateData.measurementDate)
            : existing.measurementDate,
          notes: updateData.notes ?? existing.notes,
          versionNumber: newVersion,
          updatedBy: userId,
        },
      });

      await tx.residentAnthropometryHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          residentAnthropometryId: id,
          versionNumber: newVersion,
          changeType: ChangeType.UPDATE,
          changeReason,
          previousData: existing as unknown as Prisma.InputJsonValue,
          newData: updated as unknown as Prisma.InputJsonValue,
          changedFields: Object.keys(updateData),
          changedAt: new Date(),
          changedBy: userId,
        },
      });

      return updated;
    });

    this.logger.log(`Medição antropométrica atualizada: ${id} (v${newVersion})`);

    return result;
  }

  async deleteAnthropometry(userId: string, id: string, deleteReason: string) {
    const existing = await this.tenantContext.client.residentAnthropometry.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Registro de antropometria não encontrado');
    }

    const newVersion = existing.versionNumber + 1;

    await this.tenantContext.client.$transaction(async (tx) => {
      await tx.residentAnthropometry.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          versionNumber: newVersion,
          updatedBy: userId,
        },
      });

      await tx.residentAnthropometryHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          residentAnthropometryId: id,
          versionNumber: newVersion,
          changeType: ChangeType.DELETE,
          changeReason: deleteReason,
          previousData: existing as unknown as Prisma.InputJsonValue,
          newData: Prisma.JsonNull,
          changedFields: ['deletedAt'],
          changedAt: new Date(),
          changedBy: userId,
        },
      });
    });

    this.logger.log(`Medição antropométrica excluída: ${id}`);

    return { message: 'Registro excluído com sucesso' };
  }

  private calculateBMI(weight: number, height: number): number {
    if (height <= 0) return 0;
    const bmi = weight / (height * height);
    return Math.round(bmi * 10) / 10;
  }

  // ============================================================================
  // DEPENDENCY ASSESSMENT
  // ============================================================================

  async getDependencyAssessments(residentId: string) {
    return this.tenantContext.client.residentDependencyAssessment.findMany({
      where: {
        residentId,
        deletedAt: null,
      },
      orderBy: { effectiveDate: 'desc' },
      include: {
        assessor: { select: { id: true, name: true, email: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async getCurrentDependencyAssessment(residentId: string) {
    return this.tenantContext.client.residentDependencyAssessment.findFirst({
      where: {
        residentId,
        endDate: null, // Avaliação vigente
        deletedAt: null,
      },
      orderBy: { effectiveDate: 'desc' },
      include: {
        assessor: { select: { id: true, name: true, email: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async createDependencyAssessment(
    userId: string,
    dto: CreateResidentDependencyAssessmentDto,
  ) {
    // Encerrar avaliação anterior, se existir
    const existingCurrent = await this.tenantContext.client.residentDependencyAssessment.findFirst({
      where: {
        residentId: dto.residentId,
        endDate: null,
        deletedAt: null,
      },
    });

    const effectiveDate = parseISO(dto.effectiveDate);

    const result = await this.tenantContext.client.$transaction(async (tx) => {
      // Encerrar avaliação anterior
      if (existingCurrent) {
        await tx.residentDependencyAssessment.update({
          where: { id: existingCurrent.id },
          data: {
            endDate: effectiveDate,
            updatedBy: userId,
          },
        });

        await tx.residentDependencyAssessmentHistory.create({
          data: {
            tenantId: this.tenantContext.tenantId,
            residentDependencyAssessmentId: existingCurrent.id,
            versionNumber: existingCurrent.versionNumber + 1,
            changeType: ChangeType.UPDATE,
            changeReason: 'Avaliação encerrada por nova avaliação',
            previousData: existingCurrent as unknown as Prisma.InputJsonValue,
            newData: { ...existingCurrent, endDate: effectiveDate } as unknown as Prisma.InputJsonValue,
            changedFields: ['endDate'],
            changedAt: new Date(),
            changedBy: userId,
          },
        });
      }

      // Criar nova avaliação
      const assessment = await tx.residentDependencyAssessment.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          residentId: dto.residentId,
          dependencyLevel: dto.dependencyLevel,
          effectiveDate,
          assessmentInstrument: dto.assessmentInstrument,
          assessmentScore: dto.assessmentScore
            ? new Prisma.Decimal(dto.assessmentScore)
            : null,
          assessedBy: userId,
          mobilityAid: dto.mobilityAid,
          mobilityAidDescription: dto.mobilityAidDescription || null,
          notes: dto.notes || null,
          createdBy: userId,
        },
        include: {
          assessor: { select: { id: true, name: true, email: true } },
        },
      });

      await tx.residentDependencyAssessmentHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          residentDependencyAssessmentId: assessment.id,
          versionNumber: 1,
          changeType: ChangeType.CREATE,
          changeReason: 'Nova avaliação de dependência registrada',
          previousData: Prisma.JsonNull,
          newData: assessment as unknown as Prisma.InputJsonValue,
          changedFields: Object.keys(dto),
          changedAt: new Date(),
          changedBy: userId,
        },
      });

      return assessment;
    });

    this.logger.log(
      `Avaliação de dependência registrada: ${dto.residentId} (${dto.dependencyLevel})`,
    );

    return result;
  }

  async updateDependencyAssessment(
    userId: string,
    id: string,
    dto: UpdateResidentDependencyAssessmentDto,
  ) {
    const { changeReason, ...updateData } = dto;

    const existing = await this.tenantContext.client.residentDependencyAssessment.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Avaliação de dependência não encontrada');
    }

    const newVersion = existing.versionNumber + 1;

    const result = await this.tenantContext.client.$transaction(async (tx) => {
      const updated = await tx.residentDependencyAssessment.update({
        where: { id },
        data: {
          dependencyLevel: updateData.dependencyLevel ?? existing.dependencyLevel,
          endDate: updateData.endDate ? parseISO(updateData.endDate) : existing.endDate,
          assessmentInstrument:
            updateData.assessmentInstrument ?? existing.assessmentInstrument,
          assessmentScore: updateData.assessmentScore !== undefined
            ? new Prisma.Decimal(updateData.assessmentScore)
            : existing.assessmentScore,
          mobilityAid: updateData.mobilityAid ?? existing.mobilityAid,
          mobilityAidDescription:
            updateData.mobilityAidDescription ?? existing.mobilityAidDescription,
          notes: updateData.notes ?? existing.notes,
          versionNumber: newVersion,
          updatedBy: userId,
        },
        include: {
          assessor: { select: { id: true, name: true, email: true } },
        },
      });

      await tx.residentDependencyAssessmentHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          residentDependencyAssessmentId: id,
          versionNumber: newVersion,
          changeType: ChangeType.UPDATE,
          changeReason,
          previousData: existing as unknown as Prisma.InputJsonValue,
          newData: updated as unknown as Prisma.InputJsonValue,
          changedFields: Object.keys(updateData),
          changedAt: new Date(),
          changedBy: userId,
        },
      });

      return updated;
    });

    this.logger.log(`Avaliação de dependência atualizada: ${id} (v${newVersion})`);

    return result;
  }

  // ============================================================================
  // AGGREGATED DATA (para exibição no prontuário)
  // ============================================================================

  async getResidentHealthSummary(residentId: string) {
    const [bloodType, latestAnthropometry, currentAssessment] = await Promise.all([
      this.getBloodType(residentId),
      this.getLatestAnthropometry(residentId),
      this.getCurrentDependencyAssessment(residentId),
    ]);

    return {
      bloodType,
      latestAnthropometry,
      currentAssessment,
    };
  }
}
