import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { getDayRangeInTz, getCurrentDateInTz } from '../utils/date.helpers';
import { ResidentScheduleTasksService } from '../resident-schedule/resident-schedule-tasks.service';
import {
  DailyComplianceResponseDto,
  ResidentsGrowthResponseDto,
  MedicationsHistoryResponseDto,
  MandatoryRecordsHistoryResponseDto,
  OccupancyRateResponseDto,
  MonthlyResidentCountDto,
  DailyMedicationStatsDto,
  DailyRecordStatsDto,
  MonthlyOccupancyDto,
} from './dto';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    private readonly residentScheduleTasksService: ResidentScheduleTasksService,
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

    // 1. Contar residentes ativos (total)
    const activeResidents = await this.tenantContext.client.resident.count({
      where: {
        status: 'Ativo',
      },
    })

    // 2. Contar residentes ativos COM rotinas programadas
    // (residentes que possuem pelo menos 1 configuração de agendamento recorrente ativa)
    const residentsWithSchedules = await this.tenantContext.client.resident.count({
      where: {
        status: 'Ativo',
        scheduleConfigs: {
          some: {
            isActive: true,
          },
        },
      },
    })

    // 3. Calcular medicamentos programados e administrados
    const medicationsData = await this.getMedicationsCompliance(
      today,
      tomorrow,
    )

    // 4. Calcular registros obrigatórios esperados e realizados
    const recordsData = await this.getMandatoryRecordsCompliance(
      today,
      tomorrow,
      todayStr,
    )

    return {
      activeResidents,
      residentsWithSchedules,
      medications: medicationsData,
      scheduledRecords: recordsData,
      // Backward compatibility (deprecated)
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
    _today: Date,
    _tomorrow: Date,
    dateStr: string,
  ) {
    const stats = await this.residentScheduleTasksService.getScheduledRecordsStats(
      dateStr,
    );

    return {
      expected: stats.expected,
      completed: stats.completed,
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

      // Mesmo cálculo canônico usado no resumo diário.
      const stats = await this.residentScheduleTasksService.getScheduledRecordsStats(
        dayStr,
      );
      const expected = stats.expected
      const completed = stats.completed

      daysData.push({
        day: dayStr,
        expected,
        completed,
      })
    }

    return { data: daysData }
  }

  /**
   * Retorna taxa de ocupação (residentes/leitos) nos últimos 6 meses
   * Formato: [{ month: '2025-08', residents: 12, capacity: 20, occupancyRate: 60.0 }, ...]
   */
  async getOccupancyRate(): Promise<OccupancyRateResponseDto> {
    // Buscar dados do tenant (capacidades declarada e licenciada que já existem no schema)
    const tenantData = await this.prisma.tenant.findUnique({
      where: { id: this.tenantContext.tenantId },
    })

    // Verificar se tenant tem leitos configurados
    const totalBeds = await this.tenantContext.client.bed.count({
      where: { deletedAt: null },
    })

    const hasBedsConfigured = totalBeds > 0

    // Gerar últimos 6 meses (incluindo o mês atual)
    const monthsData: MonthlyOccupancyDto[] = []
    const today = new Date()

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const year = targetDate.getFullYear()
      const month = String(targetDate.getMonth() + 1).padStart(2, '0')
      const monthStr = `${year}-${month}`

      // Determinar data de contagem (último dia do mês ou hoje se for mês atual)
      const isCurrentMonth = i === 0
      let countDate: Date

      if (isCurrentMonth) {
        countDate = new Date()
      } else {
        // Último dia do mês
        countDate = new Date(year, targetDate.getMonth() + 1, 0)
      }

      // Contar residentes ativos naquela data
      const residents = await this.tenantContext.client.resident.count({
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

      // Contar leitos disponíveis naquela data
      // Para simplificar, usamos contagem atual de leitos (assumindo estrutura não muda muito)
      // Se precisar histórico preciso de leitos, considerar adicionar snapshot mensal
      const capacity = await this.tenantContext.client.bed.count({
        where: {
          deletedAt: null,
          createdAt: { lte: countDate }, // Leitos que existiam naquela data
        },
      })

      // Calcular taxa de ocupação
      const occupancyRate = capacity > 0 ? (residents / capacity) * 100 : null

      monthsData.push({
        month: monthStr,
        residents,
        capacity,
        occupancyRate: occupancyRate !== null ? parseFloat(occupancyRate.toFixed(1)) : null,
      })
    }

    return {
      data: monthsData,
      hasBedsConfigured,
      capacityDeclared: (tenantData as any)?.capacityDeclared ?? null,
      capacityLicensed: (tenantData as any)?.capacityLicensed ?? null,
    }
  }
}
