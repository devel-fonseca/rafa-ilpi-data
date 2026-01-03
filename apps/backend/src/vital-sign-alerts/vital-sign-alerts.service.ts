import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import {
  CreateVitalSignAlertDto,
  UpdateVitalSignAlertDto,
  QueryVitalSignAlertsDto,
} from './dto'
import { AlertStatus, Prisma } from '@prisma/client'

@Injectable()
export class VitalSignAlertsService {
  private readonly logger = new Logger(VitalSignAlertsService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Criar novo alerta médico de sinal vital
   * Usado pelo sistema quando detecta anomalias
   */
  async create(
    tenantId: string,
    dto: CreateVitalSignAlertDto,
    createdBy?: string,
  ) {
    this.logger.log(
      `Criando alerta médico: ${dto.type} para residente ${dto.residentId}`,
    )

    // Calcular prioridade automaticamente baseado na severidade
    const priority = this.calculatePriority(dto.severity, dto.type)

    // Criar alerta e primeira entrada de histórico em transação
    const alert = await this.prisma.$transaction(async (prisma) => {
      const newAlert = await prisma.vitalSignAlert.create({
        data: {
          tenantId,
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
          createdBy,
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
          changedBy: createdBy || 'SYSTEM', // Sistema se não houver usuário
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
  async findAll(tenantId: string, query: QueryVitalSignAlertsDto) {
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
      tenantId,
      ...(residentId && { residentId }),
      ...(status && { status }),
      ...(type && { type }),
      ...(severity && { severity }),
      ...(assignedTo && { assignedTo }),
    }

    // Adicionar filtro de data se fornecido
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const [alerts, total] = await Promise.all([
      this.prisma.vitalSignAlert.findMany({
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
      this.prisma.vitalSignAlert.count({ where }),
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
  async findOne(tenantId: string, id: string) {
    const alert = await this.prisma.vitalSignAlert.findFirst({
      where: {
        id,
        tenantId,
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
    tenantId: string,
    id: string,
    dto: UpdateVitalSignAlertDto,
    userId: string,
  ) {
    // Verificar se alerta existe
    const existingAlert = await this.findOne(tenantId, id)

    // Preparar dados de atualização
    const updateData: any = {}

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
    const result = await this.prisma.$transaction(async (prisma) => {
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
   * Buscar alertas ativos de um residente
   */
  async findActiveByResident(tenantId: string, residentId: string) {
    return this.prisma.vitalSignAlert.findMany({
      where: {
        tenantId,
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
  async countByStatus(tenantId: string) {
    const [active, inTreatment, monitoring, resolved, ignored] =
      await Promise.all([
        this.prisma.vitalSignAlert.count({
          where: { tenantId, status: AlertStatus.ACTIVE },
        }),
        this.prisma.vitalSignAlert.count({
          where: { tenantId, status: AlertStatus.IN_TREATMENT },
        }),
        this.prisma.vitalSignAlert.count({
          where: { tenantId, status: AlertStatus.MONITORING },
        }),
        this.prisma.vitalSignAlert.count({
          where: { tenantId, status: AlertStatus.RESOLVED },
        }),
        this.prisma.vitalSignAlert.count({
          where: { tenantId, status: AlertStatus.IGNORED },
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
  async getHistory(tenantId: string, alertId: string) {
    // Verificar se alerta existe e pertence ao tenant
    const alert = await this.prisma.vitalSignAlert.findFirst({
      where: {
        id: alertId,
        tenantId,
      },
    })

    if (!alert) {
      throw new NotFoundException(`Alerta ${alertId} não encontrado`)
    }

    // Buscar histórico de alterações
    const history = await this.prisma.vitalSignAlertHistory.findMany({
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
