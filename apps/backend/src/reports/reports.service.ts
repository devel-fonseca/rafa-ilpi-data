/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-restricted-syntax */
import { Injectable } from '@nestjs/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { parseDateOnly, formatDateOnly, getCurrentDateInTz, getDayRangeInTz } from '../utils/date.helpers';
import { FieldEncryption } from '../prisma/middleware/field-encryption.class';
import type { Prisma } from '@prisma/client';
import type {
  DailyReportDto,
  DailyRecordReportDto,
  MedicationAdministrationReportDto,
  VitalSignsReportDto,
  DailyReportSummaryDto,
  ShiftReportDto,
  DailyComplianceMetricDto,
  ScheduledEventReportDto,
  ImmunizationReportDto,
  MultiDayReportDto,
} from './dto/daily-report.dto';
import type { ResidentCareSummaryReportDto } from './dto/resident-care-summary-report.dto';
import type { ShiftHistoryReportDto } from './dto/shift-history-report.dto';

@Injectable()
export class ReportsService {
  private readonly fieldEncryption = new FieldEncryption();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private decryptMaybeEncrypted(
    value: string | null | undefined,
    tenantId: string,
  ): string | null {
    if (!value) return null;
    if (!this.fieldEncryption.isEncrypted(value)) return value;
    return this.fieldEncryption.decrypt(value, tenantId);
  }

  private normalizeTime(value: string) {
    const [h, m] = value.split(':');
    return `${String(h || '0').padStart(2, '0')}:${String(m || '0').padStart(2, '0')}`;
  }

  private timeToMinutes(value: string) {
    const normalized = this.normalizeTime(value);
    const [h, m] = normalized.split(':').map(Number);
    return h * 60 + m;
  }

  private isTimeInWindow(
    time: string | null | undefined,
    window: { startTime: string; endTime: string; crossesMidnight: boolean },
  ) {
    if (!time) return false;
    const minutes = this.timeToMinutes(time);
    const start = this.timeToMinutes(window.startTime);
    const end = this.timeToMinutes(window.endTime);

    if (window.crossesMidnight) {
      return minutes >= start || minutes <= end;
    }

    return minutes >= start && minutes <= end;
  }

  private async getShiftTimeWindow(
    shiftTemplateId?: string,
  ): Promise<{ startTime: string; endTime: string; crossesMidnight: boolean } | null> {
    if (!shiftTemplateId || shiftTemplateId === 'ALL') {
      return null;
    }

    const [template, config] = await Promise.all([
      this.tenantContext.publicClient.shiftTemplate.findUnique({
        where: { id: shiftTemplateId },
        select: { startTime: true, endTime: true },
      }),
      this.tenantContext.client.tenantShiftConfig.findFirst({
        where: { shiftTemplateId, deletedAt: null },
        select: { customStartTime: true, customEndTime: true },
      }),
    ]);

    const startRaw = config?.customStartTime || template?.startTime;
    const endRaw = config?.customEndTime || template?.endTime;

    if (!startRaw || !endRaw) {
      return null;
    }

    const startTime = this.normalizeTime(startRaw);
    const endTime = this.normalizeTime(endRaw);

    const crossesMidnight = endTime <= startTime;
    return { startTime, endTime, crossesMidnight };
  }

  async generateDailyReport(
    tenantId: string,
    date: string,
    shiftTemplateId?: string,
  ): Promise<DailyReportDto> {
    // Buscar shiftWindow (para chamadas diretas ao método público)
    const shiftWindow = await this.getShiftTimeWindow(shiftTemplateId);
    return this.generateDailyReportInternal(tenantId, date, shiftTemplateId, shiftWindow);
  }

