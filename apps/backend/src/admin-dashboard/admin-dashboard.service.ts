import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { getDayRangeInTz, getCurrentDateInTz } from '../utils/date.helpers';
import { DailyComplianceResponseDto } from './dto';
import { ResidentScheduleConfig } from '@prisma/client';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
  ) {}

  async getDailySummary(): Promise<DailyComplianceResponseDto> {

    // Buscar timezone do tenant (tabela SHARED)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: this.tenantContext.tenantId },
      select: { timezone: true },
    })
    const timezone = tenant?.timezone || 'America/Sao_Paulo'

    // Obter data HOJE no timezone do tenant (timezone-safe)
    const todayStr = getCurrentDateInTz(timezone)

    // Obter range do dia ATUAL (00:00 até 23:59:59.999) no timezone do tenant
    const { start: today, end: tomorrow } = getDayRangeInTz(todayStr, timezone)

    // 1. Contar residentes ativos
    const activeResidents = await this.tenantContext.client.resident.count({
      where: {
        status: 'Ativo',
      },
    })

    // 2. Calcular medicamentos programados e administrados
    const medicationsData = await this.getMedicationsCompliance(
      today,
      tomorrow,
    )

    // 3. Calcular registros obrigatórios esperados e realizados
    const recordsData = await this.getMandatoryRecordsCompliance(
      today,
      tomorrow,
    )

    return {
      activeResidents,
      medications: medicationsData,
      mandatoryRecords: recordsData,
    }
  }

  private async getMedicationsCompliance(
    today: Date,
    tomorrow: Date,
  ) {
    // ✅ Usar mesma lógica do AgendaService.getMedicationItems()
    // Buscar prescrições ativas que tenham medicamentos ativos hoje
    const prescriptions = await this.tenantContext.client.prescription.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        medications: {
          some: {
            deletedAt: null,
            startDate: { lte: tomorrow }, // Começou antes ou durante hoje
            OR: [
              { endDate: null }, // Uso contínuo
              { endDate: { gte: today } }, // Termina depois ou durante hoje
            ],
          },
        },
      },
      include: {
        medications: {
          where: {
            deletedAt: null,
            startDate: { lte: tomorrow },
            OR: [
              { endDate: null },
              { endDate: { gte: today } },
            ],
          },
        },
      },
    })

    // Contar total de medicações programadas (medications × scheduledTimes)
    let totalScheduled = 0
    const medicationTimeKeys: string[] = []

    for (const prescription of prescriptions) {
      for (const medication of prescription.medications) {
        const scheduledTimes = medication.scheduledTimes as string[]
        if (scheduledTimes && Array.isArray(scheduledTimes)) {
          for (const time of scheduledTimes) {
            totalScheduled++
            medicationTimeKeys.push(`${medication.id}-${time}`)
          }
        }
      }
    }

    // Contar quantos foram administrados
    const administrations = await this.tenantContext.client.medicationAdministration.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
        wasAdministered: true,
      },
    })

    const administered = administrations.length

    return {
      scheduled: totalScheduled,
      administered,
      total: totalScheduled,
    }
  }

  private async getMandatoryRecordsCompliance(
    today: Date,
    tomorrow: Date,
  ) {
    // Buscar configurações de agendamento recorrente ativas
    const activeConfigs = await this.tenantContext.client.residentScheduleConfig.findMany({
      where: {
        isActive: true,
        resident: {
          status: 'Ativo',
        },
      },
      include: {
        resident: true,
      },
    })

    // Calcular quantos registros são esperados hoje
    let expectedCount = 0

    for (const config of activeConfigs) {
      // Verificar se o registro é esperado hoje baseado na frequência
      const isExpectedToday = this.isRecordExpectedToday(config, today)
      if (isExpectedToday) {
        expectedCount++
      }
    }

    // Contar registros diários realizados hoje
    const completedRecords = await this.tenantContext.client.dailyRecord.count({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    return {
      expected: expectedCount,
      completed: completedRecords,
    }
  }

  private isRecordExpectedToday(config: ResidentScheduleConfig, today: Date): boolean {
    const dayOfWeek = today.getDay() // 0 = Domingo, 1 = Segunda, etc.

    switch (config.frequency) {
      case 'DAILY':
        return true

      case 'WEEKLY':
        // Verifica se hoje é o dia da semana configurado
        if (config.dayOfWeek !== null && config.dayOfWeek !== undefined) {
          return config.dayOfWeek === dayOfWeek
        }
        return false

      case 'MONTHLY':
        // Verifica se hoje é o dia do mês configurado
        if (config.dayOfMonth) {
          return today.getDate() === config.dayOfMonth
        }
        return false

      default:
        return false
    }
  }
}
