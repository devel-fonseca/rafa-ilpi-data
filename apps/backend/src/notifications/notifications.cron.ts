import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from './notifications.service'

@Injectable()
export class NotificationsCronService {
  private readonly logger = new Logger(NotificationsCronService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

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
        select: { id: true, name: true },
      })

      let totalExpired = 0
      let totalExpiring = 0

      for (const tenant of tenants) {
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

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        for (const prescription of prescriptions) {
          const validUntil = prescription.validUntil
            ? new Date(prescription.validUntil)
            : null

          if (!validUntil) continue

          // Zerar horas para comparação apenas de data
          validUntil.setHours(0, 0, 0, 0)

          const diffTime = validUntil.getTime() - today.getTime()
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
                tenant.id,
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
                tenant.id,
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
        select: { id: true },
      })

      let totalExpired = 0
      let totalExpiring = 0

      for (const tenant of tenants) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

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

          const expiresAt = new Date(doc.expiresAt)
          expiresAt.setHours(0, 0, 0, 0)

          const diffTime = expiresAt.getTime() - today.getTime()
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
              await this.notificationsService.createDocumentExpiredNotification(
                tenant.id,
                doc.id,
                doc.type, // TenantDocument usa 'type' em vez de 'name'
                'TENANT_DOCUMENT',
              )
              totalExpired++
            }
          }
          // Documento vencendo em 30 dias ou menos
          else if (diffDays >= 0 && diffDays <= 30) {
            const existing = await this.prisma.notification.findFirst({
              where: {
                tenantId: tenant.id,
                entityType: 'TENANT_DOCUMENT',
                entityId: doc.id,
                type: 'DOCUMENT_EXPIRING',
                createdAt: {
                  gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                },
              },
            })

            if (!existing) {
              await this.notificationsService.createDocumentExpiringNotification(
                tenant.id,
                doc.id,
                doc.type, // TenantDocument usa 'type' em vez de 'name'
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
