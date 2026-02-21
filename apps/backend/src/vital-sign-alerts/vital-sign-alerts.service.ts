import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common'
import { format, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { PrismaService } from '../prisma/prisma.service'
import { TenantContextService } from '../prisma/tenant-context.service'
import {
  CreateVitalSignAlertDto,
  DecideVitalSignAlertIncidentDto,
  UpdateVitalSignAlertDto,
  QueryVitalSignAlertsDto,
} from './dto'
import {
  AlertSeverity,
  AlertStatus,
  IncidentCategory,
  IncidentSeverity,
  IncidentSubtypeClinical,
  NotificationCategory,
  NotificationSeverity,
  PositionCode,
  Prisma,
  SystemNotificationType,
  VitalSignAlertType,
} from '@prisma/client'
import { NotificationsService } from '../notifications/notifications.service'
import { DEFAULT_TIMEZONE } from '../utils/date.helpers'
import { formatIncidentSubtype } from '../daily-records/utils/incident-formatters'

@Injectable()
export class VitalSignAlertsService {
  private readonly logger = new Logger(VitalSignAlertsService.name)

  constructor(
    private prisma: PrismaService, // Para tabelas SHARED (public schema)
    private tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Criar novo alerta médico de sinal vital
   * Usado pelo sistema quando detecta anomalias
   */
  async create(
    dto: CreateVitalSignAlertDto,
    createdBy?: string,
  ) {
    this.logger.log(
      `Criando alerta médico: ${dto.type} para residente ${dto.residentId}`,
    )

    // Garantir usuário válido para trilha/auditoria (UUID obrigatório no histórico)
    const alertCreatorId =
      createdBy ||
      (
        await this.tenantContext.client.vitalSign.findUnique({
          where: { id: dto.vitalSignId },
          select: { userId: true },
        })
      )?.userId

    if (!alertCreatorId) {
      throw new NotFoundException(
        'Não foi possível identificar o usuário responsável pela criação do alerta',
      )
    }

    // Calcular prioridade automaticamente baseado na severidade
    const priority = this.calculatePriority(dto.severity, dto.type)

    // Criar alerta e primeira entrada de histórico em transação
    const alert = await this.tenantContext.client.$transaction(async (prisma) => {
      const newAlert = await prisma.vitalSignAlert.create({
        data: {
          tenantId: this.tenantContext.tenantId, // ⚠️ TEMPORARY: Schema ainda não migrado
          residentId: dto.residentId,
          vitalSignId: dto.vitalSignId,
          notificationId: dto.notificationId,
          type: dto.type,
          severity: dto.severity,
          title: dto.title,
          description: dto.description,
          value: dto.value,
          metadata: dto.metadata as Prisma.JsonObject,
          status: dto.status || AlertStatus.ACTIVE,
          priority: dto.priority !== undefined ? dto.priority : priority,
          assignedTo: dto.assignedTo,
          createdBy: alertCreatorId,
        },
        include: {
          resident: {
            select: {
              id: true,
              fullName: true,
              bedId: true,
            },
          },
          vitalSign: {
            select: {
              id: true,
              timestamp: true,
            },
          },
          notification: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      })

      // Criar primeira entrada de histórico (criação do alerta)
      await prisma.vitalSignAlertHistory.create({
        data: {
          alertId: newAlert.id,
          status: newAlert.status,
          assignedTo: newAlert.assignedTo,
          medicalNotes: null,
          actionTaken: null,
          changedBy: alertCreatorId,
          changeType: 'CREATED',
          changeReason: 'Alerta criado automaticamente pelo sistema',
        },
      })

      return newAlert
    })

    this.logger.log(`Alerta criado com sucesso: ${alert.id}`)
    return alert
  }

  /**
   * Buscar alertas com filtros e paginação
   */
  async findAll(query: QueryVitalSignAlertsDto) {
    const {
      residentId,
      status,
      type,
      severity,
      assignedTo,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = query

    const where: Prisma.VitalSignAlertWhereInput = {
      ...(residentId && { residentId }),
      ...(status && { status }),
      ...(type && { type }),
      ...(severity && { severity }),
      ...(assignedTo && { assignedTo }),
    }

    // Adicionar filtro de data se fornecido
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = parseISO(startDate)
      if (endDate) where.createdAt.lte = parseISO(endDate)
    }

    const [alerts, total] = await Promise.all([
      this.tenantContext.client.vitalSignAlert.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { priority: 'desc' }, // Maior prioridade primeiro
          { createdAt: 'desc' }, // Mais recentes primeiro
        ],
        include: {
          resident: {
            select: {
              id: true,
              fullName: true,
              bedId: true,
            },
          },
          vitalSign: {
            select: {
              id: true,
              timestamp: true,
              systolicBloodPressure: true,
              diastolicBloodPressure: true,
              bloodGlucose: true,
              temperature: true,
              oxygenSaturation: true,
              heartRate: true,
            },
          },
          assignedUser: {
            select: {
              id: true,
              name: true,
              profile: {
                select: {
                  positionCode: true,
                },
              },
            },
          },
          resolvedUser: {
            select: {
              id: true,
              name: true,
            },
          },
          clinicalNotes: {
            select: {
              id: true,
              noteDate: true,
              profession: true,
            },
          },
        },
      }),
      this.tenantContext.client.vitalSignAlert.count({ where }),
    ])

    return {
      data: alerts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Buscar alerta por ID
   */
  async findOne(id: string) {
    const alert = await this.tenantContext.client.vitalSignAlert.findFirst({
      where: {
        id,
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
            bedId: true,
            bed: {
              select: {
                id: true,
                code: true,
                room: {
                  select: {
                    id: true,
                    name: true,
                    floor: {
                      select: {
                        id: true,
                        name: true,
                        building: {
                          select: {
                            id: true,
                            name: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        vitalSign: true,
        notification: true,
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: {
                positionCode: true,
                registrationType: true,
                registrationNumber: true,
              },
            },
          },
        },
        resolvedUser: {
          select: {
            id: true,
            name: true,
          },
        },
        clinicalNotes: {
          select: {
            id: true,
            noteDate: true,
            profession: true,
            professional: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            noteDate: 'desc',
          },
        },
      },
    })

    if (!alert) {
      throw new NotFoundException(`Alerta ${id} não encontrado`)
    }

    return alert
  }

  /**
   * Atualizar alerta médico
   */
  async update(
    id: string,
    dto: UpdateVitalSignAlertDto,
    userId: string,
  ) {
    // Verificar se alerta existe
    const existingAlert = await this.findOne(id)

    // Preparar dados de atualização
    const updateData: Prisma.VitalSignAlertUncheckedUpdateInput = {}

    if (dto.status) {
      updateData.status = dto.status
    }

    if (dto.assignedTo !== undefined) {
      // Atualizar campo escalar assignedTo diretamente
      // Se é string válida, setar; senão, setar null
      if (dto.assignedTo && dto.assignedTo.length > 0) {
        updateData.assignedTo = dto.assignedTo
      } else {
        updateData.assignedTo = null
      }
    }

    if (dto.medicalNotes !== undefined) {
      updateData.medicalNotes = dto.medicalNotes || null
    }

    if (dto.actionTaken !== undefined) {
      updateData.actionTaken = dto.actionTaken || null
    }

    // Se mudou para RESOLVED, adicionar informações de resolução
    if (dto.status === AlertStatus.RESOLVED) {
      updateData.resolvedAt = new Date()
      updateData.resolvedBy = userId
    }

    // Se mudou para IN_TREATMENT, atualizar status
    if (
      dto.status === AlertStatus.IN_TREATMENT &&
      existingAlert.status === AlertStatus.ACTIVE
    ) {
      this.logger.log(`Alerta ${id} movido para tratamento`)
    }

    // Determinar tipo de mudança para histórico
    let changeType = 'UPDATED'
    if (dto.status && dto.status !== existingAlert.status) {
      changeType = 'STATUS_CHANGED'
    } else if (dto.assignedTo !== undefined && dto.assignedTo !== existingAlert.assignedTo) {
      changeType = 'ASSIGNED'
    } else if (dto.medicalNotes) {
      changeType = 'NOTES_ADDED'
    } else if (dto.actionTaken) {
      changeType = 'ACTION_TAKEN'
    }

    // Atualizar alerta e criar entrada de histórico em uma transação
    const result = await this.tenantContext.client.$transaction(async (prisma) => {
      // Atualizar alerta
      const updatedAlert = await prisma.vitalSignAlert.update({
        where: { id },
        data: updateData,
        include: {
          resident: {
            select: {
              id: true,
              fullName: true,
            },
          },
          assignedUser: {
            select: {
              id: true,
              name: true,
            },
          },
          resolvedUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      // Criar entrada de histórico
      await prisma.vitalSignAlertHistory.create({
        data: {
          alertId: id,
          status: updatedAlert.status,
          assignedTo: updatedAlert.assignedTo,
          medicalNotes: updatedAlert.medicalNotes,
          actionTaken: updatedAlert.actionTaken,
          changedBy: userId,
          changeType,
          changeReason: null, // Pode ser adicionado futuramente ao DTO
        },
      })

      return updatedAlert
    })

    this.logger.log(`Alerta ${id} atualizado com sucesso`)
    return result
  }

  /**
   * Confirma que um alerta de sinal vital caracteriza intercorrência clínica
   * e gera registro de INTERCORRENCIA para fluxo assistencial.
   */
  async confirmIncident(
    id: string,
    dto: DecideVitalSignAlertIncidentDto,
    userId: string,
  ) {
    await this.assertCanDecideIncident(userId)

    const alert = await this.findOne(id)
    const metadata = this.getAlertMetadata(alert.metadata)
    const decision = this.getIncidentDecision(metadata)

    if (decision === 'DISMISSED') {
      throw new BadRequestException('Este alerta já foi descartado para intercorrência')
    }

    const existingIncident = await this.findIncidentByAlertId(id)

    const incidentRecord =
      existingIncident ||
      (await this.createIncidentFromAlert(alert, dto, userId))

    const mergedMetadata: Prisma.InputJsonValue = {
      ...metadata,
      incidentDecision: 'CONFIRMED',
      incidentDecisionAt: new Date().toISOString(),
      incidentDecisionBy: userId,
      incidentRecordId: incidentRecord.id,
      incidentConfirmedBy: userId,
      incidentConfirmedAt: new Date().toISOString(),
    }

    const medicalNotes =
      dto.medicalNotes?.trim() ||
      alert.medicalNotes ||
      'Intercorrência confirmada a partir de alerta de sinais vitais.'

    const actionTaken =
      dto.actionTaken?.trim() ||
      alert.actionTaken ||
      'Registro de intercorrência gerado para acompanhamento clínico.'

    await this.tenantContext.client.$transaction(async (prisma) => {
      const updatedAlert = await prisma.vitalSignAlert.update({
        where: { id },
        data: {
          // Alerta convertido em intercorrência segue ativo para gestão clínica
          // (RT/Admin pode evoluir status depois dentro do gerenciamento).
          status: AlertStatus.ACTIVE,
          medicalNotes,
          actionTaken,
          metadata: mergedMetadata,
        },
      })

      await prisma.vitalSignAlertHistory.create({
        data: {
          alertId: id,
          status: updatedAlert.status,
          assignedTo: updatedAlert.assignedTo,
          medicalNotes: updatedAlert.medicalNotes,
          actionTaken: updatedAlert.actionTaken,
          changedBy: userId,
          changeType: 'INCIDENT_CONFIRMED',
          changeReason: `Intercorrência confirmada (registro ${incidentRecord.id})`,
        },
      })
    })

    this.logger.log(`Alerta ${id} confirmado como intercorrência`, {
      alertId: id,
      incidentRecordId: incidentRecord.id,
      residentId: alert.residentId,
    })

    const refreshedAlert = await this.findOne(id)

    return {
      alert: refreshedAlert,
      incidentRecordId: incidentRecord.id,
    }
  }

  /**
   * Descarta a criação de intercorrência para um alerta de sinal vital.
   */
  async dismissIncident(
    id: string,
    dto: DecideVitalSignAlertIncidentDto,
    userId: string,
  ) {
    await this.assertCanDecideIncident(userId)

    const alert = await this.findOne(id)
    const metadata = this.getAlertMetadata(alert.metadata)
    const decision = this.getIncidentDecision(metadata)

    if (decision === 'CONFIRMED' || metadata.incidentRecordId) {
      throw new BadRequestException('Este alerta já foi confirmado como intercorrência')
    }

    const mergedMetadata: Prisma.InputJsonValue = {
      ...metadata,
      incidentDecision: 'DISMISSED',
      incidentDecisionAt: new Date().toISOString(),
      incidentDecisionBy: userId,
      incidentDismissedBy: userId,
      incidentDismissedAt: new Date().toISOString(),
    }

    const medicalNotes =
      dto.medicalNotes?.trim() ||
      alert.medicalNotes ||
      'Intercorrência descartada após avaliação clínica.'

    const actionTaken =
      dto.actionTaken?.trim() ||
      alert.actionTaken ||
      'Manter monitoramento do residente e reavaliar em caso de novos sinais.'

    await this.tenantContext.client.$transaction(async (prisma) => {
      const updatedAlert = await prisma.vitalSignAlert.update({
        where: { id },
        data: {
          status: AlertStatus.IGNORED,
          medicalNotes,
          actionTaken,
          metadata: mergedMetadata,
        },
      })

      await prisma.vitalSignAlertHistory.create({
        data: {
          alertId: id,
          status: updatedAlert.status,
          assignedTo: updatedAlert.assignedTo,
          medicalNotes: updatedAlert.medicalNotes,
          actionTaken: updatedAlert.actionTaken,
          changedBy: userId,
          changeType: 'INCIDENT_DISMISSED',
          changeReason: 'Intercorrência descartada pelo responsável clínico',
        },
      })
    })

    this.logger.log(`Alerta ${id} descartado para intercorrência`, {
      alertId: id,
      residentId: alert.residentId,
    })

    return {
      alert: await this.findOne(id),
    }
  }

  /**
   * Buscar alertas ativos de um residente
   */
  async findActiveByResident(residentId: string) {
    return this.tenantContext.client.vitalSignAlert.findMany({
      where: {
        residentId,
        status: {
          in: [AlertStatus.ACTIVE, AlertStatus.IN_TREATMENT, AlertStatus.MONITORING],
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        vitalSign: {
          select: {
            id: true,
            timestamp: true,
          },
        },
      },
    })
  }

  /**
   * Contar alertas por status
   */
  async countByStatus() {
    const [active, inTreatment, monitoring, resolved, ignored] =
      await Promise.all([
        this.tenantContext.client.vitalSignAlert.count({
          where: { status: AlertStatus.ACTIVE },
        }),
        this.tenantContext.client.vitalSignAlert.count({
          where: { status: AlertStatus.IN_TREATMENT },
        }),
        this.tenantContext.client.vitalSignAlert.count({
          where: { status: AlertStatus.MONITORING },
        }),
        this.tenantContext.client.vitalSignAlert.count({
          where: { status: AlertStatus.RESOLVED },
        }),
        this.tenantContext.client.vitalSignAlert.count({
          where: { status: AlertStatus.IGNORED },
        }),
      ])

    return {
      active,
      inTreatment,
      monitoring,
      resolved,
      ignored,
      total: active + inTreatment + monitoring + resolved + ignored,
    }
  }

  private getAlertMetadata(
    metadata: Prisma.JsonValue | null | undefined,
  ): Record<string, unknown> {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return {}
    }

    return metadata as Record<string, unknown>
  }

  private getIncidentDecision(metadata: Record<string, unknown>): 'CONFIRMED' | 'DISMISSED' | null {
    const value = metadata.incidentDecision
    if (value === 'CONFIRMED' || value === 'DISMISSED') {
      return value
    }
    return null
  }

  private mapAlertSeverityToIncidentSeverity(severity: AlertSeverity): IncidentSeverity {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return IncidentSeverity.GRAVE
      case AlertSeverity.WARNING:
        return IncidentSeverity.MODERADA
      case AlertSeverity.INFO:
      default:
        return IncidentSeverity.LEVE
    }
  }

  private mapAlertTypeToIncidentSubtype(type: VitalSignAlertType): IncidentSubtypeClinical {
    switch (type) {
      case VitalSignAlertType.GLUCOSE_HIGH:
        return IncidentSubtypeClinical.HIPERGLICEMIA
      case VitalSignAlertType.GLUCOSE_LOW:
        return IncidentSubtypeClinical.HIPOGLICEMIA
      case VitalSignAlertType.TEMPERATURE_HIGH:
        return IncidentSubtypeClinical.FEBRE_HIPERTERMIA
      case VitalSignAlertType.TEMPERATURE_LOW:
        return IncidentSubtypeClinical.HIPOTERMIA
      case VitalSignAlertType.OXYGEN_LOW:
        return IncidentSubtypeClinical.DISPNEIA
      case VitalSignAlertType.PRESSURE_HIGH:
      case VitalSignAlertType.PRESSURE_LOW:
      case VitalSignAlertType.HEART_RATE_HIGH:
      case VitalSignAlertType.HEART_RATE_LOW:
      default:
        return IncidentSubtypeClinical.OUTRA_CLINICA
    }
  }

  private async assertCanDecideIncident(userId: string) {
    const userProfile = await this.tenantContext.client.userProfile.findFirst({
      where: {
        userId,
      },
      select: {
        positionCode: true,
      },
    })

    const allowedPositions = new Set<PositionCode>([
      PositionCode.ADMINISTRATOR,
      PositionCode.TECHNICAL_MANAGER,
    ])

    if (!userProfile?.positionCode || !allowedPositions.has(userProfile.positionCode)) {
      throw new ForbiddenException('Apenas Administrador ou Responsável Técnico podem decidir intercorrências')
    }
  }

  private async findIncidentByAlertId(alertId: string) {
    return this.tenantContext.client.dailyRecord.findFirst({
      where: {
        type: 'INTERCORRENCIA',
        data: {
          path: ['alertaVitalId'],
          equals: alertId,
        },
        deletedAt: null,
      },
      select: {
        id: true,
      },
    })
  }

  private async createIncidentFromAlert(
    alert: Awaited<ReturnType<VitalSignAlertsService['findOne']>>,
    dto: DecideVitalSignAlertIncidentDto,
    userId: string,
  ) {
    const subtypeClinical = this.mapAlertTypeToIncidentSubtype(alert.type)
    const incidentSeverity = this.mapAlertSeverityToIncidentSeverity(alert.severity)
    const metadata = this.getAlertMetadata(alert.metadata)

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: this.tenantContext.tenantId },
      select: { timezone: true },
    })
    const timezone = tenant?.timezone || DEFAULT_TIMEZONE

    const sourceTimestamp = alert.vitalSign?.timestamp || alert.createdAt
    const zonedSourceTimestamp = toZonedTime(sourceTimestamp, timezone)
    const localDate = format(zonedSourceTimestamp, 'yyyy-MM-dd')
    const localTime = format(zonedSourceTimestamp, 'HH:mm')
    const prismaDate = parseISO(`${localDate}T12:00:00.000`)

    const creatorUser = await this.tenantContext.client.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })
    const recordedBy = creatorUser?.name || 'Sistema'

    const description =
      dto.medicalNotes?.trim() ||
      `Intercorrência confirmada a partir de alerta de sinais vitais: ${alert.value}`

    const actionTaken =
      dto.actionTaken?.trim() ||
      'Registrar conduta, manter monitoramento e reavaliar parâmetros em intervalo clínico adequado.'

    const incidentData: Record<string, unknown> = {
      descricao: description,
      acaoTomada: actionTaken,
      deteccaoAutomatica: false,
      origemAlertaVital: true,
      alertaVitalId: alert.id,
      alertaVitalTipo: alert.type,
      alertaVitalValor: alert.value,
      alertaVitalTimestamp: sourceTimestamp.toISOString(),
    }

    if (typeof metadata.expectedRange === 'string') {
      incidentData.expectedRange = metadata.expectedRange
    }
    if (typeof metadata.threshold === 'string') {
      incidentData.threshold = metadata.threshold
    }

    const incidentRecord = await this.tenantContext.client.dailyRecord.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        residentId: alert.residentId,
        userId,
        type: 'INTERCORRENCIA',
        date: prismaDate,
        time: localTime,
        recordedBy,
        notes: `Intercorrência confirmada a partir do alerta ${alert.id}`,
        incidentCategory: IncidentCategory.CLINICA,
        incidentSubtypeClinical: subtypeClinical,
        incidentSeverity,
        isEventoSentinela: false,
        isDoencaNotificavel: false,
        rdcIndicators: [] as Prisma.InputJsonValue,
        data: incidentData as Prisma.InputJsonValue,
      },
    })

    try {
      await this.notifyIncidentCreation({
        residentId: alert.residentId,
        residentName: alert.resident?.fullName || 'Residente',
        subtypeClinical,
        incidentSeverity,
        incidentRecordId: incidentRecord.id,
        actorUserId: userId,
      })
    } catch (error) {
      this.logger.error('Falha ao notificar intercorrência confirmada', {
        alertId: alert.id,
        incidentRecordId: incidentRecord.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return incidentRecord
  }

  private async notifyIncidentCreation(params: {
    residentId: string
    residentName: string
    subtypeClinical: IncidentSubtypeClinical
    incidentSeverity: IncidentSeverity
    incidentRecordId: string
    actorUserId: string
  }) {
    const {
      residentId,
      residentName,
      subtypeClinical,
      incidentSeverity,
      incidentRecordId,
      actorUserId,
    } = params

    const recipientIds =
      await this.notificationsService.getIncidentNotificationRecipients(
        this.tenantContext.tenantId,
        actorUserId,
      )

    if (recipientIds.length === 0) {
      return
    }

    const notificationSeverity =
      incidentSeverity === IncidentSeverity.GRAVE || incidentSeverity === IncidentSeverity.CRITICA
        ? NotificationSeverity.CRITICAL
        : incidentSeverity === IncidentSeverity.MODERADA
          ? NotificationSeverity.WARNING
          : NotificationSeverity.INFO

    const subtypeLabel = formatIncidentSubtype(subtypeClinical, undefined, undefined)

    await this.notificationsService.createDirectedNotification(
      this.tenantContext.tenantId,
      recipientIds,
      {
        type: SystemNotificationType.INCIDENT_CREATED,
        category: NotificationCategory.INCIDENT,
        severity: notificationSeverity,
        title: 'Intercorrência Confirmada a partir de Alerta',
        message: `${residentName}: ${subtypeLabel}`,
        actionUrl: `/dashboard/intercorrencias/${residentId}`,
        entityType: 'DAILY_RECORD',
        entityId: incidentRecordId,
        metadata: {
          residentId,
          residentName,
          subtypeClinical,
          severity: incidentSeverity,
          source: 'VITAL_SIGN_ALERT',
          sourceIncidentWorkflow: 'CONFIRMED_BY_ADMIN_RT',
        },
      },
    )
  }

  /**
   * Calcular prioridade automaticamente
   * Prioridade 0-5 (5 = mais urgente)
   */
  private calculatePriority(
    severity: string,
    type: string,
  ): number {
    // Severidade CRITICAL
    if (severity === 'CRITICAL') {
      // Hipoglicemia e hipóxia são as mais urgentes
      if (type === 'GLUCOSE_LOW' || type === 'OXYGEN_LOW') {
        return 5
      }
      // Outras críticas
      return 4
    }

    // Severidade WARNING
    if (severity === 'WARNING') {
      return 2
    }

    // Severidade INFO
    return 1
  }

  /**
   * Buscar histórico de alterações de um alerta
   * Retorna todas as mudanças em ordem cronológica para exibição ao usuário
   */
  async getHistory(alertId: string) {
    // Verificar se alerta existe
    const alert = await this.tenantContext.client.vitalSignAlert.findFirst({
      where: {
        id: alertId,
      },
    })

    if (!alert) {
      throw new NotFoundException(`Alerta ${alertId} não encontrado`)
    }

    // Buscar histórico de alterações
    const history = await this.tenantContext.client.vitalSignAlertHistory.findMany({
      where: {
        alertId,
      },
      include: {
        changedUser: {
          select: {
            id: true,
            name: true,
            profile: {
              select: {
                positionCode: true,
              },
            },
          },
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        changedAt: 'asc', // Ordem cronológica (mais antigo primeiro)
      },
    })

    // Formatar histórico para exibição
    return history.map((entry) => ({
      id: entry.id,
      changeType: entry.changeType,
      status: entry.status,
      assignedTo: entry.assignedUser
        ? {
            id: entry.assignedUser.id,
            name: entry.assignedUser.name,
          }
        : null,
      medicalNotes: entry.medicalNotes,
      actionTaken: entry.actionTaken,
      changedBy: {
        id: entry.changedUser.id,
        name: entry.changedUser.name,
        positionCode: entry.changedUser.profile?.positionCode,
      },
      changeReason: entry.changeReason,
      changedAt: entry.changedAt,
    }))
  }
}
