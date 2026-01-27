import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { getDayRangeInTz, getCurrentDateInTz } from '../utils/date.helpers';
import {
  DailyComplianceResponseDto,
  ResidentsGrowthResponseDto,
  MedicationsHistoryResponseDto,
  MandatoryRecordsHistoryResponseDto,
  MonthlyResidentCountDto,
  DailyMedicationStatsDto,
  DailyRecordStatsDto,
} from './dto';
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

  /**
   * Retorna contagem de residentes ativos nos últimos 6 meses (mensal)
   * Formato: [{ month: '2025-08', count: 12 }, ...]
   */
  async getResidentsGrowth(): Promise<ResidentsGrowthResponseDto> {
    // Gerar últimos 6 meses (incluindo o mês atual)
    const monthsData: MonthlyResidentCountDto[] = []
    const today = new Date()

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const year = targetDate.getFullYear()
      const month = String(targetDate.getMonth() + 1).padStart(2, '0')
      const monthStr = `${year}-${month}`

      // Contar residentes ativos no último dia do mês
      // (ou hoje, se for o mês atual)
      const isCurrentMonth = i === 0
      let countDate: Date

      if (isCurrentMonth) {
        countDate = new Date()
      } else {
        // Último dia do mês
        countDate = new Date(year, targetDate.getMonth() + 1, 0)
      }

      // Contar residentes que estavam ativos naquela data
      // (createdAt <= countDate AND (status = 'Ativo' OR updatedAt >= countDate))
      const count = await this.tenantContext.client.resident.count({
        where: {
          createdAt: { lte: countDate },
          OR: [
            { status: 'Ativo' },
            {
              AND: [
                { status: { not: 'Ativo' } },
                { updatedAt: { gte: countDate } }
              ]
            }
          ]
        },
      })

      monthsData.push({
        month: monthStr,
        count,
      })
    }

    return { data: monthsData }
  }

  /**
   * Retorna dados de medicações agendadas vs administradas nos últimos 7 dias
   * Formato: [{ day: '2026-01-21', scheduled: 45, administered: 48 }, ...]
   */
  async getMedicationsHistory(): Promise<MedicationsHistoryResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: this.tenantContext.tenantId },
      select: { timezone: true },
    })
    const timezone = tenant?.timezone || 'America/Sao_Paulo'

    const daysData: DailyMedicationStatsDto[] = []
    const todayStr = getCurrentDateInTz(timezone) // Retorna string 'YYYY-MM-DD'

    for (let i = 6; i >= 0; i--) {
      // Calcular data alvo (i dias atrás)
      // Converter string para Date, subtrair dias, converter de volta para string
      const todayDate = new Date(todayStr + 'T12:00:00.000') // Meio-dia para evitar problemas de timezone
      todayDate.setDate(todayDate.getDate() - i)
      const dayStr = todayDate.toISOString().split('T')[0]

      // Obter range do dia
      const { start: dayStart, end: dayEnd } = getDayRangeInTz(dayStr, timezone)

      // Calcular medicações programadas neste dia
      const prescriptions = await this.tenantContext.client.prescription.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          medications: {
            some: {
              deletedAt: null,
              startDate: { lte: dayEnd },
              OR: [
                { endDate: null },
                { endDate: { gte: dayStart } },
              ],
            },
          },
        },
        include: {
          medications: {
            where: {
              deletedAt: null,
              startDate: { lte: dayEnd },
              OR: [
                { endDate: null },
                { endDate: { gte: dayStart } },
              ],
            },
          },
        },
      })

      let scheduled = 0
      for (const prescription of prescriptions) {
        for (const medication of prescription.medications) {
          const scheduledTimes = medication.scheduledTimes as string[]
          if (scheduledTimes && Array.isArray(scheduledTimes)) {
            scheduled += scheduledTimes.length
          }
        }
      }

      // Contar medicações administradas neste dia
      const administered = await this.tenantContext.client.medicationAdministration.count({
        where: {
          date: {
            gte: dayStart,
            lt: dayEnd,
          },
          wasAdministered: true,
        },
      })

      daysData.push({
        day: dayStr,
        scheduled,
        administered,
      })
    }

    return { data: daysData }
  }

  /**
   * Retorna dados de registros obrigatórios esperados vs completados nos últimos 7 dias
   * Formato: [{ day: '2026-01-21', expected: 35, completed: 32 }, ...]
   */
  async getMandatoryRecordsHistory(): Promise<MandatoryRecordsHistoryResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: this.tenantContext.tenantId },
      select: { timezone: true },
    })
    const timezone = tenant?.timezone || 'America/Sao_Paulo'

    const daysData: DailyRecordStatsDto[] = []
    const todayStr = getCurrentDateInTz(timezone)

    for (let i = 6; i >= 0; i--) {
      // Calcular data alvo (i dias atrás)
      const todayDate = new Date(todayStr + 'T12:00:00.000')
      todayDate.setDate(todayDate.getDate() - i)
      const dayStr = todayDate.toISOString().split('T')[0]

      // Obter range do dia
      const { start: dayStart, end: dayEnd } = getDayRangeInTz(dayStr, timezone)

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

      // Calcular quantos registros são esperados neste dia
      let expected = 0
      const targetDate = new Date(dayStr + 'T12:00:00.000')

      for (const config of activeConfigs) {
        const isExpectedThisDay = this.isRecordExpectedToday(config, targetDate)
        if (isExpectedThisDay) {
          expected++
        }
      }

      // Contar registros diários completados neste dia
      const completed = await this.tenantContext.client.dailyRecord.count({
        where: {
          date: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      })

      daysData.push({
        day: dayStr,
        expected,
        completed,
      })
    }

    return { data: daysData }
  }
}
