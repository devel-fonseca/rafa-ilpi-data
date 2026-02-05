import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { parseDateOnly, formatDateOnly, getDayRangeInTz } from '../utils/date.helpers';
import type {
  DailyReportDto,
  DailyRecordReportDto,
  MedicationAdministrationReportDto,
  VitalSignsReportDto,
  DailyReportSummaryDto,
  ShiftReportDto,
  DailyComplianceMetricDto,
  MultiDayReportDto,
} from './dto/daily-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async generateDailyReport(
    tenantId: string,
    date: string,
    shiftTemplateId?: string,
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

    const [dailyRecords, medicationAdministrations, activeResidents, shifts, medicationScheduled] =
      await Promise.all([
        this.getDailyRecords(dateOnly, dateUtc),
        this.getMedicationAdministrations(dateOnly, dateUtc),
        this.getActiveResidentsOnDate(dateUtc),
        this.getShiftsOnDate(dateUtc, shiftTemplateId),
        this.getMedicationScheduleCount(dayStart, dayEnd),
      ]);

    const compliance = await this.calculateScheduleCompliance(
      dateUtc,
      dailyRecords,
      activeResidents,
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
    };
  }

  async generateMultiDayReport(
    tenantId: string,
    startDate: string,
    endDate?: string,
    shiftTemplateId?: string,
  ): Promise<MultiDayReportDto> {
    const start = parseDateOnly(startDate);
    const end = endDate ? parseDateOnly(endDate) : start;

    // Validar intervalo máximo de 7 dias
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    const daysDiff = Math.ceil(
      (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDiff > 7) {
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

    // Gerar relatório para cada dia
    const reports = await Promise.all(
      dates.map((date) => this.generateDailyReport(tenantId, date, shiftTemplateId)),
    );

    return {
      startDate: start,
      endDate: end,
      reports,
    };
  }

  private async getDailyRecords(
    date: string,
    dateUtc: Date,
  ): Promise<DailyRecordReportDto[]> {
    const records = await this.tenantContext.client.dailyRecord.findMany({
      where: {
        date: dateUtc,
        deletedAt: null,
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

    return records.map((record) => ({
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
  ): Promise<MedicationAdministrationReportDto[]> {
    const administrations = await this.tenantContext.client.medicationAdministration.findMany(
      {
        where: {
          date: dateUtc,
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
              dose: true,
              route: true,
            },
          },
        },
        orderBy: [{ scheduledTime: 'asc' }],
      },
    );

    return administrations.map((admin) => ({
      residentName: admin.resident.fullName,
      residentCpf: admin.resident.cpf || '',
      residentCns: admin.resident.cns || undefined,
      bedCode: admin.resident.bed?.code || 'N/A',
      medicationName: admin.medication.name,
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

  private async getMedicationScheduleCount(dayStart: Date, dayEnd: Date): Promise<number> {
    const prescriptions = await this.tenantContext.client.prescription.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        medications: {
          some: {
            deletedAt: null,
            startDate: { lte: dayEnd },
            OR: [{ endDate: null }, { endDate: { gte: dayStart } }],
          },
        },
      },
      include: {
        medications: {
          where: {
            deletedAt: null,
            startDate: { lte: dayEnd },
            OR: [{ endDate: null }, { endDate: { gte: dayStart } }],
          },
        },
      },
    });

    let scheduled = 0;
    for (const prescription of prescriptions) {
      for (const medication of prescription.medications) {
        const scheduledTimes = medication.scheduledTimes as string[];
        if (scheduledTimes && Array.isArray(scheduledTimes)) {
          scheduled += scheduledTimes.length;
        }
      }
    }

    return scheduled;
  }

  private async calculateScheduleCompliance(
    dateUtc: Date,
    dailyRecords: DailyRecordReportDto[],
    activeResidents: Array<{ id: string }>,
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

  private async getShiftsOnDate(dateUtc: Date, shiftTemplateId?: string): Promise<ShiftReportDto[]> {
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

    const templateMap = new Map(shiftTemplates.map((t) => [t.id, t]));
    const configMap = new Map(tenantConfigs.map((c) => [c.shiftTemplateId, c]));

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
}
