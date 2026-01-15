import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'
import { EmailService } from '../../email/email.service'
import { InvoiceStatus } from '@prisma/client'

@Injectable()
export class OverdueReportsJob {
  private readonly logger = new Logger(OverdueReportsJob.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
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
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

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
      }
    } catch (error) {
      this.logger.error(`Erro ao gerar relatório diário: ${error.message}`, error.stack)
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
      const startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - 7)

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
      }
    } catch (error) {
      this.logger.error(`Erro ao gerar relatório semanal: ${error.message}`, error.stack)
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
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24),
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
