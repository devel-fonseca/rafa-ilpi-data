/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import { AlertStatus } from '@prisma/client';
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

  private async getTenantTimezone(): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: this.tenantContext.tenantId },
      select: { timezone: true },
    });
    return tenant?.timezone || 'America/Sao_Paulo';
  }

  private async getPendingActivities(
    userId: string,
    today: Date,
    todayStr: string,
  ) {
    const [expiringPrescriptions, recordsStats, activeVitalAlerts, unreadCount] =
      await Promise.all([
        this.tenantContext.client.prescription.findMany({
          where: {
            isActive: true,
            deletedAt: null,
            validUntil: {
              gte: startOfDay(today),
              lte: endOfDay(addDays(today, 2)),
            },
          },
          orderBy: { validUntil: 'asc' },
          take: 3,
          include: {
            resident: {
              select: { id: true, fullName: true },
            },
            medications: {
              select: { name: true },
              take: 1,
            },
          },
        }),
        this.residentScheduleTasksService.getScheduledRecordsStats(todayStr),
        this.tenantContext.client.vitalSignAlert.findMany({
          where: {
            status: {
              in: [
                AlertStatus.ACTIVE,
                AlertStatus.IN_TREATMENT,
                AlertStatus.MONITORING,
              ],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: {
            resident: {
              select: { id: true, fullName: true },
            },
          },
        }),
        this.tenantContext.client.notification.count({
          where: {
            reads: {
              none: { userId },
            },
            AND: [
              {
                OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
              },
              {
                OR: [
                  { recipients: { none: {} } },
                  { recipients: { some: { userId } } },
                ],
              },
            ],
          },
        }),
      ]);

    const pendingItems: Array<{
      id: string;
      type:
        | 'PRESCRIPTION_EXPIRING'
        | 'DAILY_RECORD_MISSING'
        | 'NOTIFICATION_UNREAD'
        | 'VITAL_SIGNS_DUE';
      title: string;
      description: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      dueDate?: string;
      relatedEntity?: { id: string; name: string };
    }> = [];

    if (expiringPrescriptions.length > 0) {
      const nextPrescription = expiringPrescriptions[0];
      const medName = nextPrescription.medications[0]?.name || 'Prescrição';
      pendingItems.push({
        id: `prescription-expiring-${todayStr}`,
        type: 'PRESCRIPTION_EXPIRING',
        title:
          expiringPrescriptions.length === 1
            ? 'Prescrição expirando em breve'
            : `${expiringPrescriptions.length} prescrições expirando em breve`,
        description:
          expiringPrescriptions.length === 1
            ? `${medName} - Residente: ${nextPrescription.resident.fullName}`
            : `${expiringPrescriptions.length} prescrições vencem nos próximos 2 dias`,
        priority: 'HIGH',
        dueDate: nextPrescription.validUntil?.toISOString(),
        relatedEntity: {
          id: nextPrescription.resident.id,
          name: nextPrescription.resident.fullName,
        },
      });
    }

    if (recordsStats.pending > 0) {
      pendingItems.push({
        id: `daily-records-pending-${todayStr}`,
        type: 'DAILY_RECORD_MISSING',
        title: 'Registros diários pendentes',
        description: `${recordsStats.pending} registros pendentes de rotinas obrigatórias hoje`,
        priority: recordsStats.pending > 10 ? 'HIGH' : 'MEDIUM',
      });
    }

    if (activeVitalAlerts.length > 0) {
      const latestAlert = activeVitalAlerts[0];
      pendingItems.push({
        id: `vital-sign-alerts-${todayStr}`,
        type: 'VITAL_SIGNS_DUE',
        title:
          activeVitalAlerts.length === 1
            ? 'Sinais vitais atrasados'
            : `${activeVitalAlerts.length} alertas de sinais vitais`,
        description:
          activeVitalAlerts.length === 1
            ? `${latestAlert.title} - ${latestAlert.resident.fullName}`
            : `${activeVitalAlerts.length} alertas clínicos aguardando acompanhamento`,
        priority: 'MEDIUM',
        dueDate: latestAlert.createdAt.toISOString(),
        relatedEntity: {
          id: latestAlert.resident.id,
          name: latestAlert.resident.fullName,
        },
      });
    }

    if (unreadCount > 0) {
      pendingItems.push({
        id: `notifications-unread-${todayStr}`,
        type: 'NOTIFICATION_UNREAD',
        title: `${unreadCount} notificações não lidas`,
        description: 'Atualizações do sistema e lembretes',
        priority: 'LOW',
      });
    }

    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;

    return pendingItems
      .sort((a, b) => {
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      })
      .slice(0, 10);
  }

  private async getRecentActivities(limit = 50) {
    return this.tenantContext.client.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        tenantId: true,
        entityType: true,
        entityId: true,
        action: true,
        userId: true,
        userName: true,
        details: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    });
  }

  async getDailySummary(timezone?: string): Promise<DailyComplianceResponseDto> {
    const resolvedTimezone = timezone || await this.getTenantTimezone();

    // Obter data HOJE no timezone do tenant (timezone-safe)
    const todayStr = getCurrentDateInTz(resolvedTimezone)

    // Obter range do dia ATUAL (00:00 até 23:59:59.999) no timezone do tenant
    const { start: today, end: tomorrow } = getDayRangeInTz(todayStr, resolvedTimezone)

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
    const timezone = await this.getTenantTimezone();

    return this.getMedicationsHistoryWithTimezone(timezone);
  }

  async getMedicationsHistoryWithTimezone(
    timezone: string,
  ): Promise<MedicationsHistoryResponseDto> {

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
    const timezone = await this.getTenantTimezone();

    return this.getMandatoryRecordsHistoryWithTimezone(timezone);
  }

  async getMandatoryRecordsHistoryWithTimezone(
    timezone: string,
  ): Promise<MandatoryRecordsHistoryResponseDto> {

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

  async getOverview(userId: string) {
    const timezone = await this.getTenantTimezone();
    const todayStr = getCurrentDateInTz(timezone);
    const { start: today, end: tomorrow } = getDayRangeInTz(todayStr, timezone);

    const [
      dailySummary,
      residentsGrowth,
      medicationsHistory,
      scheduledRecordsHistory,
      occupancyRate,
      totalResidents,
      totalUsers,
      totalPrescriptions,
      totalRecordsToday,
      pendingActivities,
      recentActivities,
    ] = await Promise.all([
      this.getDailySummary(timezone),
      this.getResidentsGrowth(),
      this.getMedicationsHistoryWithTimezone(timezone),
      this.getMandatoryRecordsHistoryWithTimezone(timezone),
      this.getOccupancyRate(),
      this.tenantContext.client.resident.count({
        where: { deletedAt: null },
      }),
      this.tenantContext.client.user.count({
        where: { deletedAt: null, isActive: true },
      }),
      this.tenantContext.client.prescription.count({
        where: { deletedAt: null, isActive: true },
      }),
      this.tenantContext.client.dailyRecord.count({
        where: {
          deletedAt: null,
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      this.getPendingActivities(userId, today, todayStr),
      this.getRecentActivities(50),
    ]);

    return {
      timezone,
      generatedAt: new Date().toISOString(),
      dailySummary,
      residentsGrowth: residentsGrowth.data,
      medicationsHistory: medicationsHistory.data,
      scheduledRecordsHistory: scheduledRecordsHistory.data,
      occupancyRate,
      pendingActivities,
      recentActivities,
      footerStats: {
        totalResidents,
        totalUsers,
        totalRecordsToday,
        totalPrescriptions,
      },
    };
  }
}
