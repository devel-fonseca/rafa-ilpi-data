import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { UpdateSOSMedicationDto } from './dto/update-sos-medication.dto';
import { DeleteSOSMedicationDto } from './dto/delete-sos-medication.dto';
import { ChangeType } from '@prisma/client';

@Injectable()
export class SOSMedicationsService {
  private readonly logger = new Logger(SOSMedicationsService.name);

  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
  ) {}

  // ==================== UPDATE com Versionamento ====================
  async update(
    id: string,
    updateSOSMedicationDto: UpdateSOSMedicationDto,
    userId: string,
  ) {
    const { changeReason, ...updateData } = updateSOSMedicationDto;

    // Buscar medicamento SOS existente
    const sosMedication = await this.tenantContext.client.sOSMedication.findFirst({
      where: { id, deletedAt: null },
      include: { prescription: true },
    });

    if (!sosMedication) {
      this.logger.error('Erro ao atualizar medicamento SOS', {
        error: 'Medicamento SOS não encontrado',
        sosMedicationId: id,
        tenantId: this.tenantContext.tenantId,
        userId,
      });
      throw new NotFoundException('Medicamento SOS não encontrado');
    }

    // Capturar estado anterior
    const previousData = {
      name: sosMedication.name,
      presentation: sosMedication.presentation,
      concentration: sosMedication.concentration,
      dose: sosMedication.dose,
      route: sosMedication.route,
      indication: sosMedication.indication,
      indicationDetails: sosMedication.indicationDetails,
      minInterval: sosMedication.minInterval,
      maxDailyDoses: sosMedication.maxDailyDoses,
      startDate: sosMedication.startDate,
      endDate: sosMedication.endDate,
      instructions: sosMedication.instructions,
      versionNumber: sosMedication.versionNumber,
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

    // Incrementar versão
    const newVersionNumber = sosMedication.versionNumber + 1;

    // Executar update e criar histórico em transação atômica
    const result = await this.tenantContext.client.$transaction(async (tx) => {
      // 1. Atualizar medicamento SOS
      const updatedSOSMedication = await tx.sOSMedication.update({
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
        name: updatedSOSMedication.name,
        presentation: updatedSOSMedication.presentation,
        concentration: updatedSOSMedication.concentration,
        dose: updatedSOSMedication.dose,
        route: updatedSOSMedication.route,
        indication: updatedSOSMedication.indication,
        indicationDetails: updatedSOSMedication.indicationDetails,
        minInterval: updatedSOSMedication.minInterval,
        maxDailyDoses: updatedSOSMedication.maxDailyDoses,
        startDate: updatedSOSMedication.startDate,
        endDate: updatedSOSMedication.endDate,
        instructions: updatedSOSMedication.instructions,
        versionNumber: updatedSOSMedication.versionNumber,
      };

      // 3. Criar entrada no histórico
      await tx.sOSMedicationHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          sosMedicationId: id,
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

      return updatedSOSMedication;
    });

    this.logger.log('Medicamento SOS atualizado com versionamento', {
      sosMedicationId: id,
      versionNumber: newVersionNumber,
      changedFields,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    return result;
  }

  // ==================== DELETE (Soft) com Versionamento ====================
  async remove(
    id: string,
    userId: string,
    deleteReason: string,
  ) {
    // Buscar medicamento SOS existente
    const sosMedication = await this.tenantContext.client.sOSMedication.findFirst({
      where: { id, deletedAt: null },
      include: { prescription: true },
    });

    if (!sosMedication) {
      this.logger.error('Erro ao remover medicamento SOS', {
        error: 'Medicamento SOS não encontrado',
        sosMedicationId: id,
        tenantId: this.tenantContext.tenantId,
        userId,
      });
      throw new NotFoundException('Medicamento SOS não encontrado');
    }

    // Capturar estado antes da exclusão
    const previousData = {
      name: sosMedication.name,
      presentation: sosMedication.presentation,
      concentration: sosMedication.concentration,
      dose: sosMedication.dose,
      route: sosMedication.route,
      indication: sosMedication.indication,
      indicationDetails: sosMedication.indicationDetails,
      minInterval: sosMedication.minInterval,
      maxDailyDoses: sosMedication.maxDailyDoses,
      startDate: sosMedication.startDate,
      endDate: sosMedication.endDate,
      instructions: sosMedication.instructions,
      versionNumber: sosMedication.versionNumber,
      deletedAt: null,
    };

    // Incrementar versão
    const newVersionNumber = sosMedication.versionNumber + 1;

    // Executar soft delete e criar histórico em transação atômica
    const result = await this.tenantContext.client.$transaction(async (tx) => {
      // 1. Soft delete do medicamento SOS
      const deletedSOSMedication = await tx.sOSMedication.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          versionNumber: newVersionNumber,
          updatedBy: userId,
        },
        include: { prescription: true },
      });

      // 2. Criar entrada no histórico
      await tx.sOSMedicationHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          sosMedicationId: id,
          versionNumber: newVersionNumber,
          changeType: ChangeType.DELETE,
          changeReason: deleteReason,
          previousData: previousData as any,
          newData: {
            ...previousData,
            deletedAt: deletedSOSMedication.deletedAt,
            versionNumber: newVersionNumber,
          } as any,
          changedFields: ['deletedAt'],
          changedAt: new Date(),
          changedBy: userId,
        },
      });

      return deletedSOSMedication;
    });

    this.logger.log('Medicamento SOS removido com versionamento', {
      sosMedicationId: id,
      versionNumber: newVersionNumber,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    return {
      message: 'Medicamento SOS removido com sucesso',
      sosMedication: result,
    };
  }

  // ==================== HISTÓRICO ====================
  async getHistory(sosMedicationId: string) {
    // Verificar se o medicamento SOS existe
    const sosMedication = await this.tenantContext.client.sOSMedication.findFirst({
      where: { id: sosMedicationId },
      include: { prescription: true },
    });

    if (!sosMedication) {
      this.logger.error('Erro ao consultar histórico de medicamento SOS', {
        error: 'Medicamento SOS não encontrado',
        sosMedicationId,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException('Medicamento SOS não encontrado');
    }

    // Buscar histórico ordenado por versão decrescente
    const history = await this.tenantContext.client.sOSMedicationHistory.findMany({
      where: {
        sosMedicationId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    this.logger.log('Histórico de medicamento SOS consultado', {
      sosMedicationId,
      totalVersions: history.length,
      tenantId: this.tenantContext.tenantId,
    });

    return {
      sosMedicationId,
      sosMedicationName: sosMedication.name,
      currentVersion: sosMedication.versionNumber,
      totalVersions: history.length,
      history,
    };
  }

  async getHistoryVersion(
    sosMedicationId: string,
    versionNumber: number,
  ) {
    // Verificar se o medicamento SOS existe
    const sosMedication = await this.tenantContext.client.sOSMedication.findFirst({
      where: { id: sosMedicationId },
      include: { prescription: true },
    });

    if (!sosMedication) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: 'Medicamento SOS não encontrado',
        sosMedicationId,
        versionNumber,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException('Medicamento SOS não encontrado');
    }

    // Buscar versão específica
    const historyVersion = await this.tenantContext.client.sOSMedicationHistory.findFirst({
      where: {
        sosMedicationId,
        versionNumber,
      },
    });

    if (!historyVersion) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: `Versão ${versionNumber} não encontrada para este medicamento SOS`,
        sosMedicationId,
        versionNumber,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException(
        `Versão ${versionNumber} não encontrada para este medicamento SOS`,
      );
    }

    this.logger.log('Versão específica do histórico consultada', {
      sosMedicationId,
      versionNumber,
      tenantId: this.tenantContext.tenantId,
    });

    return historyVersion;
  }
}