  /**
   * Método interno que recebe shiftWindow e cache compartilhado já resolvidos
   * Evita queries repetidas quando chamado em loop (multi-day reports)
   */
  private async generateDailyReportInternal(
    tenantId: string,
    date: string,
    shiftTemplateId: string | undefined,
    shiftWindow: { startTime: string; endTime: string; crossesMidnight: boolean } | null,
    sharedCache?: {
      templateMap: Map<string, { id: string; name: string; startTime: string; endTime: string }>;
      configMap: Map<string, { customName: string | null; customStartTime: string | null; customEndTime: string | null }>;
    },
  ): Promise<DailyReportDto> {
    const dateOnly = parseDateOnly(date);
    // Use noon UTC to avoid any date shift when Prisma casts to DATE
    const dateUtc = new Date(`${dateOnly}T12:00:00.000Z`);
    // Buscar dados em paralelo usando tenantContext.client
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { timezone: true },
    })
    const timezone = tenant?.timezone || 'America/Sao_Paulo'
    const { start: dayStart, end: dayEnd } = getDayRangeInTz(dateOnly, timezone)

    const [
      dailyRecords,
      medicationAdministrations,
      activeResidents,
      shifts,
      medicationScheduled,
      scheduledEvents,
      immunizations,
    ] =
      await Promise.all([
        this.getDailyRecords(dateOnly, dateUtc, shiftWindow),
        this.getMedicationAdministrations(dateOnly, dateUtc, shiftWindow),
        this.getActiveResidentsOnDate(dateUtc),
        this.getShiftsOnDate(dateUtc, shiftTemplateId, sharedCache),
        this.getMedicationScheduleCount(dayStart, dayEnd, shiftWindow),
        this.getScheduledEventsOnDate(dateOnly, dateUtc, timezone, shiftWindow),
        this.getImmunizationsOnDate(dateUtc, shiftWindow),
      ]);

    const compliance = await this.calculateScheduleCompliance(
      dateUtc,
      dailyRecords,
      activeResidents,
      shiftWindow,
    );

    // Extrair sinais vitais dos daily records (tipo MONITORAMENTO)
    const vitalSigns = this.extractVitalSigns(dailyRecords);

    // Calcular resumo
    const summary = this.calculateSummary(
      dateOnly,
      dailyRecords,
      medicationAdministrations,
      activeResidents.length,
      medicationScheduled,
      compliance,
    );

    return {
      summary,
      dailyRecords,
      medicationAdministrations,
      vitalSigns,
      shifts,
      scheduledEvents,
      immunizations,
    };
  }

  async generateMultiDayReport(
    tenantId: string,
    startDate: string,
    endDate?: string,
    shiftTemplateId?: string,
    options?: { allowExtendedRange?: boolean },
  ): Promise<MultiDayReportDto> {
    const start = parseDateOnly(startDate);
    const end = endDate ? parseDateOnly(endDate) : start;

    // Validar intervalo máximo de 7 dias
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    const daysDiff = Math.ceil(
      (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDiff > 7 && !options?.allowExtendedRange) {
      throw new Error(
        'O intervalo máximo permitido é de 7 dias. Por favor, selecione um período menor.',
      );
    }

    if (daysDiff < 0) {
      throw new Error(
        'A data final não pode ser anterior à data inicial.',
      );
    }

    // Gerar lista de datas entre start e end
    const dates: string[] = [];
    const currentDate = new Date(start);

    while (currentDate <= endDateObj) {
      dates.push(formatDateOnly(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Buscar dados compartilhados UMA VEZ (evita N queries repetidas)
    const [shiftWindow, allTemplates, allTenantConfigs] = await Promise.all([
      this.getShiftTimeWindow(shiftTemplateId),
      this.tenantContext.publicClient.shiftTemplate.findMany({
        where: { isActive: true },
      }),
      this.tenantContext.client.tenantShiftConfig.findMany({
        where: { deletedAt: null },
      }),
    ]);

    // Criar mapas para lookup rápido
    const templateMap = new Map(allTemplates.map((t) => [t.id, t]));
    const configMap = new Map(allTenantConfigs.map((c) => [c.shiftTemplateId, c]));
    const sharedCache = { templateMap, configMap };

    // Gerar relatório para cada dia SEQUENCIALMENTE
    // (evita contenção de conexões do pool ao disparar muitas queries paralelas)
    const reports: DailyReportDto[] = [];
    for (const date of dates) {
      const report = await this.generateDailyReportInternal(tenantId, date, shiftTemplateId, shiftWindow, sharedCache);
      reports.push(report);
    }

    return {
      startDate: start,
      endDate: end,
      reports,
    };
  }

  private async getDailyRecords(
    date: string,
    dateUtc: Date,
    shiftWindow?: { startTime: string; endTime: string; crossesMidnight: boolean } | null,
  ): Promise<DailyRecordReportDto[]> {
    const nextDateUtc = new Date(dateUtc);
    nextDateUtc.setDate(nextDateUtc.getDate() + 1);

    const records = await this.tenantContext.client.dailyRecord.findMany({
      where: {
        deletedAt: null,
        ...(shiftWindow
          ? shiftWindow.crossesMidnight
            ? {
                OR: [
                  {
                    date: dateUtc,
                  },
                  {
                    date: nextDateUtc,
                  },
                ],
              }
            : {
                date: dateUtc,
              }
          : { date: dateUtc }),
      },
      include: {
        resident: {
          select: {
            fullName: true,
            cpf: true,
            cns: true,
            bed: {
              select: {
                code: true,
              },
            },
          },
        },
      },
      orderBy: [{ time: 'asc' }],
    });

    const filtered = shiftWindow
      ? records.filter((record) => this.isTimeInWindow(record.time, shiftWindow))
      : records;

    return filtered.map((record) => ({
      residentId: record.residentId,
      residentName: record.resident.fullName,
      residentCpf: record.resident.cpf || '',
      residentCns: record.resident.cns || undefined,
      bedCode: record.resident.bed?.code || 'N/A',
      date: formatDateOnly(record.date),
      time: record.time,
      type: record.type,
      recordedBy: record.recordedBy || 'N/A',
      details: {
        ...(record.data as any),
        incidentSeverity: record.incidentSeverity,
        incidentCategory: record.incidentCategory,
        incidentSubtypeClinical: record.incidentSubtypeClinical,
        incidentSubtypeAssist: record.incidentSubtypeAssist,
        incidentSubtypeAdmin: record.incidentSubtypeAdmin,
        isEventoSentinela: record.isEventoSentinela,
      },
      notes: record.notes || undefined,
      createdAt: record.createdAt.toISOString(),
      origin: 'AD_HOC',
      scheduleConfigId: undefined,
    }));
  }

  private async getMedicationAdministrations(
    date: string,
    dateUtc: Date,
    shiftWindow?: { startTime: string; endTime: string; crossesMidnight: boolean } | null,
  ): Promise<MedicationAdministrationReportDto[]> {
    const nextDateUtc = new Date(dateUtc);
    nextDateUtc.setDate(nextDateUtc.getDate() + 1);

    const administrations = await this.tenantContext.client.medicationAdministration.findMany(
      {
        where: {
          ...(shiftWindow
            ? shiftWindow.crossesMidnight
              ? {
                  OR: [
                    {
                      date: dateUtc,
                    },
                    {
                      date: nextDateUtc,
                    },
                  ],
                }
              : {
                  date: dateUtc,
                }
            : { date: dateUtc }),
        },
        include: {
          resident: {
            select: {
              fullName: true,
              cpf: true,
              cns: true,
              bed: {
                select: {
                  code: true,
                },
              },
            },
          },
          medication: {
            select: {
              name: true,
              concentration: true,
              dose: true,
              route: true,
            },
          },
        },
        orderBy: [{ scheduledTime: 'asc' }],
      },
    );

    const filtered = shiftWindow
      ? administrations.filter((admin) =>
          this.isTimeInWindow(admin.scheduledTime, shiftWindow),
        )
      : administrations;

    return filtered.map((admin) => ({
      residentName: admin.resident.fullName,
      residentCpf: admin.resident.cpf || '',
      residentCns: admin.resident.cns || undefined,
      bedCode: admin.resident.bed?.code || 'N/A',
      medicationName: admin.medication.name,
      concentration: admin.medication.concentration || '',
      dose: admin.medication.dose || 'N/A',
      route: admin.medication.route || 'N/A',
      scheduledTime: admin.scheduledTime,
      actualTime: admin.actualTime || undefined,
      wasAdministered: admin.wasAdministered,
      administeredBy: admin.administeredBy || undefined,
      reason: admin.reason || undefined,
      notes: admin.notes || undefined,
    }));
  }

  private async getActiveResidentsOnDate(dateUtc: Date): Promise<any[]> {
    return this.tenantContext.client.resident.findMany({
      where: {
        deletedAt: null,
        status: 'Ativo',
        admissionDate: { lte: dateUtc },
        OR: [{ dischargeDate: null }, { dischargeDate: { gte: dateUtc } }],
      },
      select: {
        id: true,
        fullName: true,
      },
    });
  }

  private extractVitalSigns(
    dailyRecords: DailyRecordReportDto[],
  ): VitalSignsReportDto[] {
    return dailyRecords
      .filter((record) => record.type === 'MONITORAMENTO')
      .map((record) => {
        const details = record.details as any;
        return {
          residentName: record.residentName,
          residentCpf: record.residentCpf,
          bedCode: record.bedCode,
          time: record.time,
          bloodPressure: details.pressaoArterial || undefined,
          heartRate: details.frequenciaCardiaca
            ? parseInt(details.frequenciaCardiaca)
            : undefined,
          temperature: details.temperatura
            ? parseFloat(details.temperatura)
            : undefined,
          oxygenSaturation: details.saturacaoO2
            ? parseInt(details.saturacaoO2)
            : undefined,
          glucose: details.glicemia ? parseInt(details.glicemia) : undefined,
        };
      });
  }

  private calculateSummary(
    date: string,
    dailyRecords: DailyRecordReportDto[],
    medicationAdministrations: MedicationAdministrationReportDto[],
    totalResidents: number,
    totalMedicationsScheduled: number,
    compliance: DailyComplianceMetricDto[],
  ): DailyReportSummaryDto {
    // Contar registros por tipo
    const hygieneRecords = dailyRecords.filter((r) => r.type === 'HIGIENE');
    const feedingRecords = dailyRecords.filter((r) => r.type === 'ALIMENTACAO');
    const monitoringRecords = dailyRecords.filter(
      (r) => r.type === 'MONITORAMENTO',
    );

    // Calcular coberturas (% de residentes que tiveram o registro)
    const uniqueResidentsWithHygiene = new Set(
      hygieneRecords.map((r) => r.residentCpf),
    ).size;
    const uniqueResidentsWithFeeding = new Set(
      feedingRecords.map((r) => r.residentCpf),
    ).size;
    const uniqueResidentsWithVitalSigns = new Set(
      monitoringRecords.map((r) => r.residentCpf),
    ).size;

    const hygieneCoverage =
      totalResidents > 0
        ? Math.round((uniqueResidentsWithHygiene / totalResidents) * 100)
        : 0;
    const feedingCoverage =
      totalResidents > 0
        ? Math.round((uniqueResidentsWithFeeding / totalResidents) * 100)
        : 0;
    const vitalSignsCoverage =
      totalResidents > 0
        ? Math.round((uniqueResidentsWithVitalSigns / totalResidents) * 100)
        : 0;

    // Contar medicações administradas
    const totalMedicationsAdministered = medicationAdministrations.filter(
      (m) => m.wasAdministered,
    ).length;

    return {
      date,
      totalResidents,
      totalDailyRecords: dailyRecords.length,
      totalMedicationsAdministered,
      totalMedicationsScheduled,
      hygieneCoverage,
      feedingCoverage,
      vitalSignsCoverage,
      compliance,
    };
  }

  private async getMedicationScheduleCount(
    dayStart: Date,
    dayEnd: Date,
    shiftWindow?: { startTime: string; endTime: string; crossesMidnight: boolean } | null,
  ): Promise<number> {
    // CORREÇÃO: Para campos DATE (data civil), usar noon UTC para evitar timezone shift
    // Medication.startDate é @db.Date, então Prisma o converte para UTC midnight
    // Precisamos comparar usando a mesma convenção
    const dateOnly = formatDateOnly(dayStart);
    const dateForQuery = new Date(`${dateOnly}T12:00:00.000Z`);

    const prescriptions = await this.tenantContext.client.prescription.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        medications: {
          some: {
            deletedAt: null,
            startDate: { lte: dateForQuery },
            OR: [{ endDate: null }, { endDate: { gte: dateForQuery } }],
          },
        },
      },
      include: {
        medications: {
          where: {
            deletedAt: null,
            startDate: { lte: dateForQuery },
            OR: [{ endDate: null }, { endDate: { gte: dateForQuery } }],
          },
        },
      },
    });

    let scheduled = 0;
    for (const prescription of prescriptions) {
      for (const medication of prescription.medications) {
        const scheduledTimes = medication.scheduledTimes as string[];
        if (scheduledTimes && Array.isArray(scheduledTimes)) {
          if (shiftWindow) {
            for (const time of scheduledTimes) {
              const normalized = this.normalizeTime(String(time));
              if (shiftWindow.crossesMidnight) {
                if (
                  normalized >= shiftWindow.startTime ||
                  normalized <= shiftWindow.endTime
                ) {
                  scheduled += 1;
                }
              } else if (
                normalized >= shiftWindow.startTime &&
                normalized <= shiftWindow.endTime
              ) {
                scheduled += 1;
              }
            }
          } else {
            scheduled += scheduledTimes.length;
          }
        }
      }
    }

    return scheduled;
  }

  private async calculateScheduleCompliance(
    dateUtc: Date,
    dailyRecords: DailyRecordReportDto[],
    activeResidents: Array<{ id: string }>,
    shiftWindow?: { startTime: string; endTime: string; crossesMidnight: boolean } | null,
  ): Promise<DailyComplianceMetricDto[]> {
    if (activeResidents.length === 0) {
      return [];
    }

    const residentIds = activeResidents.map((resident) => resident.id);
    const configs = await this.tenantContext.client.residentScheduleConfig.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        residentId: { in: residentIds },
      },
    });

    const dueItems: Array<{
      configId: string;
      residentId: string;
      recordType: string;
      scheduledTime?: string | null;
      metadata?: Record<string, any> | null;
    }> = [];

    const isExpectedToday = (config: { frequency: string; dayOfWeek?: number | null; dayOfMonth?: number | null }) => {
      const dayOfWeek = dateUtc.getDay();
      switch (config.frequency) {
        case 'DAILY':
          return true;
        case 'WEEKLY':
          return config.dayOfWeek !== null && config.dayOfWeek !== undefined
            ? config.dayOfWeek === dayOfWeek
            : false;
        case 'MONTHLY':
          return config.dayOfMonth ? dateUtc.getDate() === config.dayOfMonth : false;
        default:
          return false;
      }
    };

    const normalize = (value?: string | null) =>
      value ? value.toString().trim().toLowerCase() : '';

    for (const config of configs) {
      if (!isExpectedToday(config)) {
        continue;
      }
      const times = Array.isArray(config.suggestedTimes) ? config.suggestedTimes : [];
      if (times.length === 0) {
        dueItems.push({
          configId: config.id,
          residentId: config.residentId,
          recordType: config.recordType,
          scheduledTime: null,
          metadata: (config.metadata as any) || null,
        });
        continue;
      }
      for (const time of times) {
        if (shiftWindow) {
          const normalized = this.normalizeTime(String(time));
          if (shiftWindow.crossesMidnight) {
            if (
              normalized < shiftWindow.startTime &&
              normalized > shiftWindow.endTime
            ) {
              continue;
            }
          } else if (
            normalized < shiftWindow.startTime ||
            normalized > shiftWindow.endTime
          ) {
            continue;
          }
        }
        dueItems.push({
          configId: config.id,
          residentId: config.residentId,
          recordType: config.recordType,
          scheduledTime: String(time),
          metadata: (config.metadata as any) || null,
        });
      }
    }

    const recordKey = (record: DailyRecordReportDto) => `${record.residentId}:${record.type}`;
    const recordsByKey = new Map<string, DailyRecordReportDto[]>();
    for (const record of dailyRecords) {
      const key = recordKey(record);
      const list = recordsByKey.get(key) || [];
      list.push(record);
      recordsByKey.set(key, list);
    }

    for (const list of recordsByKey.values()) {
      list.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    }

    const assigned = new WeakSet<DailyRecordReportDto>();
    const graceMinutes = 60;

    const timeToMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const findMatch = (
      records: DailyRecordReportDto[],
      due: { scheduledTime?: string | null; metadata?: Record<string, any> | null },
    ) => {
      const mealType = normalize(due.metadata?.mealType);
      let bestIndex = -1;
      let bestDiff = Infinity;

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        if (assigned.has(record)) {
          continue;
        }
        if (mealType) {
          const recordMeal = normalize((record.details as any)?.refeicao);
          if (recordMeal && recordMeal !== mealType) {
            continue;
          }
        }
        if (due.scheduledTime) {
          const diff = Math.abs(timeToMinutes(record.time) - timeToMinutes(due.scheduledTime));
          if (diff > graceMinutes) {
            continue;
          }
          if (diff < bestDiff) {
            bestDiff = diff;
            bestIndex = i;
          }
        } else {
          return i;
        }
      }

      return bestIndex;
    };

    for (const due of dueItems) {
      const key = `${due.residentId}:${due.recordType}`;
      const records = recordsByKey.get(key);
      if (!records || records.length === 0) {
        continue;
      }
      const matchIndex = findMatch(records, due);
      if (matchIndex === -1) {
        continue;
      }
      const record = records[matchIndex];
      assigned.add(record);
      record.origin = 'SCHEDULED';
      record.scheduleConfigId = due.configId;
    }

    const metricsMap = new Map<string, DailyComplianceMetricDto>();
    for (const due of dueItems) {
      const metric =
        metricsMap.get(due.recordType) ||
        ({
          recordType: due.recordType,
          due: 0,
          done: 0,
          overdue: 0,
          adHoc: 0,
          compliance: null,
        } as DailyComplianceMetricDto);
      metric.due += 1;
      metricsMap.set(due.recordType, metric);
    }

    for (const record of dailyRecords) {
      const metric =
        metricsMap.get(record.type) ||
        ({
          recordType: record.type,
          due: 0,
          done: 0,
          overdue: 0,
          adHoc: 0,
          compliance: null,
        } as DailyComplianceMetricDto);
      if (record.origin === 'SCHEDULED') {
        metric.done += 1;
      } else {
        metric.adHoc += 1;
      }
      metricsMap.set(record.type, metric);
    }

    const metrics = Array.from(metricsMap.values()).map((metric) => {
      if (metric.due > 0) {
        metric.overdue = Math.max(metric.due - metric.done, 0);
        metric.compliance = Math.round((metric.done / metric.due) * 100);
      } else {
        metric.overdue = 0;
        metric.compliance = null;
      }
      return metric;
    });

    return metrics;
  }

  private async getShiftsOnDate(
    dateUtc: Date,
    shiftTemplateId?: string,
    sharedCache?: {
      templateMap: Map<string, { id: string; name: string; startTime: string; endTime: string }>;
      configMap: Map<string, { customName: string | null; customStartTime: string | null; customEndTime: string | null }>;
    },
  ): Promise<ShiftReportDto[]> {
    const shifts = await this.tenantContext.client.shift.findMany({
      where: {
        date: dateUtc,
        deletedAt: null,
        ...(shiftTemplateId && shiftTemplateId !== 'ALL' ? { shiftTemplateId } : {}),
      },
      include: {
        team: {
          select: {
            name: true,
            color: true,
          },
        },
      },
      orderBy: [{ shiftTemplateId: 'asc' }],
    });

    if (shifts.length === 0) {
      return [];
    }

    // Usar cache compartilhado se disponível, senão buscar do banco
    let templateMap: Map<string, { id: string; name: string; startTime: string; endTime: string }>;
    let configMap: Map<string, { customName: string | null; customStartTime: string | null; customEndTime: string | null }>;

    if (sharedCache) {
      // Usar cache pré-carregado (evita queries repetidas em multi-day)
      templateMap = sharedCache.templateMap;
      configMap = sharedCache.configMap;
    } else {
      // Fallback: buscar do banco (para chamadas avulsas)
      const shiftTemplateIds = [...new Set(shifts.map((s) => s.shiftTemplateId))];

      const [shiftTemplates, tenantConfigs] = await Promise.all([
        this.tenantContext.publicClient.shiftTemplate.findMany({
          where: { id: { in: shiftTemplateIds } },
        }),
        this.tenantContext.client.tenantShiftConfig.findMany({
          where: {
            shiftTemplateId: { in: shiftTemplateIds },
            deletedAt: null,
          },
        }),
      ]);

      templateMap = new Map(shiftTemplates.map((t) => [t.id, t]));
      configMap = new Map(tenantConfigs.map((c) => [c.shiftTemplateId, c]));
    }

    return shifts.map((shift) => {
      const template = templateMap.get(shift.shiftTemplateId);
      const config = configMap.get(shift.shiftTemplateId);
      const name = config?.customName || template?.name || 'Turno';
      const startTime = config?.customStartTime || template?.startTime || '00:00';
      const endTime = config?.customEndTime || template?.endTime || '00:00';

      return {
        id: shift.id,
        date: formatDateOnly(shift.date),
        name,
        startTime,
        endTime,
        teamName: shift.team?.name || undefined,
        teamColor: shift.team?.color || undefined,
        status: shift.status,
      };
    });
  }

  private async getScheduledEventsOnDate(
    date: string,
    dateUtc: Date,
    timezone: string,
    shiftWindow?: { startTime: string; endTime: string; crossesMidnight: boolean } | null,
  ): Promise<ScheduledEventReportDto[]> {
    const nextDateUtc = new Date(dateUtc);
    nextDateUtc.setDate(nextDateUtc.getDate() + 1);

    const events = await this.tenantContext.client.residentScheduledEvent.findMany({
      where: {
        deletedAt: null,
        ...(shiftWindow
          ? shiftWindow.crossesMidnight
            ? {
                OR: [
                  { scheduledDate: dateUtc },
                  { scheduledDate: nextDateUtc },
                ],
              }
            : { scheduledDate: dateUtc }
          : { scheduledDate: dateUtc }),
      },
      include: {
        resident: {
          select: {
            fullName: true,
            cpf: true,
            cns: true,
            bed: {
              select: { code: true },
            },
          },
        },
      },
      orderBy: [{ scheduledTime: 'asc' }, { createdAt: 'asc' }],
    });

    const currentDate = getCurrentDateInTz(timezone);
    const currentTime = new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());

    return events
      .filter((event) =>
        shiftWindow ? this.isTimeInWindow(event.scheduledTime, shiftWindow) : true,
      )
      .map((event) => {
        const eventDate = formatDateOnly(event.scheduledDate);
        let effectiveStatus = event.status as 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'MISSED';

        if (effectiveStatus === 'SCHEDULED') {
          const isPastDate = eventDate < currentDate;
          const isPastTimeToday = eventDate === currentDate && event.scheduledTime <= currentTime;
          if (isPastDate || isPastTimeToday) {
            effectiveStatus = 'MISSED';
          }
        }

        const normalizedStatus: 'COMPLETED' | 'MISSED' =
          effectiveStatus === 'COMPLETED' ? 'COMPLETED' : 'MISSED';

        return {
          residentName: event.resident.fullName,
          residentCpf: event.resident.cpf || '',
          residentCns: event.resident.cns || undefined,
          bedCode: event.resident.bed?.code || 'N/A',
          eventType: event.eventType,
          title: event.title,
          date: eventDate,
          time: event.scheduledTime,
          status: normalizedStatus,
          notes: event.notes || undefined,
        };
      })
      .filter((event) => event.status === 'COMPLETED' || event.status === 'MISSED');
  }

  private async getImmunizationsOnDate(
    dateUtc: Date,
    shiftWindow?: { startTime: string; endTime: string; crossesMidnight: boolean } | null,
  ): Promise<ImmunizationReportDto[]> {
    const nextDateUtc = new Date(dateUtc);
    nextDateUtc.setDate(nextDateUtc.getDate() + 1);

    const immunizations = await this.tenantContext.client.vaccination.findMany({
      where: {
        deletedAt: null,
        ...(shiftWindow
          ? shiftWindow.crossesMidnight
            ? {
                OR: [{ date: dateUtc }, { date: nextDateUtc }],
              }
            : { date: dateUtc }
          : { date: dateUtc }),
      },
      include: {
        resident: {
          select: {
            fullName: true,
            cpf: true,
            cns: true,
            bed: {
              select: { code: true },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    return immunizations.map((item) => ({
      residentName: item.resident.fullName,
      residentCpf: item.resident.cpf || '',
      residentCns: item.resident.cns || undefined,
      bedCode: item.resident.bed?.code || 'N/A',
      vaccineOrProphylaxis: item.vaccine || 'Não informado',
      dose: item.dose || 'Não informado',
      batch: item.batch || 'Não informado',
      manufacturer: item.manufacturer || 'Não informado',
      healthEstablishmentWithCnes:
        item.healthUnit && item.cnes
          ? `${item.healthUnit} (${item.cnes})`
          : item.healthUnit
            ? item.healthUnit
            : item.cnes
              ? item.cnes
              : 'Não informado',
      municipalityState:
        item.municipality && item.state
          ? `${item.municipality}/${item.state}`
          : item.municipality || item.state || 'Não informado',
    }));
  }

  // ============================================================================
  // RELATÓRIO DE HISTÓRICO DE PLANTÃO
  // ============================================================================

  async generateShiftHistoryReport(
    tenantId: string,
    shiftId: string,
  ): Promise<ShiftHistoryReportDto> {
    const shift = await this.tenantContext.client.shift.findFirst({
      where: {
        id: shiftId,
        deletedAt: null,
        status: { in: ['COMPLETED', 'ADMIN_CLOSED'] },
      },
      include: {
        team: {
          select: {
            name: true,
          },
        },
        handover: true,
      },
    });

    if (!shift) {
      throw new NotFoundException('Plantão não encontrado no histórico.');
    }

    if (!shift.handover) {
      throw new BadRequestException('Plantão sem registro de passagem/encerramento.');
    }

    const [template, config] = await Promise.all([
      this.tenantContext.publicClient.shiftTemplate.findUnique({
        where: { id: shift.shiftTemplateId },
        select: { name: true, startTime: true, endTime: true },
      }),
      this.tenantContext.client.tenantShiftConfig.findFirst({
        where: {
          shiftTemplateId: shift.shiftTemplateId,
          deletedAt: null,
        },
        select: {
          customName: true,
          customStartTime: true,
          customEndTime: true,
        },
      }),
    ]);

    const shiftName = config?.customName || template?.name || 'Turno';
    const startTime = config?.customStartTime || template?.startTime || '00:00';
    const endTime = config?.customEndTime || template?.endTime || '00:00';

    const snapshot = (shift.handover.activitiesSnapshot || {}) as Record<string, any>;

    type RawActivity = {
      activityId: string | null;
      registeredTime: string;
      recordType: string;
      residentId: string | null;
      recordDetails: string | null;
      userId: string | null;
      timestamp: string | null;
    };

    const shiftMembersActivities: RawActivity[] = [];
    const otherUsersActivities: RawActivity[] = [];

    const pushActivities = (
      target: RawActivity[],
      items: any[] | undefined,
      recordTypeResolver: (item: any) => string,
    ) => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        target.push({
          activityId: item.id || null,
          registeredTime: item.time || item.scheduledTime || '--:--',
          recordType: recordTypeResolver(item),
          residentId: item.residentId || null,
          recordDetails: null,
          userId: item.userId || null,
          timestamp: item.createdAt || null,
        });
      }
    };

    const buildMedicationDetails = (item: any) => {
      const parts = [item?.medicationName, item?.concentration, item?.dose]
        .map((value: unknown) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value) => value.length > 0);
      return parts.length > 0 ? parts.join(' | ') : null;
    };

    if (snapshot.breakdown?.fromShiftMembers || snapshot.breakdown?.fromOthers) {
      pushActivities(
        shiftMembersActivities,
        snapshot.breakdown?.fromShiftMembers?.dailyRecords,
        (item) => item.type || 'REGISTRO_DIARIO',
      );
      pushActivities(
        shiftMembersActivities,
        snapshot.breakdown?.fromShiftMembers?.medicationAdministrations?.continuous,
        () => 'MEDICACAO_CONTINUA',
      );
      pushActivities(
        shiftMembersActivities,
        snapshot.breakdown?.fromShiftMembers?.medicationAdministrations?.sos,
        () => 'MEDICACAO_SOS',
      );

      pushActivities(
        otherUsersActivities,
        snapshot.breakdown?.fromOthers?.dailyRecords,
        (item) => item.type || 'REGISTRO_DIARIO',
      );
      pushActivities(
        otherUsersActivities,
        snapshot.breakdown?.fromOthers?.medicationAdministrations?.continuous,
        () => 'MEDICACAO_CONTINUA',
      );
      pushActivities(
        otherUsersActivities,
        snapshot.breakdown?.fromOthers?.medicationAdministrations?.sos,
        () => 'MEDICACAO_SOS',
      );

      const applyMedicationDetails = (rows: RawActivity[], sourceItems: any[] | undefined) => {
        if (!Array.isArray(sourceItems)) return;
        const detailById = new Map<string, string | null>();
        for (const item of sourceItems) {
          if (item?.id) {
            detailById.set(String(item.id), buildMedicationDetails(item));
          }
        }
        for (const row of rows) {
          const detail = row.activityId ? detailById.get(String(row.activityId)) : null;
          if (detail) row.recordDetails = detail;
        }
      };

      applyMedicationDetails(
        shiftMembersActivities.filter((row) => row.recordType === 'MEDICACAO_CONTINUA'),
        snapshot.breakdown?.fromShiftMembers?.medicationAdministrations?.continuous,
      );
      applyMedicationDetails(
        shiftMembersActivities.filter((row) => row.recordType === 'MEDICACAO_SOS'),
        snapshot.breakdown?.fromShiftMembers?.medicationAdministrations?.sos,
      );
      applyMedicationDetails(
        otherUsersActivities.filter((row) => row.recordType === 'MEDICACAO_CONTINUA'),
        snapshot.breakdown?.fromOthers?.medicationAdministrations?.continuous,
      );
      applyMedicationDetails(
        otherUsersActivities.filter((row) => row.recordType === 'MEDICACAO_SOS'),
        snapshot.breakdown?.fromOthers?.medicationAdministrations?.sos,
      );
    } else if (Array.isArray(snapshot.byType)) {
      // Fallback para snapshots legados sem breakdown por origem:
      // assume registros da equipe do plantão (comportamento histórico anterior).
      for (const typeGroup of snapshot.byType) {
        const recordType = typeGroup?.type || 'REGISTRO_DIARIO';
        if (!Array.isArray(typeGroup?.records)) continue;
        for (const record of typeGroup.records) {
          shiftMembersActivities.push({
            activityId: record.id || null,
            registeredTime: record.time || '--:--',
            recordType,
            residentId: record.residentId || null,
            recordDetails: null,
            userId: record.userId || null,
            timestamp: record.createdAt || null,
          });
        }
      }
    }

    const normalizeTime = (value: string) => {
      const [h = '00', m = '00'] = String(value).split(':');
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    };

    const sortRows = (rows: RawActivity[]) =>
      rows.sort((a, b) => {
        const byTime = normalizeTime(a.registeredTime).localeCompare(
          normalizeTime(b.registeredTime),
        );
        if (byTime !== 0) return byTime;
        return (a.timestamp || '').localeCompare(b.timestamp || '');
      });

    sortRows(shiftMembersActivities);
    sortRows(otherUsersActivities);

    const userIds = new Set<string>();
    const residentIds = new Set<string>();
    if (shift.handover.handedOverBy) userIds.add(shift.handover.handedOverBy);
    if (shift.handover.receivedBy) userIds.add(shift.handover.receivedBy);
    for (const row of [...shiftMembersActivities, ...otherUsersActivities]) {
      if (row.userId) userIds.add(row.userId);
      if (row.residentId) residentIds.add(row.residentId);
    }

    const [users, residents] = await Promise.all([
      userIds.size > 0
        ? this.tenantContext.client.user.findMany({
            where: { id: { in: Array.from(userIds) } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      residentIds.size > 0
        ? this.tenantContext.client.resident.findMany({
            where: { id: { in: Array.from(residentIds) } },
            select: { id: true, fullName: true },
          })
        : Promise.resolve([]),
    ]);
    const userMap = new Map(users.map((user) => [user.id, user.name]));
    const residentMap = new Map(residents.map((resident) => [resident.id, resident.fullName]));

    const toViewRows = (rows: RawActivity[]) =>
      rows.map((row) => ({
        registeredTime: normalizeTime(row.registeredTime),
        recordType: row.recordType,
        residentName: row.residentId
          ? residentMap.get(row.residentId) || 'Residente não identificado'
          : 'Residente não identificado',
        recordDetails: row.recordDetails,
        recordedBy: row.userId ? userMap.get(row.userId) || 'Usuário' : 'Usuário',
        timestamp: row.timestamp,
      }));

    const shiftMemberRows = toViewRows(shiftMembersActivities);
    const otherUserRows = toViewRows(otherUsersActivities);
    const totalActivities =
      snapshot?.totals?.totalActivities ||
      shiftMemberRows.length + otherUserRows.length;

    return {
      summary: {
        shiftId: shift.id,
        date: formatDateOnly(shift.date),
        shiftName,
        startTime,
        endTime,
        teamName: shift.team?.name || null,
        status: shift.status,
        closedAt: shift.handover.createdAt.toISOString(),
        closedBy: userMap.get(shift.handover.handedOverBy) || 'Usuário',
        handoverType: shift.status === 'ADMIN_CLOSED' ? 'ADMIN_CLOSED' : 'COMPLETED',
        receivedBy: shift.handover.receivedBy
          ? userMap.get(shift.handover.receivedBy) || 'Usuário'
          : null,
        report: shift.handover.report,
        totalActivities,
        shiftMembersActivities:
          snapshot?.totals?.bySource?.shiftMembers || shiftMemberRows.length,
        otherUsersActivities: snapshot?.totals?.bySource?.others || otherUserRows.length,
      },
      shiftMembersActivities: shiftMemberRows,
      otherUsersActivities: otherUserRows,
    };
  }

  // ============================================================================
  // RELATÓRIO DE LISTA DE RESIDENTES
  // ============================================================================

  async generateResidentsListReport(
    tenantId: string,
    status: string = 'Ativo',
  ): Promise<{
    summary: {
      generatedAt: string;
      totalResidents: number;
      byDependencyLevel: Array<{ level: string; count: number; percentage: number }>;
      averageAge: number;
      minAge: number;
      maxAge: number;
      averageStayDays: number;
    };
    residents: Array<{
      id: string;
      fullName: string;
      age: number;
      birthDate: string;
      admissionDate: string;
      stayDays: number;
      dependencyLevel: string | null;
      bedCode: string | null;
      conditions: string[];
    }>;
  }> {
    const today = new Date();

    // Buscar residentes com condições, leito e avaliação de dependência vigente
    const residents = await this.tenantContext.client.resident.findMany({
      where: {
        status,
        deletedAt: null,
      },
      include: {
        conditions: {
          where: { deletedAt: null },
          select: { condition: true },
        },
        bed: {
          select: { code: true },
        },
        dependencyAssessments: {
          where: {
            deletedAt: null,
            endDate: null, // Avaliação vigente
          },
          select: { dependencyLevel: true },
          take: 1,
          orderBy: { effectiveDate: 'desc' },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    // Mapa para converter enum para texto legível
    const dependencyLevelMap: Record<string, string> = {
      GRAU_I: 'Grau I',
      GRAU_II: 'Grau II',
      GRAU_III: 'Grau III',
    };

    // Processar cada residente
    const processedResidents = residents.map((resident) => {
      // Calcular idade
      const birthDate = resident.birthDate;
      const age = this.calculateAge(birthDate, today);

      // Calcular tempo de permanência
      const admissionDate = resident.admissionDate;
      const stayDays = this.calculateDaysDifference(admissionDate, today);

      // Obter grau de dependência da avaliação vigente
      const assessment = resident.dependencyAssessments[0];
      const dependencyLevel = assessment
        ? dependencyLevelMap[assessment.dependencyLevel] || null
        : null;

      return {
        id: resident.id,
        fullName: resident.fullName,
        age,
        birthDate: formatDateOnly(birthDate),
        admissionDate: formatDateOnly(admissionDate),
        stayDays,
        dependencyLevel,
        bedCode: resident.bed?.code || null,
        conditions: resident.conditions.map((c) => c.condition),
      };
    });

    // Calcular estatísticas
    const totalResidents = processedResidents.length;
    const ages = processedResidents.map((r) => r.age);
    const stayDays = processedResidents.map((r) => r.stayDays);

    const averageAge = totalResidents > 0
      ? Math.round((ages.reduce((a, b) => a + b, 0) / totalResidents) * 10) / 10
      : 0;
    const minAge = totalResidents > 0 ? Math.min(...ages) : 0;
    const maxAge = totalResidents > 0 ? Math.max(...ages) : 0;
    const averageStayDays = totalResidents > 0
      ? Math.round(stayDays.reduce((a, b) => a + b, 0) / totalResidents)
      : 0;

    // Contar por grau de dependência
    const dependencyCount = new Map<string, number>();
    for (const resident of processedResidents) {
      const level = resident.dependencyLevel || 'Não informado';
      dependencyCount.set(level, (dependencyCount.get(level) || 0) + 1);
    }

    const byDependencyLevel = Array.from(dependencyCount.entries())
      .map(([level, count]) => ({
        level,
        count,
        percentage: totalResidents > 0 ? Math.round((count / totalResidents) * 100) : 0,
      }))
      .sort((a, b) => {
        // Ordenar: Grau I, Grau II, Grau III, Não informado
        const order = ['Grau I', 'Grau II', 'Grau III', 'Não informado'];
        const aIndex = order.findIndex((o) => a.level.startsWith(o));
        const bIndex = order.findIndex((o) => b.level.startsWith(o));
        return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
      });

    return {
      summary: {
        generatedAt: new Date().toISOString(),
        totalResidents,
        byDependencyLevel,
        averageAge,
        minAge,
        maxAge,
        averageStayDays,
      },
      residents: processedResidents,
    };
  }

  private calculateAge(birthDate: Date, referenceDate: Date): number {
    let age = referenceDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  private calculateDaysDifference(startDate: Date, endDate: Date): number {
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  // ============================================================================
  // RESUMO ASSISTENCIAL DO RESIDENTE
  // ============================================================================

  async generateResidentCareSummaryReport(
    tenantId: string,
    residentId: string,
  ): Promise<ResidentCareSummaryReportDto> {
    // Buscar residente com todas as relações necessárias
    const resident = await this.tenantContext.client.resident.findUnique({
      where: { id: residentId },
      include: {
        bed: {
          select: { code: true },
        },
        bloodTypeRecord: {
          where: { deletedAt: null },
          select: { bloodType: true },
        },
        anthropometryRecords: {
          where: { deletedAt: null },
          orderBy: { measurementDate: 'desc' },
          take: 1,
          select: {
            height: true,
            weight: true,
            bmi: true,
            measurementDate: true,
            createdAt: true,
          },
        },
        dependencyAssessments: {
          where: { deletedAt: null, endDate: null },
          orderBy: { effectiveDate: 'desc' },
          take: 1,
          select: {
            dependencyLevel: true,
            effectiveDate: true,
            notes: true,
          },
        },
        clinicalProfile: {
          where: { deletedAt: null },
          select: {
            healthStatus: true,
            specialNeeds: true,
            functionalAspects: true,
          },
        },
        conditions: {
          where: { deletedAt: null },
          select: { condition: true, notes: true, contraindications: true },
          orderBy: { condition: 'asc' },
        },
        allergies: {
          where: { deletedAt: null },
          select: { substance: true, severity: true, reaction: true, contraindications: true },
          orderBy: { substance: 'asc' },
        },
        dietaryRestrictions: {
          where: { deletedAt: null },
          select: { description: true, restrictionType: true, notes: true, contraindications: true },
          orderBy: { description: 'asc' },
        },
        vaccinations: {
          where: { deletedAt: null },
          select: {
            vaccine: true,
            dose: true,
            date: true,
            manufacturer: true,
            batch: true,
            healthUnit: true,
            municipality: true,
            state: true,
          },
          orderBy: { date: 'desc' },
        },
        prescriptions: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          include: {
            medications: {
              where: {
                deletedAt: null,
                OR: [
                  { endDate: null },
                  { endDate: { gte: new Date() } },
                ],
              },
              select: {
                name: true,
                dose: true,
                route: true,
                frequency: true,
                scheduledTimes: true,
                concentration: true,
              },
            },
          },
        },
        scheduleConfigs: {
          where: {
            deletedAt: null,
            isActive: true,
          },
          select: {
            recordType: true,
            frequency: true,
            dayOfWeek: true,
            dayOfMonth: true,
            suggestedTimes: true,
            metadata: true,
          },
          orderBy: [
            { frequency: 'asc' },
            { dayOfWeek: 'asc' },
            { dayOfMonth: 'asc' },
            { createdAt: 'asc' },
          ],
        },
      },
    });

    if (!resident) {
      throw new Error('Residente não encontrado');
    }

    const today = new Date();

    // Processar dados básicos
    const basicInfo = {
      id: resident.id,
      fullName: resident.fullName,
      birthDate: formatDateOnly(resident.birthDate),
      age: this.calculateAge(resident.birthDate, today),
      cpf: resident.cpf || null,
      cns: resident.cns || null,
      photoUrl: resident.fotoUrl || null,
      admissionDate: formatDateOnly(resident.admissionDate),
      bedCode: resident.bed?.code || null,
    };

    // Processar responsável legal
    const legalGuardian = resident.legalGuardianName
      ? {
          name: resident.legalGuardianName,
          phone: resident.legalGuardianPhone || null,
          email: resident.legalGuardianEmail || null,
          relationship: this.formatGuardianType(resident.legalGuardianType),
          guardianshipType: resident.legalGuardianType || null,
        }
      : null;

    // Processar contatos de emergência
    const emergencyContacts = this.parseEmergencyContacts(resident.emergencyContacts);

    // Processar convênios
    const healthInsurances = this.parseHealthPlans(resident.healthPlans);

    // Processar tipo sanguíneo
    const bloodType = resident.bloodTypeRecord
      ? this.formatBloodType(resident.bloodTypeRecord.bloodType)
      : null;

    // Processar antropometria
    const anthropometry = resident.anthropometryRecords[0]
      ? {
          height: resident.anthropometryRecords[0].height
            ? Number(resident.anthropometryRecords[0].height)
            : null,
          weight: resident.anthropometryRecords[0].weight
            ? Number(resident.anthropometryRecords[0].weight)
            : null,
          bmi: resident.anthropometryRecords[0].bmi
            ? Number(resident.anthropometryRecords[0].bmi)
            : null,
          // measurementDate é DATE (civil, sem hora). Para hora real, usar createdAt.
          recordedAt: resident.anthropometryRecords[0].createdAt
            ? resident.anthropometryRecords[0].createdAt.toISOString()
            : null,
        }
      : null;

    // Processar sinais vitais consolidados por parâmetro (mesma lógica da Visualização Rápida)
    const [
      lastBloodPressure,
      lastBloodGlucose,
      lastTemperature,
      lastOxygenSaturation,
      lastHeartRate,
    ] = await Promise.all([
      this.tenantContext.client.vitalSign.findFirst({
        where: {
          residentId,
          deletedAt: null,
          systolicBloodPressure: { not: null },
          diastolicBloodPressure: { not: null },
        },
        select: {
          systolicBloodPressure: true,
          diastolicBloodPressure: true,
          timestamp: true,
        },
        orderBy: [{ timestamp: 'desc' }, { createdAt: 'desc' }],
      }),
      this.tenantContext.client.vitalSign.findFirst({
        where: {
          residentId,
          deletedAt: null,
          bloodGlucose: { not: null },
        },
        select: {
          bloodGlucose: true,
          timestamp: true,
        },
        orderBy: [{ timestamp: 'desc' }, { createdAt: 'desc' }],
      }),
      this.tenantContext.client.vitalSign.findFirst({
        where: {
          residentId,
          deletedAt: null,
          temperature: { not: null },
        },
        select: {
          temperature: true,
          timestamp: true,
        },
        orderBy: [{ timestamp: 'desc' }, { createdAt: 'desc' }],
      }),
      this.tenantContext.client.vitalSign.findFirst({
        where: {
          residentId,
          deletedAt: null,
          oxygenSaturation: { not: null },
        },
        select: {
          oxygenSaturation: true,
          timestamp: true,
        },
        orderBy: [{ timestamp: 'desc' }, { createdAt: 'desc' }],
      }),
      this.tenantContext.client.vitalSign.findFirst({
        where: {
          residentId,
          deletedAt: null,
          heartRate: { not: null },
        },
        select: {
          heartRate: true,
          timestamp: true,
        },
        orderBy: [{ timestamp: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    const vitalSigns =
      lastBloodPressure ||
      lastBloodGlucose ||
      lastTemperature ||
      lastOxygenSaturation ||
      lastHeartRate
        ? {
            systolicPressure: lastBloodPressure?.systolicBloodPressure || null,
            diastolicPressure: lastBloodPressure?.diastolicBloodPressure || null,
            bloodPressureRecordedAt: lastBloodPressure?.timestamp?.toISOString() || null,
            heartRate: lastHeartRate?.heartRate || null,
            heartRateRecordedAt: lastHeartRate?.timestamp?.toISOString() || null,
            temperature: lastTemperature?.temperature || null,
            temperatureRecordedAt: lastTemperature?.timestamp?.toISOString() || null,
            oxygenSaturation: lastOxygenSaturation?.oxygenSaturation || null,
            oxygenSaturationRecordedAt:
              lastOxygenSaturation?.timestamp?.toISOString() || null,
            bloodGlucose: lastBloodGlucose?.bloodGlucose || null,
            bloodGlucoseRecordedAt: lastBloodGlucose?.timestamp?.toISOString() || null,
          }
        : null;

    // Processar perfil clínico
    const clinicalProfile = resident.clinicalProfile
      ? {
          healthStatus: resident.clinicalProfile.healthStatus || null,
          specialNeeds: resident.clinicalProfile.specialNeeds || null,
          functionalAspects: resident.clinicalProfile.functionalAspects || null,
          independenceLevel: this.getIndependenceLevelFromAssessment(
            resident.dependencyAssessments[0]?.dependencyLevel,
          ),
        }
      : null;

    // Processar avaliação de dependência
    const dependencyAssessment = resident.dependencyAssessments[0]
      ? {
          level: this.formatDependencyLevel(resident.dependencyAssessments[0].dependencyLevel),
          description: this.getDependencyDescription(
            resident.dependencyAssessments[0].dependencyLevel,
          ),
          assessmentDate: formatDateOnly(resident.dependencyAssessments[0].effectiveDate),
        }
      : null;

    // Processar condições crônicas
    const chronicConditions = resident.conditions.map((c) => ({
      name: c.condition,
      details: this.decryptMaybeEncrypted(c.notes, tenantId),
      contraindications: this.decryptMaybeEncrypted(c.contraindications, tenantId),
    }));

    // Processar alergias
    const allergies = resident.allergies.map((a) => ({
      allergen: a.substance,
      severity: this.formatAllergySeverity(a.severity),
      reaction: this.decryptMaybeEncrypted(a.reaction, tenantId),
      contraindications: this.decryptMaybeEncrypted(a.contraindications, tenantId),
    }));

    // Processar restrições alimentares
    const dietaryRestrictions = resident.dietaryRestrictions.map((r) => ({
      restriction: r.description,
      type: this.formatRestrictionType(r.restrictionType),
      notes: this.decryptMaybeEncrypted(r.notes, tenantId),
      contraindications: this.decryptMaybeEncrypted(r.contraindications, tenantId),
    }));

    // Processar vacinações
    const vaccinations = resident.vaccinations.map((v) => ({
      vaccineName: v.vaccine,
      doseNumber: v.dose || null,
      applicationDate: formatDateOnly(v.date),
      manufacturer: v.manufacturer || null,
      batchNumber: v.batch || null,
      applicationLocation: v.healthUnit
        ? `${v.healthUnit}, ${v.municipality}/${v.state}`
        : null,
    }));

    // Processar medicamentos em uso
    const medications = resident.prescriptions.flatMap((p) =>
      p.medications.map((m) => ({
        name: `${m.name} ${m.concentration || ''}`.trim(),
        dosage: m.dose || null,
        route: this.formatAdministrationRoute(m.route),
        frequency: this.formatMedicationFrequency(m.frequency),
        schedules: this.parseScheduledTimes(m.scheduledTimes),
      })),
    );

    const routineSchedules = resident.scheduleConfigs.map((config) => {
      const suggestedTimes = this.parseSuggestedTimes(config.suggestedTimes);
      const metadata = this.parseJsonObject(config.metadata);
      const mealType =
        metadata && typeof metadata.mealType === 'string'
          ? metadata.mealType
          : null;

      return {
        recordType: config.recordType,
        frequency: config.frequency,
        dayOfWeek: config.dayOfWeek ?? null,
        dayOfMonth: config.dayOfMonth ?? null,
        suggestedTimes,
        mealType,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      resident: basicInfo,
      legalGuardian,
      emergencyContacts,
      healthInsurances,
      bloodType,
      anthropometry,
      vitalSigns,
      clinicalProfile,
      dependencyAssessment,
      chronicConditions,
      allergies,
      dietaryRestrictions,
      vaccinations,
      medications,
      routineSchedules,
    };
  }

  // ============================================================================
  // HELPERS PARA RESUMO ASSISTENCIAL
  // ============================================================================

  private formatGuardianType(type: string | null): string {
    if (!type) return 'Responsável';
    const types: Record<string, string> = {
      curador: 'Curador',
      'curador(a)': 'Curador(a)',
      procurador: 'Procurador',
      'procurador(a)': 'Procurador(a)',
      'responsável convencional': 'Responsável Familiar (Convencional)',
    };
    return types[type.toLowerCase()] || type;
  }

  private parseEmergencyContacts(contacts: unknown): Array<{
    name: string;
    phone: string;
    relationship: string | null;
  }> {
    if (!contacts || !Array.isArray(contacts)) return [];
    return contacts.map((c: { name?: string; phone?: string; relationship?: string }) => ({
      name: c.name || 'N/A',
      phone: c.phone || 'N/A',
      relationship: c.relationship || null,
    }));
  }

  private parseHealthPlans(plans: unknown): Array<{
    name: string;
    planNumber: string | null;
  }> {
    if (!plans || !Array.isArray(plans)) return [];
    return plans.map((p: { name?: string; cardNumber?: string }) => ({
      name: p.name || 'N/A',
      planNumber: p.cardNumber || null,
    }));
  }

  private formatBloodType(bloodType: string): {
    bloodType: string;
    rhFactor: string;
    formatted: string;
  } | null {
    const bloodTypeMap: Record<string, { type: string; rh: string; formatted: string }> = {
      A_POSITIVO: { type: 'A', rh: '+', formatted: 'A+' },
      A_NEGATIVO: { type: 'A', rh: '-', formatted: 'A-' },
      B_POSITIVO: { type: 'B', rh: '+', formatted: 'B+' },
      B_NEGATIVO: { type: 'B', rh: '-', formatted: 'B-' },
      AB_POSITIVO: { type: 'AB', rh: '+', formatted: 'AB+' },
      AB_NEGATIVO: { type: 'AB', rh: '-', formatted: 'AB-' },
      O_POSITIVO: { type: 'O', rh: '+', formatted: 'O+' },
      O_NEGATIVO: { type: 'O', rh: '-', formatted: 'O-' },
      NAO_INFORMADO: { type: 'Não informado', rh: '', formatted: 'Não informado' },
    };
    const bt = bloodTypeMap[bloodType];
    if (!bt || bloodType === 'NAO_INFORMADO') return null;
    return { bloodType: bt.type, rhFactor: bt.rh, formatted: bt.formatted };
  }

  private formatDependencyLevel(level: string): string {
    const levels: Record<string, string> = {
      GRAU_I: 'Grau I – Independente',
      GRAU_II: 'Grau II – Parcialmente Dependente',
      GRAU_III: 'Grau III – Totalmente Dependente',
    };
    return levels[level] || level;
  }

  private getDependencyDescription(level: string): string {
    const descriptions: Record<string, string> = {
      GRAU_I: 'Idoso independente, mesmo que requeira uso de equipamentos de autoajuda',
      GRAU_II: 'Idoso com dependência em até três atividades de autocuidado',
      GRAU_III: 'Idoso com dependência que requer assistência em todas as atividades',
    };
    return descriptions[level] || '';
  }

  private getIndependenceLevelFromAssessment(level: string | undefined): string | null {
    if (!level) return null;
    const map: Record<string, string> = {
      GRAU_I: 'Independente',
      GRAU_II: 'Parcialmente Dependente',
      GRAU_III: 'Totalmente Dependente',
    };
    return map[level] || null;
  }

  private formatAllergySeverity(severity: string | null): string {
    if (!severity) return 'Não informada';
    const severities: Record<string, string> = {
      LEVE: 'Leve',
      MODERADA: 'Moderada',
      GRAVE: 'Grave',
      ANAFILAXIA: 'Anafilaxia',
    };
    return severities[severity] || severity;
  }

  private formatRestrictionType(type: string): string {
    const types: Record<string, string> = {
      ALERGIA_ALIMENTAR: 'Alergia Alimentar',
      INTOLERANCIA: 'Intolerância',
      RESTRICAO_MEDICA: 'Restrição Médica',
      RESTRICAO_RELIGIOSA: 'Restrição Religiosa',
      DISFAGIA: 'Disfagia',
      DIABETES: 'Diabetes',
      HIPERTENSAO: 'Hipertensão',
      OUTRA: 'Outra',
    };
    return types[type] || type;
  }

  private formatAdministrationRoute(route: string): string | null {
    if (!route) return null;
    const routes: Record<string, string> = {
      ORAL: 'Via Oral',
      SUBLINGUAL: 'Sublingual',
      TOPICA: 'Tópica',
      TRANSDERMICA: 'Transdérmica',
      INALATORIA: 'Inalatória',
      NASAL: 'Nasal',
      OCULAR: 'Ocular',
      OTOLOGICA: 'Otológica',
      RETAL: 'Retal',
      VAGINAL: 'Vaginal',
      INTRAVENOSA: 'Intravenosa',
      INTRAMUSCULAR: 'Intramuscular',
      SUBCUTANEA: 'Subcutânea',
      INTRADERMICA: 'Intradérmica',
    };
    return routes[route] || route;
  }

  private formatMedicationFrequency(frequency: string): string | null {
    if (!frequency) return null;
    const frequencies: Record<string, string> = {
      DOSE_UNICA: 'Dose única',
      HORARIO_FIXO: 'Horários fixos',
      INTERVALO_6H: 'A cada 6 horas',
      INTERVALO_8H: 'A cada 8 horas',
      INTERVALO_12H: 'A cada 12 horas',
      INTERVALO_24H: 'A cada 24 horas',
      UMA_VEZ_DIA: '1x ao dia',
      DUAS_VEZES_DIA: '2x ao dia',
      TRES_VEZES_DIA: '3x ao dia',
      QUATRO_VEZES_DIA: '4x ao dia',
      SE_NECESSARIO: 'Se necessário',
      CONTINUO: 'Uso contínuo',
    };
    return frequencies[frequency] || frequency;
  }

  private parseSuggestedTimes(value: Prisma.JsonValue): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string');
  }

  private parseJsonObject(value: Prisma.JsonValue | null): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  }

  private parseScheduledTimes(times: unknown): string[] {
    if (!times || !Array.isArray(times)) return [];
    return times.filter((t): t is string => typeof t === 'string');
  }
}
