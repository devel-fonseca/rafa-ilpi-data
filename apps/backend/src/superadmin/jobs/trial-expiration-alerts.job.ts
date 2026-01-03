import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'
import { EmailService } from '../../email/email.service'
import { addDays } from 'date-fns'

/**
 * TrialExpirationAlertsJob
 *
 * Job responsável por enviar avisos progressivos de expiração de trial:
 * - D-7: Aviso informativo (alertLevel: 'info')
 * - D-3: Aviso de atenção (alertLevel: 'warning')
 * - D-1: Aviso crítico com CTA de cancelamento (alertLevel: 'critical')
 *
 * IDEMPOTÊNCIA: Usa flags de controle (trialAlert7Sent, trialAlert3Sent, trialAlert1Sent)
 * para garantir que cada alerta seja enviado exatamente 1 vez, sem duplicação.
 *
 * TIME WINDOWS: Usa janelas de tempo (±0.5 dias) em vez de data exata para capturar
 * trials mesmo com pequenas variações de horário ou timezone.
 *
 * Execução: Diariamente às 08:00 (horário comercial para máxima taxa de abertura)
 */
@Injectable()
export class TrialExpirationAlertsJob {
  private readonly logger = new Logger(TrialExpirationAlertsJob.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @Cron('0 8 * * *') // Todos os dias às 08:00
  async handleTrialExpirationAlerts() {
    this.logger.log('🔔 Iniciando verificação de trials expirando...')

    const now = new Date()

    try {
      // ===== D-7: Aviso Informativo =====
      await this.sendSevenDaysAlert(now)

      // ===== D-3: Aviso de Atenção =====
      await this.sendThreeDaysAlert(now)

      // ===== D-1: Aviso Crítico (com CTA de cancelamento) =====
      await this.sendOneDayAlert(now)

      this.logger.log('✅ Verificação de trials concluída')
    } catch (error) {
      this.logger.error('❌ Erro ao processar alertas de trial:', error)
    }
  }

  /**
   * D-7: Enviar aviso informativo 7 dias antes da expiração
   */
  private async sendSevenDaysAlert(now: Date) {
    // Janela: entre 6.5 e 7.5 dias a partir de agora
    const sevenDaysWindow = {
      start: addDays(now, 6.5),
      end: addDays(now, 7.5),
    }

    const trials7Days = await this.prisma.subscription.findMany({
      where: {
        status: 'trialing',
        trialEndDate: {
          gte: sevenDaysWindow.start,
          lte: sevenDaysWindow.end,
        },
        trialAlert7Sent: false, // ✅ FLAG: Garantir envio único
      },
      include: {
        tenant: true,
        plan: true,
      },
    })

    this.logger.log(`📧 D-7: ${trials7Days.length} trials encontrados`)

    for (const subscription of trials7Days) {
      try {
        await this.emailService.sendTrialExpiringAlert(
          subscription.tenant.email,
          {
            tenantName: subscription.tenant.name,
            planName: subscription.plan.displayName,
            expiresAt: subscription.trialEndDate!,
            daysRemaining: 7,
            alertLevel: 'info',
          },
        )

        // ✅ Marcar flag após envio bem-sucedido
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { trialAlert7Sent: true },
        })

        this.logger.log(
          `📧 D-7 enviado: ${subscription.tenant.name} (${subscription.tenant.email})`,
        )
      } catch (error) {
        this.logger.error(
          `❌ Erro ao enviar D-7 para ${subscription.tenant.email}:`,
          error,
        )
      }
    }
  }

  /**
   * D-3: Enviar aviso de atenção 3 dias antes da expiração
   */
  private async sendThreeDaysAlert(now: Date) {
    // Janela: entre 2.5 e 3.5 dias a partir de agora
    const threeDaysWindow = {
      start: addDays(now, 2.5),
      end: addDays(now, 3.5),
    }

    const trials3Days = await this.prisma.subscription.findMany({
      where: {
        status: 'trialing',
        trialEndDate: {
          gte: threeDaysWindow.start,
          lte: threeDaysWindow.end,
        },
        trialAlert3Sent: false, // ✅ FLAG: Garantir envio único
      },
      include: {
        tenant: true,
        plan: true,
      },
    })

    this.logger.log(`⚠️ D-3: ${trials3Days.length} trials encontrados`)

    for (const subscription of trials3Days) {
      try {
        await this.emailService.sendTrialExpiringAlert(
          subscription.tenant.email,
          {
            tenantName: subscription.tenant.name,
            planName: subscription.plan.displayName,
            expiresAt: subscription.trialEndDate!,
            daysRemaining: 3,
            alertLevel: 'warning',
          },
        )

        // ✅ Marcar flag após envio bem-sucedido
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { trialAlert3Sent: true },
        })

        this.logger.log(
          `⚠️ D-3 enviado: ${subscription.tenant.name} (${subscription.tenant.email})`,
        )
      } catch (error) {
        this.logger.error(
          `❌ Erro ao enviar D-3 para ${subscription.tenant.email}:`,
          error,
        )
      }
    }
  }

  /**
   * D-1: Enviar aviso crítico 1 dia antes da expiração
   * INCLUI: CTA explícito de cancelamento (blindagem jurídica LGPD)
   */
  private async sendOneDayAlert(now: Date) {
    // Janela: entre 0.5 e 1.5 dias a partir de agora
    const oneDayWindow = {
      start: addDays(now, 0.5),
      end: addDays(now, 1.5),
    }

    const trials1Day = await this.prisma.subscription.findMany({
      where: {
        status: 'trialing',
        trialEndDate: {
          gte: oneDayWindow.start,
          lte: oneDayWindow.end,
        },
        trialAlert1Sent: false, // ✅ FLAG: Garantir envio único
      },
      include: {
        tenant: true,
        plan: true,
      },
    })

    this.logger.log(`🚨 D-1: ${trials1Day.length} trials encontrados`)

    for (const subscription of trials1Day) {
      try {
        // ✅ AJUSTE 5: Email D-1 inclui CTA de cancelamento (defesa jurídica)
        await this.emailService.sendTrialExpiringAlert(
          subscription.tenant.email,
          {
            tenantName: subscription.tenant.name,
            planName: subscription.plan.displayName,
            expiresAt: subscription.trialEndDate!,
            daysRemaining: 1,
            alertLevel: 'critical',
            billingType: subscription.preferredPaymentMethod || undefined, // ✅ Informar método escolhido
            cancelUrl: `${process.env.APP_URL}/settings/subscription`, // ✅ Link para cancelar
          },
        )

        // ✅ Marcar flag após envio bem-sucedido
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { trialAlert1Sent: true },
        })

        this.logger.log(
          `🚨 D-1 enviado: ${subscription.tenant.name} (${subscription.tenant.email})`,
        )
      } catch (error) {
        this.logger.error(
          `❌ Erro ao enviar D-1 para ${subscription.tenant.email}:`,
          error,
        )
      }
    }
  }
}
