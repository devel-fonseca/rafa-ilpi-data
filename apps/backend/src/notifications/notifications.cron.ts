import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from './notifications.service'
import {
  getDocumentLabel,
  shouldTriggerAlert,
} from '../institutional-profile/config/document-requirements.config'
import {
  getCurrentDateInTz,
  parseDateOnly,
  DEFAULT_TIMEZONE,
} from '../utils/date.helpers'

@Injectable()
export class NotificationsCronService {
  private readonly logger = new Logger(NotificationsCronService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Cron Job - Verificar eventos agendados
   * Executa todos os dias às 06:00
   */
  @Cron('0 6 * * *', {
    name: 'checkScheduledEvents',
    timeZone: 'America/Sao_Paulo',
  })
  async checkScheduledEvents() {
    this.logger.log('📅 Running cron: checkScheduledEvents')

    try {
      const tenants = await this.prisma.tenant.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, timezone: true },
      })

      let totalDue = 0
      let totalMissed = 0

      for (const tenant of tenants) {
        // ✅ Obter data atual no timezone do tenant (recordDate é DATE)
        const todayStr = getCurrentDateInTz(
          tenant.timezone || DEFAULT_TIMEZONE,
        )

        // Buscar eventos agendados para hoje (status SCHEDULED)
        const eventsToday = await this.prisma.residentScheduledEvent.findMany({
          where: {
            tenantId: tenant.id,
            status: 'SCHEDULED',
            scheduledDate: todayStr, // Comparação direta com DATE
            deletedAt: null,
          },
          include: {
            resident: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        })

        // Criar notificações para eventos do dia
        for (const event of eventsToday) {
          // Verificar se já existe notificação para hoje (createdAt é TIMESTAMPTZ)
          const existing = await this.prisma.notification.findFirst({
            where: {
              tenantId: tenant.id,
              entityType: 'SCHEDULED_EVENT',
              entityId: event.id,
              type: 'SCHEDULED_EVENT_DUE',
              createdAt: {
                gte: new Date(), // TIMESTAMPTZ comparado com now()
              },
            },
          })

          if (!existing) {
            await this.notificationsService.createScheduledEventDueNotification(
              event.id,
              event.resident?.id || '',
              event.resident?.fullName || 'Residente',
              event.title,
              event.scheduledTime,
            )
            totalDue++
          }
        }

        // Buscar eventos passados não concluídos (status SCHEDULED)
        const missedEvents = await this.prisma.residentScheduledEvent.findMany({
          where: {
            tenantId: tenant.id,
            status: 'SCHEDULED',
            scheduledDate: {
              lt: todayStr, // Antes de hoje (comparação de DATE strings)
            },
            deletedAt: null,
          },
          include: {
            resident: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        })

        // Criar notificações para eventos perdidos
        for (const event of missedEvents) {
          // Verificar se já existe notificação para evitar duplicatas
          const existing = await this.prisma.notification.findFirst({
            where: {
              tenantId: tenant.id,
              entityType: 'SCHEDULED_EVENT',
              entityId: event.id,
              type: 'SCHEDULED_EVENT_MISSED',
            },
          })

          if (!existing) {
            await this.notificationsService.createScheduledEventMissedNotification(
              event.id,
              event.resident?.id || '',
              event.resident?.fullName || 'Residente',
              event.title,
              event.scheduledDate,
            )
            totalMissed++
          }
        }
      }

      this.logger.log(
        `✅ Cron checkScheduledEvents completed: ${totalDue} due, ${totalMissed} missed notifications created`,
      )
    } catch (error) {
      this.logger.error('❌ Error in checkScheduledEvents cron:', error)
    }
  }

