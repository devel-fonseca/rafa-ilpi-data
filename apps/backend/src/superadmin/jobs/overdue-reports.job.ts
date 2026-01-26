import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { subDays, parseISO } from 'date-fns'
import { PrismaService } from '../../prisma/prisma.service'
import { EmailService } from '../../email/email.service'
import { InvoiceStatus } from '@prisma/client'
import { AlertsService } from '../services/alerts.service'

@Injectable()
export class OverdueReportsJob {
  private readonly logger = new Logger(OverdueReportsJob.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly alertsService: AlertsService,
  ) {}

  /**
   * Relatório diário de inadimplência
   * Executa todos os dias às 09:00
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendDailyReport() {
    this.logger.log('Iniciando geração de relatório diário de inadimplência...')

    try {
      const today = new Date()
      const yesterday = subDays(today, 1)

      const reportData = await this.getOverdueData(yesterday, today)

      const success = await this.emailService.sendOverdueReport({
        period: 'daily',
        startDate: yesterday,
        endDate: today,
        ...reportData,
      })

      if (success) {
        this.logger.log('Relatório diário enviado com sucesso')
      } else {
        this.logger.warn('Falha ao enviar relatório diário')

        // Criar alerta de falha no envio de email
        await this.alertsService.createSystemErrorAlert({
          title: 'Falha no Envio de Relatório Diário de Inadimplência',
          message: 'Erro ao enviar relatório diário de inadimplência para SuperAdmin',
          error: new Error('Email service returned false'),
          metadata: {
            job: 'overdue-reports',
            reportType: 'daily',
            timestamp: new Date().toISOString(),
          },
        })
      }
    } catch (error) {
      this.logger.error(`Erro ao gerar relatório diário: ${error.message}`, error.stack)

      // Criar alerta de erro crítico
      await this.alertsService.createSystemErrorAlert({
        title: 'Erro Crítico no Job de Relatório Diário',
        message: 'Falha ao gerar relatório diário de inadimplência',
        error,
        metadata: {
          job: 'overdue-reports',
          reportType: 'daily',
          timestamp: new Date().toISOString(),
        },
      })
    }
  }

  /**
   * Relatório semanal de inadimplência
   * Executa todas as segundas-feiras às 10:00
   */
  @Cron(CronExpression.MONDAY_TO_FRIDAY_AT_10AM)
  async sendWeeklyReport() {
    const today = new Date()
    
    // Só executar às segundas-feiras
    if (today.getDay() !== 1) {
      return
    }

    this.logger.log('Iniciando geração de relatório semanal de inadimplência...')

    try {
      const endDate = new Date()
      const startDate = subDays(endDate, 7)

      const reportData = await this.getOverdueData(startDate, endDate)

      const success = await this.emailService.sendOverdueReport({
        period: 'weekly',
        startDate,
        endDate,
        ...reportData,
      })

      if (success) {
        this.logger.log('Relatório semanal enviado com sucesso')
      } else {
        this.logger.warn('Falha ao enviar relatório semanal')

        // Criar alerta de falha no envio de email
        await this.alertsService.createSystemErrorAlert({
          title: 'Falha no Envio de Relatório Semanal de Inadimplência',
          message: 'Erro ao enviar relatório semanal de inadimplência para SuperAdmin',
          error: new Error('Email service returned false'),
          metadata: {
            job: 'overdue-reports',
            reportType: 'weekly',
            timestamp: new Date().toISOString(),
          },
        })
      }
    } catch (error) {
      this.logger.error(`Erro ao gerar relatório semanal: ${error.message}`, error.stack)

      // Criar alerta de erro crítico
      await this.alertsService.createSystemErrorAlert({
        title: 'Erro Crítico no Job de Relatório Semanal',
        message: 'Falha ao gerar relatório semanal de inadimplência',
        error,
        metadata: {
          job: 'overdue-reports',
          reportType: 'weekly',
          timestamp: new Date().toISOString(),
        },
      })
    }
  }

  /**
   * Buscar dados de inadimplência para o período
   */
  private async getOverdueData(_startDate: Date, _endDate: Date) {
    const now = new Date()

    // Buscar faturas vencidas (OPEN com dueDate passado)
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.OPEN,
        dueDate: {
          lt: now,
        },
      },
      include: {
        tenant: true,
      },
    })

    // Agrupar por tenant
    const tenantMap = new Map<
      string,
      {
        name: string
        email: string
        overdueInvoices: number
        totalAmount: number
        maxDaysOverdue: number
      }
    >()

    for (const invoice of overdueInvoices) {
      const dueDateObj = parseISO(`${invoice.dueDate}T12:00:00.000`)
      const daysOverdue = Math.floor(
        (now.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24),
      )

      if (!tenantMap.has(invoice.tenantId)) {
        tenantMap.set(invoice.tenantId, {
          name: invoice.tenant.name,
          email: invoice.tenant.email,
          overdueInvoices: 0,
          totalAmount: 0,
          maxDaysOverdue: 0,
        })
      }

      const tenantData = tenantMap.get(invoice.tenantId)!
      tenantData.overdueInvoices += 1
      tenantData.totalAmount += Number(invoice.amount)
      tenantData.maxDaysOverdue = Math.max(tenantData.maxDaysOverdue, daysOverdue)
    }

    const tenants = Array.from(tenantMap.values())

    return {
      totalOverdue: overdueInvoices.length,
      totalOverdueAmount: overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0),
      tenants,
    }
  }
}
