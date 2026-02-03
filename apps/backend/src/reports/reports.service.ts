import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import type {
  DailyReportDto,
  DailyRecordReportDto,
  MedicationAdministrationReportDto,
  VitalSignsReportDto,
  DailyReportSummaryDto,
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
  ): Promise<DailyReportDto> {
    // Buscar dados em paralelo usando tenantContext.client
    const [dailyRecords, medicationAdministrations, activeResidents] =
      await Promise.all([
        this.getDailyRecords(date),
        this.getMedicationAdministrations(date),
        this.getActiveResidents(),
      ]);

    // Extrair sinais vitais dos daily records (tipo MONITORAMENTO)
    const vitalSigns = this.extractVitalSigns(dailyRecords);

    // Calcular resumo
    const summary = this.calculateSummary(
      date,
      dailyRecords,
      medicationAdministrations,
      activeResidents.length,
    );

    return {
      summary,
      dailyRecords,
      medicationAdministrations,
      vitalSigns,
    };
  }

  private async getDailyRecords(
    date: string,
  ): Promise<DailyRecordReportDto[]> {
    const records = await this.tenantContext.client.dailyRecord.findMany({
      where: {
        date: new Date(date),
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
      residentName: record.resident.fullName,
      residentCpf: record.resident.cpf || '',
      residentCns: record.resident.cns || undefined,
      bedCode: record.resident.bed?.code || 'N/A',
      date: record.date instanceof Date ? record.date.toISOString().split('T')[0] : record.date,
      time: record.time,
      type: record.type,
      recordedBy: record.recordedBy || 'N/A',
      details: (record.data as any) || {},
      notes: record.notes || undefined,
      createdAt: record.createdAt.toISOString(),
    }));
  }

  private async getMedicationAdministrations(
    date: string,
  ): Promise<MedicationAdministrationReportDto[]> {
    const administrations = await this.tenantContext.client.medicationAdministration.findMany(
      {
        where: {
          date: new Date(date),
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

  private async getActiveResidents(): Promise<any[]> {
    return this.tenantContext.client.resident.findMany({
      where: {
        status: 'Ativo',
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
      totalMedicationsScheduled: medicationAdministrations.length,
      hygieneCoverage,
      feedingCoverage,
      vitalSignsCoverage,
    };
  }
}