  /**
   * Cron Job - Verificar prescrições vencidas e vencendo
   * Executa todos os dias às 07:00
   */
  @Cron('0 7 * * *', {
    name: 'checkPrescriptionsExpiry',
    timeZone: 'America/Sao_Paulo',
  })
  async checkPrescriptionsExpiry() {
    this.logger.log('🔔 Running cron: checkPrescriptionsExpiry')

    try {
      const tenants = await this.prisma.tenant.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, timezone: true },
      })

      let totalExpired = 0
      let totalExpiring = 0

      for (const tenant of tenants) {
        // ✅ Obter data atual no timezone do tenant
        const todayStr = getCurrentDateInTz(
          tenant.timezone || DEFAULT_TIMEZONE,
        )

        // Buscar prescrições ativas
        const prescriptions = await this.prisma.prescription.findMany({
          where: {
            tenantId: tenant.id,
            isActive: true,
            deletedAt: null,
          },
          include: {
            resident: {
              select: {
                id: true,
                fullName: true,
              },
            },
            medications: true,
          },
        })

        for (const prescription of prescriptions) {
          if (!prescription.validUntil) continue

          // ✅ validUntil agora é DATE (string YYYY-MM-DD), comparar diretamente
          const validUntilStr = parseDateOnly(prescription.validUntil as any)

          // Calcular diferença de dias entre duas datas civil
          const todayDate = new Date(todayStr + 'T00:00:00')
          const validDate = new Date(validUntilStr + 'T00:00:00')
          const diffTime = validDate.getTime() - todayDate.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          // Prescrição vencida (< 0 dias)
          if (diffDays < 0) {
            // Verificar se já existe notificação para evitar duplicatas
            const existing = await this.prisma.notification.findFirst({
              where: {
                tenantId: tenant.id,
                entityType: 'PRESCRIPTION',
                entityId: prescription.id,
                type: 'PRESCRIPTION_EXPIRED',
                createdAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Última 24h
                },
              },
            })

            if (!existing) {
              await this.notificationsService.createPrescriptionExpiredNotification(
                prescription.id,
                prescription.resident?.fullName || 'Residente',
              )
              totalExpired++
            }
          }
          // Prescrição vencendo em 5 dias ou menos (0 a 5 dias)
          else if (diffDays >= 0 && diffDays <= 5) {
            // Verificar se já existe notificação para evitar duplicatas
            const existing = await this.prisma.notification.findFirst({
              where: {
                tenantId: tenant.id,
                entityType: 'PRESCRIPTION',
                entityId: prescription.id,
                type: 'PRESCRIPTION_EXPIRING',
                createdAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Última 24h
                },
              },
            })

            if (!existing) {
              await this.notificationsService.createPrescriptionExpiringNotification(
                prescription.id,
                prescription.resident?.fullName || 'Residente',
                diffDays,
              )
              totalExpiring++
            }
          }

          // Nota: Verificação de medicamentos controlados removida pois o modelo Medication
          // não possui campos controlledClass e receiptUrl no schema atual
        }
      }

      this.logger.log(
        `✅ Cron checkPrescriptionsExpiry completed: ${totalExpired} expired, ${totalExpiring} expiring notifications created`,
      )
    } catch (error) {
      this.logger.error('❌ Error in checkPrescriptionsExpiry cron:', error)
    }
  }

  /**
   * Cron Job - Verificar documentos vencidos e vencendo
   * Executa todos os dias às 08:00
   */
  @Cron('0 8 * * *', {
    name: 'checkDocumentsExpiry',
    timeZone: 'America/Sao_Paulo',
  })
  async checkDocumentsExpiry() {
    this.logger.log('🔔 Running cron: checkDocumentsExpiry')

    try {
      const tenants = await this.prisma.tenant.findMany({
        where: { deletedAt: null },
        select: { id: true, timezone: true },
      })

      let totalExpired = 0
      let totalExpiring = 0

      for (const tenant of tenants) {
        // ✅ Obter data atual no timezone do tenant
        const todayStr = getCurrentDateInTz(
          tenant.timezone || DEFAULT_TIMEZONE,
        )

        // Verificar documentos institucionais
        const tenantDocs = await this.prisma.tenantDocument.findMany({
          where: {
            tenantId: tenant.id,
            deletedAt: null,
            expiresAt: { not: null },
          },
        })

        for (const doc of tenantDocs) {
          if (!doc.expiresAt) continue

          // ✅ expiresAt agora é DATE (string YYYY-MM-DD), comparar diretamente
          const expiresAtStr = parseDateOnly(doc.expiresAt as any)

          // Calcular diferença de dias entre duas datas civil
          const todayDate = new Date(todayStr + 'T00:00:00')
          const expiresDate = new Date(expiresAtStr + 'T00:00:00')
          const diffTime = expiresDate.getTime() - todayDate.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          // Documento vencido
          if (diffDays < 0) {
            const existing = await this.prisma.notification.findFirst({
              where: {
                tenantId: tenant.id,
                entityType: 'TENANT_DOCUMENT',
                entityId: doc.id,
                type: 'DOCUMENT_EXPIRED',
                createdAt: {
                  gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                },
              },
            })

            if (!existing) {
              // Usar label amigável em vez do tipo técnico
              const documentLabel = getDocumentLabel(doc.type)
              await this.notificationsService.createDocumentExpiredNotification(
                doc.id,
                documentLabel,
                'TENANT_DOCUMENT',
              )
              totalExpired++
            }
          }
          // Documento vencendo - verificar se está em janela de alerta configurada
          else if (diffDays >= 0 && shouldTriggerAlert(doc.type, diffDays)) {
            // Verificar se já foi enviado alerta para esta janela específica
            const existing = await this.prisma.notification.findFirst({
              where: {
                tenantId: tenant.id,
                entityType: 'TENANT_DOCUMENT',
                entityId: doc.id,
                type: 'DOCUMENT_EXPIRING',
                metadata: {
                  path: ['daysLeft'],
                  // Procura notificação com mesmo número de dias (±2 dias de margem)
                  gte: diffDays - 2,
                  lte: diffDays + 2,
                },
                createdAt: {
                  // Evita duplicatas recentes (últimas 48h)
                  gte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                },
              },
            })

            if (!existing) {
              // Usar label amigável em vez do tipo técnico
              const documentLabel = getDocumentLabel(doc.type)
              await this.notificationsService.createDocumentExpiringNotification(
                doc.id,
                documentLabel,
                diffDays,
                'TENANT_DOCUMENT',
              )
              totalExpiring++
            }
          }
        }

        // Nota: Verificação de ResidentDocument removida pois o modelo não possui
        // campos expiresAt, name e status no schema atual
        // ResidentDocument é usado apenas para armazenar arquivos sem metadados de validade
      }

      this.logger.log(
        `✅ Cron checkDocumentsExpiry completed: ${totalExpired} expired, ${totalExpiring} expiring notifications created`,
      )
    } catch (error) {
      this.logger.error('❌ Error in checkDocumentsExpiry cron:', error)
    }
  }

  /**
   * Cron Job - Verificar POPs que precisam de revisão
   * Executa todos os dias às 09:00
   */
  @Cron('0 9 * * *', {
    name: 'checkPopsReview',
    timeZone: 'America/Sao_Paulo',
  })
  async checkPopsReview() {
    this.logger.log('📋 Running cron: checkPopsReview')

    try {
      const tenants = await this.prisma.tenant.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, timezone: true },
      })

      let totalNotifications = 0
      let totalMarkedForReview = 0

      for (const tenant of tenants) {
        // ✅ Obter data atual no timezone do tenant
        const todayStr = getCurrentDateInTz(
          tenant.timezone || DEFAULT_TIMEZONE,
        )

        // Buscar POPs PUBLISHED com nextReviewDate <= hoje + 30 dias
        const todayDate = new Date(todayStr + 'T00:00:00')
        const inThirtyDays = new Date(todayDate)
        inThirtyDays.setDate(inThirtyDays.getDate() + 30)

        const popsNeedingReview = await this.prisma.pop.findMany({
          where: {
            tenantId: tenant.id,
            status: 'PUBLISHED',
            nextReviewDate: {
              lte: inThirtyDays,
            },
            deletedAt: null,
          },
          select: {
            id: true,
            title: true,
            nextReviewDate: true,
            requiresReview: true,
          },
        })

        for (const pop of popsNeedingReview) {
          if (!pop.nextReviewDate) continue

          // ✅ nextReviewDate pode ser DATE ou TIMESTAMPTZ, normalizar
          const reviewDateStr = parseDateOnly(pop.nextReviewDate as any)
          const reviewDate = new Date(reviewDateStr + 'T00:00:00')

          const diffTime = reviewDate.getTime() - todayDate.getTime()
          const daysUntilReview = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          // Janelas de alerta: 30, 15, 7, 3, 1, 0 (vencido)
          const alertWindows = [30, 15, 7, 3, 1, 0]

          if (alertWindows.includes(daysUntilReview)) {
            // Verificar se já existe notificação para hoje
            const existingNotification =
              await this.prisma.notification.findFirst({
                where: {
                  tenantId: tenant.id,
                  type: 'POP_REVIEW_DUE',
                  entityType: 'POP',
                  entityId: pop.id,
                  createdAt: {
                    gte: todayDate, // TIMESTAMPTZ comparado com midnight local
                  },
                },
              })

            if (!existingNotification) {
              await this.notificationsService.createPopReviewNotification(
                pop.id,
                pop.title,
                daysUntilReview,
              )
              totalNotifications++
            }
          }

          // Se vencido (dias <= 0), marcar requiresReview = true
          if (daysUntilReview <= 0 && !pop.requiresReview) {
            await this.prisma.pop.update({
              where: { id: pop.id },
              data: { requiresReview: true },
            })
            totalMarkedForReview++
          }
        }
      }

      this.logger.log(
        `✅ Cron checkPopsReview completed: ${totalNotifications} notifications created, ${totalMarkedForReview} POPs marked for review`,
      )
    } catch (error) {
      this.logger.error('❌ Error in checkPopsReview cron:', error)
    }
  }

  /**
   * Cron Job - Limpar notificações expiradas
   * Executa todos os dias às 03:00
   */
  @Cron('0 3 * * *', {
    name: 'cleanupExpiredNotifications',
    timeZone: 'America/Sao_Paulo',
  })
  async cleanupExpiredNotifications() {
    this.logger.log('🔔 Running cron: cleanupExpiredNotifications')

    try {
      const result = await this.notificationsService.cleanupExpired()
      this.logger.log(
        `✅ Cron cleanupExpiredNotifications completed: ${result.count} notifications deleted`,
      )
    } catch (error) {
      this.logger.error(
        '❌ Error in cleanupExpiredNotifications cron:',
        error,
      )
    }
  }
}
