/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { subDays, addDays, parseISO, format, differenceInMinutes } from 'date-fns'
import {
  NotificationCategory,
  NotificationSeverity,
  PositionCode,
  SystemNotificationType,
} from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsHelperService } from './notifications-helper.service'
import { NotificationRecipientsResolverService } from './notification-recipients-resolver.service'
import {
  getDocumentLabel,
  shouldTriggerAlert,
} from '../institutional-profile/config/document-requirements.config'
import {
  getCurrentDateInTz,
  parseDateOnly,
  formatDateOnly,
  localToUTC,
  DEFAULT_TIMEZONE,
} from '../utils/date.helpers'

@Injectable()
export class NotificationsCronService {
  private readonly logger = new Logger(NotificationsCronService.name)
  private static readonly SHIFT_PENDING_NOTIFY_DELAY_MINUTES = 60
  private static readonly ADMIN_TECH_POSITIONS: PositionCode[] = [
    PositionCode.ADMINISTRATOR,
    PositionCode.TECHNICAL_MANAGER,
  ]
  private static readonly ADMIN_TECH_OFFICE_POSITIONS: PositionCode[] = [
    PositionCode.ADMINISTRATOR,
    PositionCode.TECHNICAL_MANAGER,
    PositionCode.ADMINISTRATIVE,
    PositionCode.ADMINISTRATIVE_ASSISTANT,
  ]
  private static readonly SCHEDULED_EVENT_POSITIONS: PositionCode[] =
    NotificationsCronService.ADMIN_TECH_OFFICE_POSITIONS
  private static readonly DOCUMENT_POSITIONS: PositionCode[] =
    NotificationsCronService.ADMIN_TECH_POSITIONS
  private static readonly CLINICAL_CORE_POSITIONS: PositionCode[] = [
    PositionCode.ADMINISTRATOR,
    PositionCode.TECHNICAL_MANAGER,
    PositionCode.NURSE,
    PositionCode.NURSING_COORDINATOR,
    PositionCode.NURSING_TECHNICIAN,
  ]
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsHelper: NotificationsHelperService,
    private readonly recipientsResolver: NotificationRecipientsResolverService,
  ) {}

  private buildShiftEndDateTime(
    shiftDate: Date | string,
    startTime: string,
    endTime: string,
    timezone: string,
  ): Date {
    const shiftDateStr = formatDateOnly(shiftDate);
    const start = localToUTC(shiftDateStr, startTime, timezone);
    let end = localToUTC(shiftDateStr, endTime, timezone);

    // Turno noturno que cruza meia-noite (ex.: 19:00 -> 07:00)
    if (end <= start) {
      end = addDays(end, 1);
    }

    return end;
  }

  private readDaysLeftFromMetadata(metadata: unknown): number | null {
    if (!metadata || typeof metadata !== 'object') return null
    const value = (metadata as { daysLeft?: unknown }).daysLeft
    if (typeof value === 'number') return value
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return Number(value)
    }
    return null
  }

  /**
   * Cron Job - Detectar plantões em encerramento pendente
   * Executa a cada 10 minutos.
   *
   * Destinatários:
   * - Administrador (positionCode ADMINISTRATOR)
   * - Responsável Técnico (positionCode TECHNICAL_MANAGER ou flag isTechnicalManager)
   * - Líder da equipe
   * - Suplente/Substituto da equipe
   *
   * Deduplicação:
   * - Uma notificação por plantão (entityId = shift.id)
   */
  @Cron('*/10 * * * *', {
    name: 'checkShiftPendingClosure',
    timeZone: 'America/Sao_Paulo',
  })
  async checkShiftPendingClosure() {
    this.logger.log('🕒 Running cron: checkShiftPendingClosure')

    try {
      const tenants = await this.prisma.tenant.findMany({
        where: { deletedAt: null },
        select: { id: true, timezone: true, schemaName: true },
      })

      let totalNotifications = 0
      let totalOverdueCandidates = 0
      let totalAlreadyNotified = 0
      let totalNoRecipients = 0

      for (const tenant of tenants) {
        const tenantClient = this.prisma.getTenantClient(tenant.schemaName)
        const timezone = tenant.timezone || DEFAULT_TIMEZONE
        const now = new Date()

        const inProgressShifts = await tenantClient.shift.findMany({
          where: {
            status: 'IN_PROGRESS',
            deletedAt: null,
          },
          select: {
            id: true,
            date: true,
            shiftTemplateId: true,
            teamId: true,
            team: {
              select: {
                name: true,
              },
            },
          },
        })

        if (inProgressShifts.length === 0) continue
        const inProgressShiftIds = inProgressShifts.map((s) => s.id)
        const existingShiftNotifications = await tenantClient.notification.findMany({
          where: {
            type: SystemNotificationType.SHIFT_PENDING_CLOSURE,
            entityType: 'SHIFT',
            entityId: { in: inProgressShiftIds },
          },
          select: { entityId: true },
        })
        const existingShiftIds = new Set(existingShiftNotifications.map((n) => n.entityId))

        const templateIds = [...new Set(inProgressShifts.map((s) => s.shiftTemplateId))]
        const [shiftTemplates, tenantConfigs] = await Promise.all([
          this.prisma.shiftTemplate.findMany({
            where: { id: { in: templateIds } },
            select: {
              id: true,
              name: true,
              startTime: true,
              endTime: true,
            },
          }),
          tenantClient.tenantShiftConfig.findMany({
            where: {
              shiftTemplateId: { in: templateIds },
              deletedAt: null,
            },
            select: {
              shiftTemplateId: true,
              customName: true,
              customStartTime: true,
              customEndTime: true,
            },
          }),
        ])

        const templateMap = new Map(shiftTemplates.map((t) => [t.id, t]))
        const configMap = new Map(tenantConfigs.map((c) => [c.shiftTemplateId, c]))

        // Gestão ativa no tenant (Admin + RT) - busca única por tenant
        const managementIds = new Set(
          await this.recipientsResolver.resolveBySchemaName(tenant.schemaName, {
            positionCodes: [PositionCode.ADMINISTRATOR, PositionCode.TECHNICAL_MANAGER],
            includeTechnicalManagerFlag: true,
          }),
        )

        const teamIds = [
          ...new Set(inProgressShifts.map((s) => s.teamId).filter((id): id is string => !!id)),
        ]
        const teamRoleMembers =
          teamIds.length > 0
            ? await tenantClient.teamMember.findMany({
                where: {
                  teamId: { in: teamIds },
                  removedAt: null,
                  role: { in: ['Líder', 'Suplente', 'Substituto'] },
                },
                select: {
                  teamId: true,
                  userId: true,
                },
              })
            : []

        const teamRecipientsMap = new Map<string, Set<string>>()
        for (const member of teamRoleMembers) {
          if (!teamRecipientsMap.has(member.teamId)) {
            teamRecipientsMap.set(member.teamId, new Set<string>())
          }
          teamRecipientsMap.get(member.teamId)!.add(member.userId)
        }

        const allPotentialRecipientIds = new Set<string>([...managementIds])
        for (const ids of teamRecipientsMap.values()) {
          for (const userId of ids) allPotentialRecipientIds.add(userId)
        }

        const activeRecipientIds =
          allPotentialRecipientIds.size > 0
            ? new Set(
                (
                  await tenantClient.user.findMany({
                    where: {
                      id: { in: [...allPotentialRecipientIds] },
                      deletedAt: null,
                      isActive: true,
                    },
                    select: { id: true },
                  })
                ).map((u) => u.id),
              )
            : new Set<string>()

        for (const shift of inProgressShifts) {
          const template = templateMap.get(shift.shiftTemplateId)
          if (!template) continue

          const config = configMap.get(shift.shiftTemplateId)
          const startTime = config?.customStartTime || template.startTime
          const endTime = config?.customEndTime || template.endTime
          const shiftName = config?.customName || template.name

          const shiftEndDateTime = this.buildShiftEndDateTime(
            shift.date,
            startTime,
            endTime,
            timezone,
          )

          const overdueMinutes = differenceInMinutes(now, shiftEndDateTime)
          if (overdueMinutes < NotificationsCronService.SHIFT_PENDING_NOTIFY_DELAY_MINUTES) {
            continue
          }
          totalOverdueCandidates++

          if (existingShiftIds.has(shift.id)) {
            totalAlreadyNotified++
            continue
          }

          const recipients = new Set<string>([...managementIds])
          if (shift.teamId && teamRecipientsMap.has(shift.teamId)) {
            for (const userId of teamRecipientsMap.get(shift.teamId)!) {
              recipients.add(userId)
            }
          }

          const recipientIds = [...recipients].filter((id) => activeRecipientIds.has(id))
          if (recipientIds.length === 0) {
            totalNoRecipients++
            continue
          }

          const hours = Math.floor(overdueMinutes / 60)
          const minutes = overdueMinutes % 60
          const overdueLabel = hours > 0 ? `${hours}h ${minutes}min` : `${overdueMinutes} min`
          const shiftDate = formatDateOnly(shift.date)

          await this.notificationsHelper.createDirectedForTenant(tenant.id, recipientIds, {
            type: SystemNotificationType.SHIFT_PENDING_CLOSURE,
            category: NotificationCategory.SYSTEM,
            severity: NotificationSeverity.WARNING,
            title: 'Encerramento de Plantão Pendente',
            message:
              `O plantão ${shift.team?.name || 'Sem equipe'} • ${shiftName} ` +
              `(${startTime}-${endTime}) está pendente de encerramento há ${overdueLabel}.`,
            actionUrl: '/dashboard/escala-cuidados',
            entityType: 'SHIFT',
            entityId: shift.id,
            metadata: {
              shiftId: shift.id,
              shiftDate,
              teamId: shift.teamId,
              teamName: shift.team?.name || null,
              shiftName,
              startTime,
              endTime,
              overdueMinutes,
            },
            // Tradeoff: expira em 48h para não poluir a central após resolução tardia.
            expiresAt: addDays(now, 2).toISOString(),
          })
          totalNotifications++
        }
      }

      this.logger.log(
        `✅ Cron checkShiftPendingClosure completed: created=${totalNotifications}, ` +
          `overdueCandidates=${totalOverdueCandidates}, alreadyNotified=${totalAlreadyNotified}, ` +
          `noRecipients=${totalNoRecipients}`,
      )
    } catch (error) {
      this.logger.error('❌ Error in checkShiftPendingClosure cron:', error)
    }
  }

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
      let totalDueCandidates = 0
      let totalDueAlreadyNotified = 0
      let totalMissedCandidates = 0
      let totalMissedAlreadyNotified = 0

      for (const tenant of tenants) {
        // Obter tenant client para isolamento de schema
        const tenantClient = this.prisma.getTenantClient(tenant.schemaName)
        const recipientIds = await this.recipientsResolver.resolveBySchemaName(tenant.schemaName, {
          positionCodes: NotificationsCronService.SCHEDULED_EVENT_POSITIONS,
          includeTechnicalManagerFlag: true,
        })
        if (recipientIds.length === 0) continue

        // ✅ Obter data atual no timezone do tenant (recordDate é DATE)
        const timezone = tenant.timezone || DEFAULT_TIMEZONE
        const todayStr = getCurrentDateInTz(timezone)
        // Converter string YYYY-MM-DD para Date object (Prisma espera Date para @db.Date)
        const todayDate = parseISO(`${todayStr}T12:00:00.000`)
        const startOfTodayUtc = localToUTC(todayStr, '00:00', timezone)

        // Buscar eventos agendados para hoje (status SCHEDULED)
        const eventsToday = await tenantClient.residentScheduledEvent.findMany({
          where: {
            status: { equals: 'SCHEDULED' as any },
            scheduledDate: todayDate, // Passar Date object para campo @db.Date
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
        const eventTodayIds = eventsToday.map((e) => e.id)
        const existingDueNotifications =
          eventTodayIds.length > 0
            ? await tenantClient.notification.findMany({
                where: {
                  entityType: 'SCHEDULED_EVENT',
                  entityId: { in: eventTodayIds },
                  type: 'SCHEDULED_EVENT_DUE',
                  createdAt: {
                    gte: startOfTodayUtc,
                  },
                },
                select: { entityId: true },
              })
            : []
        const existingDueIds = new Set(existingDueNotifications.map((n) => n.entityId))

        // Criar notificações para eventos do dia
        for (const event of eventsToday) {
          totalDueCandidates++
          // Verificar se já existe notificação para hoje (createdAt é TIMESTAMPTZ)
          if (!existingDueIds.has(event.id)) {
            await this.notificationsHelper.createDirectedForTenant(tenant.id, recipientIds, {
              type: SystemNotificationType.SCHEDULED_EVENT_DUE,
              category: NotificationCategory.SCHEDULED_EVENT,
              severity: NotificationSeverity.INFO,
              title: 'Evento Agendado Hoje',
              message:
                `${event.resident?.fullName || 'Residente'} tem um agendamento hoje às ` +
                `${event.scheduledTime}: ${event.title}`,
              actionUrl: `/dashboard/residentes/${event.resident?.id || ''}`,
              entityType: 'SCHEDULED_EVENT',
              entityId: event.id,
              metadata: {
                residentId: event.resident?.id || '',
                residentName: event.resident?.fullName || 'Residente',
                eventTitle: event.title,
                scheduledTime: event.scheduledTime,
              },
            })
            totalDue++
          } else {
            totalDueAlreadyNotified++
          }
        }

        // Buscar eventos passados não concluídos (status SCHEDULED)
        const missedEvents = await tenantClient.residentScheduledEvent.findMany({
          where: {
            status: { equals: 'SCHEDULED' as any },
            scheduledDate: {
              lt: todayDate, // Antes de hoje (comparação de Date objects)
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
        const missedEventIds = missedEvents.map((e) => e.id)
        const existingMissedNotifications =
          missedEventIds.length > 0
            ? await tenantClient.notification.findMany({
                where: {
                  entityType: 'SCHEDULED_EVENT',
                  entityId: { in: missedEventIds },
                  type: 'SCHEDULED_EVENT_MISSED',
                },
                select: { entityId: true },
              })
            : []
        const existingMissedIds = new Set(existingMissedNotifications.map((n) => n.entityId))

        // Criar notificações para eventos perdidos
        for (const event of missedEvents) {
          totalMissedCandidates++
          // Verificar se já existe notificação para evitar duplicatas
          if (!existingMissedIds.has(event.id)) {
            // 1. Atualizar status do evento para MISSED no banco de dados
            await tenantClient.residentScheduledEvent.update({
              where: { id: event.id },
              data: { status: 'MISSED' },
            })

            // 2. Criar notificação direcionada
            const scheduledDate = format(event.scheduledDate, 'yyyy-MM-dd')
            await this.notificationsHelper.createDirectedForTenant(tenant.id, recipientIds, {
              type: SystemNotificationType.SCHEDULED_EVENT_MISSED,
              category: NotificationCategory.SCHEDULED_EVENT,
              severity: NotificationSeverity.WARNING,
              title: 'Evento Agendado Perdido',
              message:
                `${event.resident?.fullName || 'Residente'} perdeu o agendamento de ` +
                `${scheduledDate}: ${event.title}`,
              actionUrl: `/dashboard/residentes/${event.resident?.id || ''}`,
              entityType: 'SCHEDULED_EVENT',
              entityId: event.id,
              metadata: {
                residentId: event.resident?.id || '',
                residentName: event.resident?.fullName || 'Residente',
                eventTitle: event.title,
                scheduledDate,
              },
            })
            totalMissed++
          } else {
            totalMissedAlreadyNotified++
          }
        }
      }

      this.logger.log(
        `✅ Cron checkScheduledEvents completed: dueCreated=${totalDue}, missedCreated=${totalMissed}, ` +
          `dueCandidates=${totalDueCandidates}, dueAlreadyNotified=${totalDueAlreadyNotified}, ` +
          `missedCandidates=${totalMissedCandidates}, missedAlreadyNotified=${totalMissedAlreadyNotified}`,
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
      let totalExpiredCandidates = 0
      let totalExpiredAlreadyNotified = 0
      let totalExpiringCandidates = 0
      let totalExpiringAlreadyNotified = 0

      for (const tenant of tenants) {
        // Obter tenant client para isolamento de schema
        const tenantClient = this.prisma.getTenantClient(tenant.schemaName)
        const recipientIds = await this.recipientsResolver.resolveBySchemaName(tenant.schemaName, {
          positionCodes: NotificationsCronService.CLINICAL_CORE_POSITIONS,
          includeTechnicalManagerFlag: true,
        })
        if (recipientIds.length === 0) continue

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
        const prescriptionIds = prescriptions.map((p) => p.id)
        const [existingExpiredNotifications, existingExpiringNotifications] = prescriptionIds.length > 0
          ? await Promise.all([
              tenantClient.notification.findMany({
                where: {
                  entityType: 'PRESCRIPTION',
                  entityId: { in: prescriptionIds },
                  type: 'PRESCRIPTION_EXPIRED',
                  createdAt: {
                    gte: subDays(new Date(), 1),
                  },
                },
                select: { entityId: true },
              }),
              tenantClient.notification.findMany({
                where: {
                  entityType: 'PRESCRIPTION',
                  entityId: { in: prescriptionIds },
                  type: 'PRESCRIPTION_EXPIRING',
                  createdAt: {
                    gte: subDays(new Date(), 1),
                  },
                },
                select: { entityId: true },
              }),
            ])
          : [[], []]
        const existingExpiredIds = new Set(existingExpiredNotifications.map((n) => n.entityId))
        const existingExpiringIds = new Set(existingExpiringNotifications.map((n) => n.entityId))

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
            totalExpiredCandidates++
            // Verificar se já existe notificação para evitar duplicatas
            if (!existingExpiredIds.has(prescription.id)) {
              await this.notificationsHelper.createDirectedForTenant(tenant.id, recipientIds, {
                type: SystemNotificationType.PRESCRIPTION_EXPIRED,
                category: NotificationCategory.PRESCRIPTION,
                severity: NotificationSeverity.CRITICAL,
                title: 'Prescrição Médica Vencida',
                message:
                  `A prescrição médica de ${prescription.resident?.fullName || 'Residente'} ` +
                  'está vencida e precisa ser renovada.',
                actionUrl: '/dashboard/medicacoes',
                entityType: 'PRESCRIPTION',
                entityId: prescription.id,
                metadata: {
                  prescriptionId: prescription.id,
                  residentName: prescription.resident?.fullName || 'Residente',
                },
              })
              totalExpired++
            } else {
              totalExpiredAlreadyNotified++
            }
          }
          // Prescrição vencendo em 5 dias ou menos (0 a 5 dias)
          else if (diffDays >= 0 && diffDays <= 5) {
            totalExpiringCandidates++
            // Verificar se já existe notificação para evitar duplicatas
            if (!existingExpiringIds.has(prescription.id)) {
              await this.notificationsHelper.createDirectedForTenant(tenant.id, recipientIds, {
                type: SystemNotificationType.PRESCRIPTION_EXPIRING,
                category: NotificationCategory.PRESCRIPTION,
                severity: NotificationSeverity.WARNING,
                title: 'Prescrição Médica Vencendo',
                message:
                  `A prescrição médica de ${prescription.resident?.fullName || 'Residente'} ` +
                  `vence em ${diffDays} dia(s). Providencie renovação.`,
                actionUrl: '/dashboard/medicacoes',
                entityType: 'PRESCRIPTION',
                entityId: prescription.id,
                metadata: {
                  prescriptionId: prescription.id,
                  residentName: prescription.resident?.fullName || 'Residente',
                  daysLeft: diffDays,
                },
              })
              totalExpiring++
            } else {
              totalExpiringAlreadyNotified++
            }
          }

          // Nota: Verificação de medicamentos controlados removida pois o modelo Medication
          // não possui campos controlledClass e receiptUrl no schema atual
        }
      }

      this.logger.log(
        `✅ Cron checkPrescriptionsExpiry completed: expiredCreated=${totalExpired}, expiringCreated=${totalExpiring}, ` +
          `expiredCandidates=${totalExpiredCandidates}, expiredAlreadyNotified=${totalExpiredAlreadyNotified}, ` +
          `expiringCandidates=${totalExpiringCandidates}, expiringAlreadyNotified=${totalExpiringAlreadyNotified}`,
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
      let totalExpiredCandidates = 0
      let totalExpiredAlreadyNotified = 0
      let totalExpiringCandidates = 0
      let totalExpiringAlreadyNotified = 0

      for (const tenant of tenants) {
        // Obter tenant client para isolamento de schema
        const tenantClient = this.prisma.getTenantClient(tenant.schemaName)
        const recipientIds = await this.recipientsResolver.resolveBySchemaName(tenant.schemaName, {
          positionCodes: NotificationsCronService.DOCUMENT_POSITIONS,
          includeTechnicalManagerFlag: true,
        })
        if (recipientIds.length === 0) continue

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
        const tenantDocIds = tenantDocs.map((d) => d.id)
        const [existingExpiredDocs, existingExpiringDocs] = tenantDocIds.length > 0
          ? await Promise.all([
              tenantClient.notification.findMany({
                where: {
                  entityType: 'TENANT_DOCUMENT',
                  entityId: { in: tenantDocIds },
                  type: 'DOCUMENT_EXPIRED',
                  createdAt: {
                    gte: subDays(new Date(), 7),
                  },
                },
                select: { entityId: true },
              }),
              tenantClient.notification.findMany({
                where: {
                  entityType: 'TENANT_DOCUMENT',
                  entityId: { in: tenantDocIds },
                  type: 'DOCUMENT_EXPIRING',
                  createdAt: {
                    gte: subDays(new Date(), 2),
                  },
                },
                select: {
                  entityId: true,
                  metadata: true,
                },
              }),
            ])
          : [[], []]
        const existingExpiredDocIds = new Set(existingExpiredDocs.map((n) => n.entityId))
        const existingExpiringDaysByDoc = new Map<string, number[]>()
        for (const notification of existingExpiringDocs) {
          const daysLeft = this.readDaysLeftFromMetadata(notification.metadata)
          if (daysLeft === null || !notification.entityId) continue
          const current = existingExpiringDaysByDoc.get(notification.entityId) || []
          current.push(daysLeft)
          existingExpiringDaysByDoc.set(notification.entityId, current)
        }

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
            totalExpiredCandidates++
            if (!existingExpiredDocIds.has(doc.id)) {
              // Usar label amigável em vez do tipo técnico
              const documentLabel = getDocumentLabel(doc.type)
              await this.notificationsHelper.createDirectedForTenant(tenant.id, recipientIds, {
                type: SystemNotificationType.DOCUMENT_EXPIRED,
                category: NotificationCategory.DOCUMENT,
                severity: NotificationSeverity.CRITICAL,
                title: 'Documento Vencido',
                message: `O documento "${documentLabel}" está vencido.`,
                actionUrl: '/dashboard/documentos',
                entityType: 'TENANT_DOCUMENT',
                entityId: doc.id,
                metadata: { documentId: doc.id, documentName: documentLabel },
              })
              totalExpired++
            } else {
              totalExpiredAlreadyNotified++
            }
          }
          // Documento vencendo - verificar se está em janela de alerta configurada
          else if (diffDays >= 0 && shouldTriggerAlert(doc.type, diffDays)) {
            totalExpiringCandidates++
            // Verificar se já foi enviado alerta para esta janela específica
            const existingDayWindows = existingExpiringDaysByDoc.get(doc.id) || []
            const alreadyNotifiedWindow = existingDayWindows.some(
              (days) => days >= diffDays - 2 && days <= diffDays + 2,
            )

            if (!alreadyNotifiedWindow) {
              // Usar label amigável em vez do tipo técnico
              const documentLabel = getDocumentLabel(doc.type)
              await this.notificationsHelper.createDirectedForTenant(tenant.id, recipientIds, {
                type: SystemNotificationType.DOCUMENT_EXPIRING,
                category: NotificationCategory.DOCUMENT,
                severity: NotificationSeverity.WARNING,
                title: 'Documento Vencendo',
                message: `O documento "${documentLabel}" vence em ${diffDays} dia(s).`,
                actionUrl: '/dashboard/documentos',
                entityType: 'TENANT_DOCUMENT',
                entityId: doc.id,
                metadata: { documentId: doc.id, documentName: documentLabel, daysLeft: diffDays },
              })
              totalExpiring++
            } else {
              totalExpiringAlreadyNotified++
            }
          }
        }

        // Nota: Verificação de ResidentDocument removida pois o modelo não possui
        // campos expiresAt, name e status no schema atual
        // ResidentDocument é usado apenas para armazenar arquivos sem metadados de validade
      }

      this.logger.log(
        `✅ Cron checkDocumentsExpiry completed: expiredCreated=${totalExpired}, expiringCreated=${totalExpiring}, ` +
          `expiredCandidates=${totalExpiredCandidates}, expiredAlreadyNotified=${totalExpiredAlreadyNotified}, ` +
          `expiringCandidates=${totalExpiringCandidates}, expiringAlreadyNotified=${totalExpiringAlreadyNotified}`,
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
      let totalReviewCandidates = 0
      let totalAlreadyNotified = 0

      for (const tenant of tenants) {
        // Obter tenant client para isolamento de schema
        const tenantClient = this.prisma.getTenantClient(tenant.schemaName)
        const recipientIds = await this.recipientsResolver.resolveBySchemaName(tenant.schemaName, {
          positionCodes: NotificationsCronService.ADMIN_TECH_POSITIONS,
          includeTechnicalManagerFlag: true,
        })
        if (recipientIds.length === 0) continue

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
        const popIds = popsNeedingReview.map((p) => p.id)
        const existingPopNotifications =
          popIds.length > 0
            ? await tenantClient.notification.findMany({
                where: {
                  type: 'POP_REVIEW_DUE',
                  entityType: 'POP',
                  entityId: { in: popIds },
                  createdAt: {
                    gte: todayDate,
                  },
                },
                select: { entityId: true },
              })
            : []
        const existingPopIds = new Set(existingPopNotifications.map((n) => n.entityId))

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
            totalReviewCandidates++
            // Verificar se já existe notificação para hoje
            if (!existingPopIds.has(pop.id)) {
              let message: string
              if (daysUntilReview <= 0) {
                message = `O POP "${pop.title}" precisa de revisão hoje.`
              } else {
                message = `O POP "${pop.title}" precisa de revisão em ${daysUntilReview} dia(s).`
              }

              await this.notificationsHelper.createDirectedForTenant(tenant.id, recipientIds, {
                type: SystemNotificationType.POP_REVIEW_DUE,
                category: NotificationCategory.POP,
                severity: daysUntilReview <= 0 ? NotificationSeverity.WARNING : NotificationSeverity.INFO,
                title: 'POP Precisa de Revisão',
                message,
                actionUrl: '/dashboard/pops',
                entityType: 'POP',
                entityId: pop.id,
                metadata: { popId: pop.id, popTitle: pop.title, daysUntilReview },
              })
              totalNotifications++
            } else {
              totalAlreadyNotified++
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
        `✅ Cron checkPopsReview completed: created=${totalNotifications}, markedForReview=${totalMarkedForReview}, ` +
          `reviewCandidates=${totalReviewCandidates}, alreadyNotified=${totalAlreadyNotified}`,
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
