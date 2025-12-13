import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMedicationDto } from '../prescriptions/dto/update-medication.dto';
import { DeleteMedicationDto } from '../prescriptions/dto/delete-medication.dto';
import { ChangeType } from '@prisma/client';

@Injectable()
export class MedicationsService {
  private readonly logger = new Logger(MedicationsService.name);

  constructor(private prisma: PrismaService) {}

  // ==================== UPDATE com Versionamento ====================
  async update(
    id: string,
    updateMedicationDto: UpdateMedicationDto,
    tenantId: string,
    userId: string,
  ) {
    const { changeReason, ...updateData } = updateMedicationDto;

    // Buscar medicamento existente
    const medication = await this.prisma.medication.findFirst({
      where: { id, prescription: { tenantId }, deletedAt: null },
      include: { prescription: true },
    });

    if (!medication) {
      this.logger.error('Erro ao atualizar medicamento', {
        error: 'Medicamento não encontrado',
        medicationId: id,
        tenantId,
        userId,
      });
      throw new NotFoundException('Medicamento não encontrado');
    }

    // Capturar estado anterior
    const previousData = {
      name: medication.name,
      presentation: medication.presentation,
      concentration: medication.concentration,
      dose: medication.dose,
      route: medication.route,
      frequency: medication.frequency,
      scheduledTimes: medication.scheduledTimes,
      startDate: medication.startDate,
      endDate: medication.endDate,
      isControlled: medication.isControlled,
      isHighRisk: medication.isHighRisk,
      requiresDoubleCheck: medication.requiresDoubleCheck,
      instructions: medication.instructions,
      versionNumber: medication.versionNumber,
    };

    // Detectar campos alterados
    const changedFields: string[] = [];
    (Object.keys(updateData) as Array<keyof typeof updateData>).forEach((key) => {
      if (
        updateData[key] !== undefined &&
        JSON.stringify(updateData[key]) !== JSON.stringify((previousData as any)[key])
      ) {
        changedFields.push(key as string);
      }
    });

    // Incrementar versão
    const newVersionNumber = medication.versionNumber + 1;

    // Executar update e criar histórico em transação atômica
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Atualizar medicamento
      const updatedMedication = await tx.medication.update({
        where: { id },
        data: {
          ...(updateData as any),
          versionNumber: newVersionNumber,
          updatedBy: userId,
        },
        include: { prescription: true },
      });

      // 2. Capturar novo estado
      const newData = {
        name: updatedMedication.name,
        presentation: updatedMedication.presentation,
        concentration: updatedMedication.concentration,
        dose: updatedMedication.dose,
        route: updatedMedication.route,
        frequency: updatedMedication.frequency,
        scheduledTimes: updatedMedication.scheduledTimes,
        startDate: updatedMedication.startDate,
        endDate: updatedMedication.endDate,
        isControlled: updatedMedication.isControlled,
        isHighRisk: updatedMedication.isHighRisk,
        requiresDoubleCheck: updatedMedication.requiresDoubleCheck,
        instructions: updatedMedication.instructions,
        versionNumber: updatedMedication.versionNumber,
      };

      // 3. Criar entrada no histórico
      await tx.medicationHistory.create({
        data: {
          tenantId,
          medicationId: id,
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

      return updatedMedication;
    });

    this.logger.log('Medicamento atualizado com versionamento', {
      medicationId: id,
      versionNumber: newVersionNumber,
      changedFields,
      tenantId,
      userId,
    });

    return result;
  }

  // ==================== DELETE (Soft) com Versionamento ====================
  async remove(
    id: string,
    tenantId: string,
    userId: string,
    deleteReason: string,
  ) {
    // Buscar medicamento existente
    const medication = await this.prisma.medication.findFirst({
      where: { id, prescription: { tenantId }, deletedAt: null },
      include: { prescription: true },
    });

    if (!medication) {
      this.logger.error('Erro ao remover medicamento', {
        error: 'Medicamento não encontrado',
        medicationId: id,
        tenantId,
        userId,
      });
      throw new NotFoundException('Medicamento não encontrado');
    }

    // Capturar estado antes da exclusão
    const previousData = {
      name: medication.name,
      presentation: medication.presentation,
      concentration: medication.concentration,
      dose: medication.dose,
      route: medication.route,
      frequency: medication.frequency,
      scheduledTimes: medication.scheduledTimes,
      startDate: medication.startDate,
      endDate: medication.endDate,
      isControlled: medication.isControlled,
      isHighRisk: medication.isHighRisk,
      requiresDoubleCheck: medication.requiresDoubleCheck,
      instructions: medication.instructions,
      versionNumber: medication.versionNumber,
      deletedAt: null,
    };

    // Incrementar versão
    const newVersionNumber = medication.versionNumber + 1;

    // Executar soft delete e criar histórico em transação atômica
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Soft delete do medicamento
      const deletedMedication = await tx.medication.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          versionNumber: newVersionNumber,
          updatedBy: userId,
        },
        include: { prescription: true },
      });

      // 2. Criar entrada no histórico
      await tx.medicationHistory.create({
        data: {
          tenantId,
          medicationId: id,
          versionNumber: newVersionNumber,
          changeType: ChangeType.DELETE,
          changeReason: deleteReason,
          previousData: previousData as any,
          newData: {
            ...previousData,
            deletedAt: deletedMedication.deletedAt,
            versionNumber: newVersionNumber,
          } as any,
          changedFields: ['deletedAt'],
          changedAt: new Date(),
          changedBy: userId,
        },
      });

      return deletedMedication;
    });

    this.logger.log('Medicamento removido com versionamento', {
      medicationId: id,
      versionNumber: newVersionNumber,
      tenantId,
      userId,
    });

    return { message: 'Medicamento removido com sucesso', medication: result };
  }

  // ==================== HISTÓRICO ====================
  async getHistory(medicationId: string, tenantId: string) {
    // Verificar se o medicamento existe
    const medication = await this.prisma.medication.findFirst({
      where: { id: medicationId, prescription: { tenantId } },
      include: { prescription: true },
    });

    if (!medication) {
      this.logger.error('Erro ao consultar histórico de medicamento', {
        error: 'Medicamento não encontrado',
        medicationId,
        tenantId,
      });
      throw new NotFoundException('Medicamento não encontrado');
    }

    // Buscar histórico ordenado por versão decrescente
    const history = await this.prisma.medicationHistory.findMany({
      where: {
        medicationId,
        tenantId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    this.logger.log('Histórico de medicamento consultado', {
      medicationId,
      totalVersions: history.length,
      tenantId,
    });

    return {
      medicationId,
      medicationName: medication.name,
      currentVersion: medication.versionNumber,
      totalVersions: history.length,
      history,
    };
  }

  async getHistoryVersion(
    medicationId: string,
    versionNumber: number,
    tenantId: string,
  ) {
    // Verificar se o medicamento existe
    const medication = await this.prisma.medication.findFirst({
      where: { id: medicationId, prescription: { tenantId } },
      include: { prescription: true },
    });

    if (!medication) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: 'Medicamento não encontrado',
        medicationId,
        versionNumber,
        tenantId,
      });
      throw new NotFoundException('Medicamento não encontrado');
    }

    // Buscar versão específica
    const historyVersion = await this.prisma.medicationHistory.findFirst({
      where: {
        medicationId,
        versionNumber,
        tenantId,
      },
    });

    if (!historyVersion) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: `Versão ${versionNumber} não encontrada para este medicamento`,
        medicationId,
        versionNumber,
        tenantId,
      });
      throw new NotFoundException(
        `Versão ${versionNumber} não encontrada para este medicamento`,
      );
    }

    this.logger.log('Versão específica do histórico consultada', {
      medicationId,
      versionNumber,
      tenantId,
    });

    return historyVersion;
  }
}
