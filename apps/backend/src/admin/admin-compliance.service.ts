import { Injectable, Inject, Scope } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import { PrismaService } from '../prisma/prisma.service'

interface ComplianceStats {
  activeResidents: number
  medications: {
    scheduled: number
    administered: number
    total: number
  }
  mandatoryRecords: {
    expected: number
    completed: number
  }
}

@Injectable({ scope: Scope.REQUEST })
export class AdminComplianceService {
  constructor(
    private prisma: PrismaService,
    @Inject(REQUEST) private request: any,
  ) {}

  async getTodayCompliance(): Promise<ComplianceStats> {
    const tenantId = this.request.user?.tenantId
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // 1. Contar residentes ativos
    const activeResidents = await this.prisma.resident.count({
      where: {
        tenantId,
        status: 'Ativo',
      },
    })

    // 2. Calcular medicamentos programados e administrados
    const medicationsData = await this.getMedicationsCompliance(
      tenantId,
      today,
      tomorrow,
    )

    // 3. Calcular registros obrigatórios esperados e realizados
    const recordsData = await this.getMandatoryRecordsCompliance(
      tenantId,
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
    tenantId: string,
    today: Date,
    tomorrow: Date,
  ) {
    // Buscar todas as administrações programadas para hoje
    const scheduledMedications =
      await this.prisma.medicationAdministration.findMany({
        where: {
          tenantId,
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
      })

    const total = scheduledMedications.length
    const administered = scheduledMedications.filter(
      (med) => med.wasAdministered === true,
    ).length

    return {
      scheduled: total,
      administered,
      total,
    }
  }

  private async getMandatoryRecordsCompliance(
    tenantId: string,
    today: Date,
    tomorrow: Date,
  ) {
    // Buscar configurações de agendamento recorrente ativas
    const activeConfigs = await this.prisma.residentScheduleConfig.findMany({
      where: {
        tenantId,
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
    const completedRecords = await this.prisma.dailyRecord.count({
      where: {
        tenantId,
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

  private isRecordExpectedToday(config: any, today: Date): boolean {
    const dayOfWeek = today.getDay() // 0 = Domingo, 1 = Segunda, etc.

    switch (config.frequency) {
      case 'DAILY':
        return true

      case 'WEEKLY':
        // Verifica se hoje é o dia da semana configurado
        if (config.daysOfWeek && Array.isArray(config.daysOfWeek)) {
          return config.daysOfWeek.includes(dayOfWeek)
        }
        return false

      case 'MONTHLY':
        // Verifica se hoje é o dia do mês configurado
        if (config.dayOfMonth) {
          return today.getDate() === config.dayOfMonth
        }
        return false

      case 'CUSTOM':
        // Para frequência customizada, retorna true (pode ser refinado depois)
        return true

      default:
        return false
    }
  }
}
