import {
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { CreateVitalSignDto } from './dto/create-vital-sign.dto';
import { UpdateVitalSignDto } from './dto/update-vital-sign.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
  ChangeType,
  SystemNotificationType,
  NotificationCategory,
  NotificationSeverity,
  VitalSignAlertType,
  AlertSeverity,
  PositionCode,
  Prisma,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationRecipientsResolverService } from '../notifications/notification-recipients-resolver.service';
import { VitalSignAlertsService } from '../vital-sign-alerts/vital-sign-alerts.service';
import { getDayRangeInTz, DEFAULT_TIMEZONE } from '../utils/date.helpers';

@Injectable()
export class VitalSignsService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    private readonly notificationsService: NotificationsService,
    private readonly recipientsResolver: NotificationRecipientsResolverService,
    private readonly vitalSignAlertsService: VitalSignAlertsService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Criar registro de sinais vitais COM versionamento
   */
  async create(
    userId: string,
    createDto: CreateVitalSignDto,
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

    const vitalSign = await this.tenantContext.client.vitalSign.create({
      data: {
        tenantId: this.tenantContext.tenantId, // ⚠️ TEMPORARY: Schema ainda não migrado
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
      userId,
    });

    // Detectar anomalias e criar notificações automaticamente
    await this.detectAndNotifyAnomalies(
      vitalSign.id,
      resident.id,
      resident.fullName,
      createDto,
      userId,
    );

    return vitalSign;
  }

  /**
   * Buscar sinal vital por ID
   */
  async findOne(id: string) {
    const vitalSign = await this.tenantContext.client.vitalSign.findFirst({
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
    residentId: string,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const where: Prisma.VitalSignWhereInput = {
      residentId,
      deletedAt: null,
    };

    // Se forneceu range de datas, buscar timezone do tenant e construir range UTC
    if (startDateStr || endDateStr) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: this.tenantContext.tenantId },
        select: { timezone: true },
      });
      const timezone = tenant?.timezone || DEFAULT_TIMEZONE;

      where.timestamp = {};

      if (startDateStr) {
        const { start } = getDayRangeInTz(startDateStr, timezone);
        where.timestamp.gte = start;
      }

      if (endDateStr) {
        const { end } = getDayRangeInTz(endDateStr, timezone);
        where.timestamp.lte = end;
      }
    }

    return await this.tenantContext.client.vitalSign.findMany({
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
    userId: string,
    id: string,
    updateDto: UpdateVitalSignDto,
  ) {
    const { changeReason, ...updateData } = updateDto;

    const vitalSign = await this.tenantContext.client.vitalSign.findFirst({
      where: { id, deletedAt: null },
    });

    if (!vitalSign) {
      this.logger.error('Erro ao atualizar sinal vital', {
        error: 'Sinal vital não encontrado',
        vitalSignId: id,
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
            JSON.stringify((previousData as Record<string, unknown>)[key])
        ) {
          changedFields.push(key as string);
        }
      },
    );

    const newVersionNumber = vitalSign.versionNumber + 1;

    const result = await this.tenantContext.client.$transaction(async (tx) => {
      const updatedVitalSign = await tx.vitalSign.update({
        where: { id },
        data: {
          ...(updateData as Prisma.VitalSignUncheckedUpdateInput),
          versionNumber: newVersionNumber,
          updatedBy: userId,
        } as Prisma.VitalSignUncheckedUpdateInput,
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
          tenantId: this.tenantContext.tenantId, // ⚠️ TEMPORARY: Schema ainda não migrado
          vitalSignId: id,
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

      return updatedVitalSign;
    });

    this.logger.info('Sinal vital atualizado com versionamento', {
      vitalSignId: id,
      versionNumber: newVersionNumber,
      changedFields,
      userId,
    });

    // Detectar anomalias nos valores atualizados
    const resident = await this.tenantContext.client.resident.findUnique({
      where: { id: vitalSign.residentId },
      select: { fullName: true },
    });

    if (resident) {
      await this.detectAndNotifyAnomalies(
        id,
        vitalSign.residentId,
        resident.fullName,
        updateDto,
        userId,
      );
    }

    return result;
  }

  /**
   * Soft delete de sinal vital COM versionamento
   */
  async remove(
    userId: string,
    id: string,
    deleteReason: string,
  ) {
    const vitalSign = await this.tenantContext.client.vitalSign.findFirst({
      where: { id, deletedAt: null },
    });

    if (!vitalSign) {
      this.logger.error('Erro ao remover sinal vital', {
        error: 'Sinal vital não encontrado',
        vitalSignId: id,
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

    const result = await this.tenantContext.client.$transaction(async (tx) => {
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
          tenantId: this.tenantContext.tenantId, // ⚠️ TEMPORARY: Schema ainda não migrado
          vitalSignId: id,
          versionNumber: newVersionNumber,
          changeType: ChangeType.DELETE,
          changeReason: deleteReason,
          previousData: previousData as Prisma.InputJsonValue,
          newData: {
            ...previousData,
            deletedAt: deletedVitalSign.deletedAt,
            versionNumber: newVersionNumber,
          } as Prisma.InputJsonValue,
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
  async getHistory(vitalSignId: string) {
    const vitalSign = await this.tenantContext.client.vitalSign.findFirst({
      where: { id: vitalSignId },
    });

    if (!vitalSign) {
      this.logger.error('Erro ao consultar histórico de sinal vital', {
        error: 'Sinal vital não encontrado',
        vitalSignId,
      });
      throw new NotFoundException('Sinal vital não encontrado');
    }

    const history = await this.tenantContext.client.vitalSignHistory.findMany({
      where: {
        vitalSignId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    this.logger.info('Histórico de sinal vital consultado', {
      vitalSignId,
      totalVersions: history.length,
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
  ) {
    const vitalSign = await this.tenantContext.client.vitalSign.findFirst({
      where: { id: vitalSignId },
    });

    if (!vitalSign) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: 'Sinal vital não encontrado',
        vitalSignId,
        versionNumber,
      });
      throw new NotFoundException('Sinal vital não encontrado');
    }

    const historyVersion = await this.tenantContext.client.vitalSignHistory.findFirst({
      where: {
        vitalSignId,
        versionNumber,
      },
    });

    if (!historyVersion) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: `Versão ${versionNumber} não encontrada para este sinal vital`,
        vitalSignId,
        versionNumber,
      });
      throw new NotFoundException(
        `Versão ${versionNumber} não encontrada para este sinal vital`,
      );
    }

    this.logger.info('Versão específica do histórico consultada', {
      vitalSignId,
      versionNumber,
    });

    return historyVersion;
  }

  /**
   * Detectar anomalias nos sinais vitais e criar notificações
   * PRIVADO - chamado automaticamente em create() e update()
   */
  private async detectAndNotifyAnomalies(
    vitalSignId: string,
    residentId: string,
    residentName: string,
    data: CreateVitalSignDto | UpdateVitalSignDto,
    actorUserId: string,
  ) {
    try {
      const recipientIds = await this.recipientsResolver.resolveByTenantId(
        this.tenantContext.tenantId,
        {
          positionCodes: [
            PositionCode.ADMINISTRATOR,
            PositionCode.TECHNICAL_MANAGER,
            PositionCode.NURSE,
            PositionCode.NURSING_COORDINATOR,
            PositionCode.NURSING_TECHNICIAN,
          ],
          includeTechnicalManagerFlag: true,
        },
      );
      if (recipientIds.length === 0) return;

      // Pressão arterial (sistólica/diastólica)
      const systolic =
        data.systolicBloodPressure !== undefined && data.systolicBloodPressure !== null
          ? data.systolicBloodPressure
          : null;
      const diastolic =
        data.diastolicBloodPressure !== undefined && data.diastolicBloodPressure !== null
          ? data.diastolicBloodPressure
          : null;

      if (systolic !== null || diastolic !== null) {
        const hasCriticalPressure =
          (systolic !== null && (systolic >= 160 || systolic < 80)) ||
          (diastolic !== null && (diastolic >= 100 || diastolic < 50));
        const hasWarningPressure =
          (systolic !== null && (systolic >= 140 || systolic <= 90)) ||
          (diastolic !== null && (diastolic >= 90 || diastolic < 60));
        const isHighPressure =
          (systolic !== null && systolic >= 140) ||
          (diastolic !== null && diastolic >= 90);
        const pressureValue =
          systolic !== null && diastolic !== null
            ? `${systolic}/${diastolic} mmHg`
            : systolic !== null
              ? `${systolic} mmHg`
              : `${diastolic} mmHg`;

        if (hasCriticalPressure) {
          const notification = await this.notificationsService.createDirectedNotification(
            this.tenantContext.tenantId,
            recipientIds,
            {
            type: SystemNotificationType.VITAL_SIGN_ABNORMAL_BP,
            category: NotificationCategory.VITAL_SIGN,
            severity: NotificationSeverity.CRITICAL,
            title: 'Pressão Arterial Crítica',
            message: `Pressão arterial crítica detectada para ${residentName}: ${pressureValue}`,
            actionUrl: `/dashboard/residentes/${residentId}`,
            entityType: 'VITAL_SIGN',
            entityId: vitalSignId,
            metadata: { residentName, vitalType: 'Pressão Arterial', value: pressureValue },
          });
          this.logger.warn('Notificação criada: PA Crítica', { residentName, value: pressureValue });

          // Criar alerta médico persistente
          const alertType = isHighPressure
            ? VitalSignAlertType.PRESSURE_HIGH
            : VitalSignAlertType.PRESSURE_LOW;

          await this.vitalSignAlertsService.create({
            residentId,
            vitalSignId,
            notificationId: notification.id,
            type: alertType,
            severity: AlertSeverity.CRITICAL,
            title: 'Pressão Arterial Crítica',
            description: `Pressão arterial crítica: ${pressureValue}. Faixa esperada aproximada: PAS 90-140 e PAD 60-90 mmHg.`,
            value: pressureValue,
            metadata: {
              threshold: isHighPressure ? 'PAS≥160 ou PAD≥100 mmHg' : 'PAS<80 ou PAD<50 mmHg',
              expectedRange: 'PAS 90-140 mmHg / PAD 60-90 mmHg',
              detectedAt: new Date(),
              systolic,
              diastolic,
            },
          }, actorUserId);
        } else if (hasWarningPressure) {
          const notification = await this.notificationsService.createDirectedNotification(
            this.tenantContext.tenantId,
            recipientIds,
            {
            type: SystemNotificationType.VITAL_SIGN_ABNORMAL_BP,
            category: NotificationCategory.VITAL_SIGN,
            severity: NotificationSeverity.WARNING,
            title: 'Pressão Arterial Anormal',
            message: `Pressão arterial anormal detectada para ${residentName}: ${pressureValue}`,
            actionUrl: `/dashboard/residentes/${residentId}`,
            entityType: 'VITAL_SIGN',
            entityId: vitalSignId,
            metadata: { residentName, vitalType: 'Pressão Arterial', value: pressureValue },
          });
          this.logger.warn('Notificação criada: PA Anormal', { residentName, value: pressureValue });

          // Criar alerta médico persistente
          const alertType = isHighPressure
            ? VitalSignAlertType.PRESSURE_HIGH
            : VitalSignAlertType.PRESSURE_LOW;

          await this.vitalSignAlertsService.create({
            residentId,
            vitalSignId,
            notificationId: notification.id,
            type: alertType,
            severity: AlertSeverity.WARNING,
            title: 'Pressão Arterial Anormal',
            description: `Pressão arterial fora da faixa esperada: ${pressureValue}. Faixa esperada aproximada: PAS 90-140 e PAD 60-90 mmHg.`,
            value: pressureValue,
            metadata: {
              threshold: isHighPressure ? 'PAS≥140 ou PAD≥90 mmHg' : 'PAS≤90 ou PAD<60 mmHg',
              expectedRange: 'PAS 90-140 mmHg / PAD 60-90 mmHg',
              detectedAt: new Date(),
              systolic,
              diastolic,
            },
          }, actorUserId);
        }
      }

      // Glicemia
      if (data.bloodGlucose !== undefined && data.bloodGlucose !== null) {
        if (data.bloodGlucose >= 250 || data.bloodGlucose < 60) {
          const notification = await this.notificationsService.createDirectedNotification(
            this.tenantContext.tenantId,
            recipientIds,
            {
            type: SystemNotificationType.VITAL_SIGN_ABNORMAL_GLUCOSE,
            category: NotificationCategory.VITAL_SIGN,
            severity: NotificationSeverity.CRITICAL,
            title: 'Glicemia Crítica',
            message: `Glicemia crítica detectada para ${residentName}: ${data.bloodGlucose} mg/dL`,
            actionUrl: `/dashboard/residentes/${residentId}`,
            entityType: 'VITAL_SIGN',
            entityId: vitalSignId,
            metadata: { residentName, vitalType: 'Glicemia', value: `${data.bloodGlucose} mg/dL` },
          });
          this.logger.warn('Notificação criada: Glicemia Crítica', { residentName, value: data.bloodGlucose });

          await this.vitalSignAlertsService.create({
            residentId,
            vitalSignId,
            notificationId: notification.id,
            type: data.bloodGlucose >= 250 ? VitalSignAlertType.GLUCOSE_HIGH : VitalSignAlertType.GLUCOSE_LOW,
            severity: AlertSeverity.CRITICAL,
            title: 'Glicemia Crítica',
            description: `Glicemia ${data.bloodGlucose >= 250 ? 'muito alta (hiperglicemia)' : 'muito baixa (hipoglicemia)'}: ${data.bloodGlucose} mg/dL. Valores normais: 70-180 mg/dL.`,
            value: `${data.bloodGlucose} mg/dL`,
            metadata: {
              threshold: data.bloodGlucose >= 250 ? '≥250 mg/dL' : '<60 mg/dL',
              expectedRange: '70-180 mg/dL',
              detectedAt: new Date(),
              glucose: data.bloodGlucose,
            },
          }, actorUserId);
        } else if (data.bloodGlucose >= 180 || data.bloodGlucose < 70) {
          const notification = await this.notificationsService.createDirectedNotification(
            this.tenantContext.tenantId,
            recipientIds,
            {
            type: SystemNotificationType.VITAL_SIGN_ABNORMAL_GLUCOSE,
            category: NotificationCategory.VITAL_SIGN,
            severity: NotificationSeverity.WARNING,
            title: 'Glicemia Anormal',
            message: `Glicemia anormal detectada para ${residentName}: ${data.bloodGlucose} mg/dL`,
            actionUrl: `/dashboard/residentes/${residentId}`,
            entityType: 'VITAL_SIGN',
            entityId: vitalSignId,
            metadata: { residentName, vitalType: 'Glicemia', value: `${data.bloodGlucose} mg/dL` },
          });
          this.logger.warn('Notificação criada: Glicemia Anormal', { residentName, value: data.bloodGlucose });

          await this.vitalSignAlertsService.create({
            residentId,
            vitalSignId,
            notificationId: notification.id,
            type: data.bloodGlucose >= 180 ? VitalSignAlertType.GLUCOSE_HIGH : VitalSignAlertType.GLUCOSE_LOW,
            severity: AlertSeverity.WARNING,
            title: 'Glicemia Anormal',
            description: `Glicemia ${data.bloodGlucose >= 180 ? 'elevada' : 'baixa'}: ${data.bloodGlucose} mg/dL. Valores normais: 70-180 mg/dL.`,
            value: `${data.bloodGlucose} mg/dL`,
            metadata: {
              threshold: data.bloodGlucose >= 180 ? '≥180 mg/dL' : '<70 mg/dL',
              expectedRange: '70-180 mg/dL',
              detectedAt: new Date(),
              glucose: data.bloodGlucose,
            },
          }, actorUserId);
        }
      }

      // Temperatura
      if (data.temperature !== undefined && data.temperature !== null) {
        if (data.temperature >= 39 || data.temperature < 35) {
          const notification = await this.notificationsService.createDirectedNotification(
            this.tenantContext.tenantId,
            recipientIds,
            {
            type: SystemNotificationType.VITAL_SIGN_ABNORMAL_TEMPERATURE,
            category: NotificationCategory.VITAL_SIGN,
            severity: NotificationSeverity.CRITICAL,
            title: 'Temperatura Crítica',
            message: `Temperatura crítica detectada para ${residentName}: ${data.temperature}°C`,
            actionUrl: `/dashboard/residentes/${residentId}`,
            entityType: 'VITAL_SIGN',
            entityId: vitalSignId,
            metadata: { residentName, vitalType: 'Temperatura', value: `${data.temperature}°C` },
          });
          this.logger.warn('Notificação criada: Temperatura Crítica', { residentName, value: data.temperature });

          await this.vitalSignAlertsService.create({
            residentId,
            vitalSignId,
            notificationId: notification.id,
            type: data.temperature >= 39 ? VitalSignAlertType.TEMPERATURE_HIGH : VitalSignAlertType.TEMPERATURE_LOW,
            severity: AlertSeverity.CRITICAL,
            title: 'Temperatura Crítica',
            description: `Temperatura ${data.temperature >= 39 ? 'muito alta' : 'muito baixa'}: ${data.temperature}°C. Valores usuais: 35,5-37,5°C.`,
            value: `${data.temperature}°C`,
            metadata: {
              threshold: data.temperature >= 39 ? '≥39°C' : '<35°C',
              expectedRange: '35,5-37,5°C',
              detectedAt: new Date(),
              temperature: data.temperature,
            },
          }, actorUserId);
        } else if (data.temperature >= 38 || data.temperature < 35.5) {
          const notification = await this.notificationsService.createDirectedNotification(
            this.tenantContext.tenantId,
            recipientIds,
            {
            type: SystemNotificationType.VITAL_SIGN_ABNORMAL_TEMPERATURE,
            category: NotificationCategory.VITAL_SIGN,
            severity: NotificationSeverity.WARNING,
            title: 'Temperatura Anormal',
            message: `Temperatura anormal detectada para ${residentName}: ${data.temperature}°C`,
            actionUrl: `/dashboard/residentes/${residentId}`,
            entityType: 'VITAL_SIGN',
            entityId: vitalSignId,
            metadata: { residentName, vitalType: 'Temperatura', value: `${data.temperature}°C` },
          });
          this.logger.warn('Notificação criada: Temperatura Anormal', { residentName, value: data.temperature });

          await this.vitalSignAlertsService.create({
            residentId,
            vitalSignId,
            notificationId: notification.id,
            type: data.temperature >= 38 ? VitalSignAlertType.TEMPERATURE_HIGH : VitalSignAlertType.TEMPERATURE_LOW,
            severity: AlertSeverity.WARNING,
            title: 'Temperatura Anormal',
            description: `Temperatura ${data.temperature >= 38 ? 'elevada' : 'baixa'}: ${data.temperature}°C. Valores usuais: 35,5-37,5°C.`,
            value: `${data.temperature}°C`,
            metadata: {
              threshold: data.temperature >= 38 ? '≥38°C' : '<35,5°C',
              expectedRange: '35,5-37,5°C',
              detectedAt: new Date(),
              temperature: data.temperature,
            },
          }, actorUserId);
        }
      }

      // Saturação de Oxigênio
      if (data.oxygenSaturation !== undefined && data.oxygenSaturation !== null) {
        if (data.oxygenSaturation < 90) {
          const notification = await this.notificationsService.createDirectedNotification(
            this.tenantContext.tenantId,
            recipientIds,
            {
            type: SystemNotificationType.VITAL_SIGN_ABNORMAL_BP, // Usando BP como placeholder
            category: NotificationCategory.VITAL_SIGN,
            severity: NotificationSeverity.CRITICAL,
            title: 'Saturação de O₂ Crítica',
            message: `Saturação de oxigênio crítica detectada para ${residentName}: ${data.oxygenSaturation}%`,
            actionUrl: `/dashboard/residentes/${residentId}`,
            entityType: 'VITAL_SIGN',
            entityId: vitalSignId,
            metadata: { residentName, vitalType: 'Saturação O₂', value: `${data.oxygenSaturation}%` },
          });
          this.logger.warn('Notificação criada: SpO₂ Crítica', { residentName, value: data.oxygenSaturation });

          await this.vitalSignAlertsService.create({
            residentId,
            vitalSignId,
            notificationId: notification.id,
            type: VitalSignAlertType.OXYGEN_LOW,
            severity: AlertSeverity.CRITICAL,
            title: 'Saturação de O₂ Crítica',
            description: `Saturação periférica de oxigênio crítica: ${data.oxygenSaturation}%. Valores usuais: ≥92%.`,
            value: `${data.oxygenSaturation}%`,
            metadata: {
              threshold: '<90%',
              expectedRange: '≥92%',
              detectedAt: new Date(),
              oxygenSaturation: data.oxygenSaturation,
            },
          }, actorUserId);
        } else if (data.oxygenSaturation < 92) {
          const notification = await this.notificationsService.createDirectedNotification(
            this.tenantContext.tenantId,
            recipientIds,
            {
            type: SystemNotificationType.VITAL_SIGN_ABNORMAL_BP, // Usando BP como placeholder
            category: NotificationCategory.VITAL_SIGN,
            severity: NotificationSeverity.WARNING,
            title: 'Saturação de O₂ Baixa',
            message: `Saturação de oxigênio baixa detectada para ${residentName}: ${data.oxygenSaturation}%`,
            actionUrl: `/dashboard/residentes/${residentId}`,
            entityType: 'VITAL_SIGN',
            entityId: vitalSignId,
            metadata: { residentName, vitalType: 'Saturação O₂', value: `${data.oxygenSaturation}%` },
          });
          this.logger.warn('Notificação criada: SpO₂ Baixa', { residentName, value: data.oxygenSaturation });

          await this.vitalSignAlertsService.create({
            residentId,
            vitalSignId,
            notificationId: notification.id,
            type: VitalSignAlertType.OXYGEN_LOW,
            severity: AlertSeverity.WARNING,
            title: 'Saturação de O₂ Baixa',
            description: `Saturação periférica de oxigênio baixa: ${data.oxygenSaturation}%. Valores usuais: ≥92%.`,
            value: `${data.oxygenSaturation}%`,
            metadata: {
              threshold: '<92%',
              expectedRange: '≥92%',
              detectedAt: new Date(),
              oxygenSaturation: data.oxygenSaturation,
            },
          }, actorUserId);
        }
      }

      // Frequência Cardíaca
      if (data.heartRate !== undefined && data.heartRate !== null) {
        if (data.heartRate > 120 || data.heartRate < 50) {
          const notification = await this.notificationsService.createDirectedNotification(
            this.tenantContext.tenantId,
            recipientIds,
            {
            type: SystemNotificationType.VITAL_SIGN_ABNORMAL_HEART_RATE,
            category: NotificationCategory.VITAL_SIGN,
            severity: NotificationSeverity.CRITICAL,
            title: 'Frequência Cardíaca Crítica',
            message: `Frequência cardíaca crítica detectada para ${residentName}: ${data.heartRate} bpm`,
            actionUrl: `/dashboard/residentes/${residentId}`,
            entityType: 'VITAL_SIGN',
            entityId: vitalSignId,
            metadata: { residentName, vitalType: 'Frequência Cardíaca', value: `${data.heartRate} bpm` },
          });
          this.logger.warn('Notificação criada: FC Crítica', { residentName, value: data.heartRate });

          await this.vitalSignAlertsService.create({
            residentId,
            vitalSignId,
            notificationId: notification.id,
            type: data.heartRate > 120 ? VitalSignAlertType.HEART_RATE_HIGH : VitalSignAlertType.HEART_RATE_LOW,
            severity: AlertSeverity.CRITICAL,
            title: 'Frequência Cardíaca Crítica',
            description: `Frequência cardíaca ${data.heartRate > 120 ? 'muito alta (taquicardia)' : 'muito baixa (bradicardia)'}: ${data.heartRate} bpm. Valores usuais: 60-100 bpm.`,
            value: `${data.heartRate} bpm`,
            metadata: {
              threshold: data.heartRate > 120 ? '>120 bpm' : '<50 bpm',
              expectedRange: '60-100 bpm',
              detectedAt: new Date(),
              heartRate: data.heartRate,
            },
          }, actorUserId);
        } else if (data.heartRate > 100 || data.heartRate < 60) {
          const notification = await this.notificationsService.createDirectedNotification(
            this.tenantContext.tenantId,
            recipientIds,
            {
            type: SystemNotificationType.VITAL_SIGN_ABNORMAL_HEART_RATE,
            category: NotificationCategory.VITAL_SIGN,
            severity: NotificationSeverity.WARNING,
            title: 'Frequência Cardíaca Anormal',
            message: `Frequência cardíaca anormal detectada para ${residentName}: ${data.heartRate} bpm`,
            actionUrl: `/dashboard/residentes/${residentId}`,
            entityType: 'VITAL_SIGN',
            entityId: vitalSignId,
            metadata: { residentName, vitalType: 'Frequência Cardíaca', value: `${data.heartRate} bpm` },
          });
          this.logger.warn('Notificação criada: FC Anormal', { residentName, value: data.heartRate });

          await this.vitalSignAlertsService.create({
            residentId,
            vitalSignId,
            notificationId: notification.id,
            type: data.heartRate > 100 ? VitalSignAlertType.HEART_RATE_HIGH : VitalSignAlertType.HEART_RATE_LOW,
            severity: AlertSeverity.WARNING,
            title: 'Frequência Cardíaca Anormal',
            description: `Frequência cardíaca ${data.heartRate > 100 ? 'elevada' : 'baixa'}: ${data.heartRate} bpm. Valores usuais: 60-100 bpm.`,
            value: `${data.heartRate} bpm`,
            metadata: {
              threshold: data.heartRate > 100 ? '>100 bpm' : '<60 bpm',
              expectedRange: '60-100 bpm',
              detectedAt: new Date(),
              heartRate: data.heartRate,
            },
          }, actorUserId);
        }
      }
    } catch (error) {
      // Não falhar a criação/atualização do sinal vital se notificação falhar
      this.logger.error('Erro ao criar notificação de anomalia', {
        error: error instanceof Error ? error.message : String(error),
        vitalSignId,
        residentId,
      });
    }
  }
}
