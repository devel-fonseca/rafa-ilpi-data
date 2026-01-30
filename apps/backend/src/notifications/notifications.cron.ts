import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { subDays, addDays, parseISO, format } from 'date-fns'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsHelperService } from './notifications-helper.service'
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
    private readonly notificationsHelper: NotificationsHelperService,
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
        select: { id: true, name: true, timezone: true, schemaName: true },
      })

      let totalDue = 0
      let totalMissed = 0

      for (const tenant of tenants) {
        // Obter tenant client para isolamento de schema
        const tenantClient = this.prisma.getTenantClient(tenant.schemaName)

        // ✅ Obter data atual no timezone do tenant (recordDate é DATE)
        const todayStr = getCurrentDateInTz(
          tenant.timezone || DEFAULT_TIMEZONE,
        )

        // Buscar eventos agendados para hoje (status SCHEDULED)
        const eventsToday = await tenantClient.residentScheduledEvent.findMany({
          where: {
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
          const existing = await tenantClient.notification.findFirst({
            where: {
              entityType: 'SCHEDULED_EVENT',
              entityId: event.id,
              type: 'SCHEDULED_EVENT_DUE',
              createdAt: {
                gte: new Date(), // TIMESTAMPTZ comparado com now()
              },
            },
          })

          if (!existing) {
            await this.notificationsHelper.createScheduledEventDueNotificationForTenant(
              tenant.id, // ✅ Passar tenantId explicitamente
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
        const missedEvents = await tenantClient.residentScheduledEvent.findMany({
          where: {
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
          const existing = await tenantClient.notification.findFirst({
            where: {
              entityType: 'SCHEDULED_EVENT',
              entityId: event.id,
              type: 'SCHEDULED_EVENT_MISSED',
            },
          })

          if (!existing) {
            await this.notificationsHelper.createScheduledEventMissedNotificationForTenant(
              tenant.id, // ✅ Passar tenantId explicitamente
              event.id,
              event.resident?.id || '',
              event.resident?.fullName || 'Residente',
              event.title,
              format(event.scheduledDate, 'yyyy-MM-dd'), // Converter Date para string
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
        select: { id: true, name: true, timezone: true, schemaName: true },
      })

      let totalExpired = 0
      let totalExpiring = 0

      for (const tenant of tenants) {
        // Obter tenant client para isolamento de schema
        const tenantClient = this.prisma.getTenantClient(tenant.schemaName)

        // ✅ Obter data atual no timezone do tenant
        const todayStr = getCurrentDateInTz(
          tenant.timezone || DEFAULT_TIMEZONE,
        )

        // Buscar prescrições ativas
        const prescriptions = await tenantClient.prescription.findMany({
          where: {
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
          const validUntilStr = typeof prescription.validUntil === 'string'
            ? parseDateOnly(prescription.validUntil)
            : parseDateOnly(prescription.validUntil.toISOString())

          // Calcular diferença de dias entre duas datas civil
          const todayDate = parseISO(todayStr + 'T00:00:00')
          const validDate = parseISO(validUntilStr + 'T00:00:00')
          const diffTime = validDate.getTime() - todayDate.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          // Prescrição vencida (< 0 dias)
          if (diffDays < 0) {
            // Verificar se já existe notificação para evitar duplicatas
            const existing = await tenantClient.notification.findFirst({
              where: {
                entityType: 'PRESCRIPTION',
                entityId: prescription.id,
                type: 'PRESCRIPTION_EXPIRED',
                createdAt: {
                  gte: subDays(new Date(), 1), // Última 24h
                },
              },
            })

            if (!existing) {
              await this.notificationsHelper.createPrescriptionExpiredNotificationForTenant(
                tenant.id, // ✅ Passar tenantId explicitamente
                prescription.id,
                prescription.resident?.fullName || 'Residente',
              )
              totalExpired++
            }
          }
          // Prescrição vencendo em 5 dias ou menos (0 a 5 dias)
          else if (diffDays >= 0 && diffDays <= 5) {
            // Verificar se já existe notificação para evitar duplicatas
            const existing = await tenantClient.notification.findFirst({
              where: {
                entityType: 'PRESCRIPTION',
                entityId: prescription.id,
                type: 'PRESCRIPTION_EXPIRING',
                createdAt: {
                  gte: subDays(new Date(), 1), // Última 24h
                },
              },
            })

            if (!existing) {
              await this.notificationsHelper.createPrescriptionExpiringNotificationForTenant(
                tenant.id, // ✅ Passar tenantId explicitamente
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
        select: { id: true, timezone: true, schemaName: true },
      })

      let totalExpired = 0
      let totalExpiring = 0

      for (const tenant of tenants) {
        // Obter tenant client para isolamento de schema
        const tenantClient = this.prisma.getTenantClient(tenant.schemaName)

        // ✅ Obter data atual no timezone do tenant
        const todayStr = getCurrentDateInTz(
          tenant.timezone || DEFAULT_TIMEZONE,
        )

        // Verificar documentos institucionais
        const tenantDocs = await tenantClient.tenantDocument.findMany({
          where: {
            deletedAt: null,
            expiresAt: { not: null },
          },
        })

        for (const doc of tenantDocs) {
          if (!doc.expiresAt) continue

          // ✅ expiresAt agora é DATE (string YYYY-MM-DD), comparar diretamente
          const expiresAtStr = typeof doc.expiresAt === 'string'
            ? parseDateOnly(doc.expiresAt)
            : parseDateOnly(doc.expiresAt.toISOString())

          // Calcular diferença de dias entre duas datas civil
          const todayDate = parseISO(todayStr + 'T00:00:00')
          const expiresDate = parseISO(expiresAtStr + 'T00:00:00')
          const diffTime = expiresDate.getTime() - todayDate.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          // Documento vencido
          if (diffDays < 0) {
            const existing = await tenantClient.notification.findFirst({
              where: {
                entityType: 'TENANT_DOCUMENT',
                entityId: doc.id,
                type: 'DOCUMENT_EXPIRED',
                createdAt: {
                  gte: subDays(new Date(), 7),
                },
              },
            })

            if (!existing) {
              // Usar label amigável em vez do tipo técnico
              const documentLabel = getDocumentLabel(doc.type)
              await this.notificationsHelper.createDocumentExpiredNotificationForTenant(
                tenant.id, // ✅ Passar tenantId explicitamente
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
            const existing = await tenantClient.notification.findFirst({
              where: {
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
                  gte: subDays(new Date(), 2),
                },
              },
            })

            if (!existing) {
              // Usar label amigável em vez do tipo técnico
              const documentLabel = getDocumentLabel(doc.type)
              await this.notificationsHelper.createDocumentExpiringNotificationForTenant(
                tenant.id, // ✅ Passar tenantId explicitamente
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
        select: { id: true, name: true, timezone: true, schemaName: true },
      })

      let totalNotifications = 0
      let totalMarkedForReview = 0

      for (const tenant of tenants) {
        // Obter tenant client para isolamento de schema
        const tenantClient = this.prisma.getTenantClient(tenant.schemaName)

        // ✅ Obter data atual no timezone do tenant
        const todayStr = getCurrentDateInTz(
          tenant.timezone || DEFAULT_TIMEZONE,
        )

        // Buscar POPs PUBLISHED com nextReviewDate <= hoje + 30 dias
        const todayDate = parseISO(todayStr + 'T00:00:00')
        const inThirtyDays = addDays(todayDate, 30)

        const popsNeedingReview = await tenantClient.pop.findMany({
          where: {
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
          const reviewDateStr = typeof pop.nextReviewDate === 'string'
            ? parseDateOnly(pop.nextReviewDate)
            : parseDateOnly(pop.nextReviewDate.toISOString())
          const reviewDate = parseISO(reviewDateStr + 'T00:00:00')

          const diffTime = reviewDate.getTime() - todayDate.getTime()
          const daysUntilReview = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          // Janelas de alerta: 30, 15, 7, 3, 1, 0 (vencido)
          const alertWindows = [30, 15, 7, 3, 1, 0]

          if (alertWindows.includes(daysUntilReview)) {
            // Verificar se já existe notificação para hoje
            const existingNotification =
              await tenantClient.notification.findFirst({
                where: {
                  type: 'POP_REVIEW_DUE',
                  entityType: 'POP',
                  entityId: pop.id,
                  createdAt: {
                    gte: todayDate, // TIMESTAMPTZ comparado com midnight local
                  },
                },
              })

            if (!existingNotification) {
              await this.notificationsHelper.createPopReviewNotificationForTenant(
                tenant.id, // ✅ Passar tenantId explicitamente
                pop.id,
                pop.title,
                daysUntilReview,
              )
              totalNotifications++
            }
          }

          // Se vencido (dias <= 0), marcar requiresReview = true
          if (daysUntilReview <= 0 && !pop.requiresReview) {
            await tenantClient.pop.update({
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
      const result = await this.notificationsHelper.cleanupExpired()
      this.logger.log(
        `✅ Cron cleanupExpiredNotifications completed: ${result.notificationsDeleted} notifications deleted`,
      )
    } catch (error) {
      this.logger.error(
        '❌ Error in cleanupExpiredNotifications cron:',
        error,
      )
    }
  }
}
