import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

// Referência global para NotificationsService (será injetada)
let notificationsServiceInstance: any = null

export function setNotificationsService(service: any) {
  notificationsServiceInstance = service
}

export interface CreateVitalSignInput {
  tenantId: string
  residentId: string
  userId: string
  timestamp: Date
  systolicBloodPressure?: number
  diastolicBloodPressure?: number
  temperature?: number
  heartRate?: number
  oxygenSaturation?: number
  bloodGlucose?: number
}

export interface UpdateVitalSignInput {
  systolicBloodPressure?: number
  diastolicBloodPressure?: number
  temperature?: number
  heartRate?: number
  oxygenSaturation?: number
  bloodGlucose?: number
}

/**
 * Cria um novo registro de sinais vitais
 * Este método é chamado automaticamente quando um registro de monitoramento é criado
 */
export async function createVitalSign(data: CreateVitalSignInput) {
  const vitalSign = await prisma.vitalSign.create({
    data: {
      id: undefined, // UUID gerado automaticamente
      tenantId: data.tenantId,
      residentId: data.residentId,
      userId: data.userId,
      timestamp: data.timestamp,
      systolicBloodPressure: data.systolicBloodPressure || null,
      diastolicBloodPressure: data.diastolicBloodPressure || null,
      temperature: data.temperature || null,
      heartRate: data.heartRate || null,
      oxygenSaturation: data.oxygenSaturation || null,
      bloodGlucose: data.bloodGlucose || null,
    },
    include: {
      resident: {
        select: {
          fullName: true,
          status: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })

  // Detectar anomalias e criar notificações
  if (notificationsServiceInstance) {
    try {
      const residentName = vitalSign.resident?.fullName || 'Residente'

      // Pressão Arterial anormal (Sistólica)
      if (data.systolicBloodPressure) {
        if (data.systolicBloodPressure >= 140 || data.systolicBloodPressure < 90) {
          await notificationsServiceInstance.create(data.tenantId, {
            type: 'VITAL_SIGN_ABNORMAL_BP',
            category: 'VITAL_SIGN',
            severity: data.systolicBloodPressure >= 160 || data.systolicBloodPressure < 80 ? 'CRITICAL' : 'WARNING',
            title: 'Pressão Arterial Anormal',
            message: `Pressão arterial sistólica anormal detectada para ${residentName}: ${data.systolicBloodPressure} mmHg`,
            actionUrl: `/dashboard/residentes/${data.residentId}`,
            entityType: 'VITAL_SIGN',
            entityId: vitalSign.id,
            metadata: {
              residentName,
              vitalType: 'Pressão Arterial Sistólica',
              value: `${data.systolicBloodPressure} mmHg`,
            },
          })
        }
      }

      // Glicemia anormal
      if (data.bloodGlucose) {
        if (data.bloodGlucose >= 200 || data.bloodGlucose < 70) {
          await notificationsServiceInstance.create(data.tenantId, {
            type: 'VITAL_SIGN_ABNORMAL_GLUCOSE',
            category: 'VITAL_SIGN',
            severity: data.bloodGlucose >= 250 || data.bloodGlucose < 50 ? 'CRITICAL' : 'WARNING',
            title: 'Glicemia Anormal',
            message: `Glicemia anormal detectada para ${residentName}: ${data.bloodGlucose} mg/dL`,
            actionUrl: `/dashboard/residentes/${data.residentId}`,
            entityType: 'VITAL_SIGN',
            entityId: vitalSign.id,
            metadata: {
              residentName,
              vitalType: 'Glicemia',
              value: `${data.bloodGlucose} mg/dL`,
            },
          })
        }
      }

      // Temperatura anormal
      if (data.temperature) {
        if (data.temperature >= 37.5 || data.temperature < 35.5) {
          await notificationsServiceInstance.create(data.tenantId, {
            type: 'VITAL_SIGN_ABNORMAL_TEMPERATURE',
            category: 'VITAL_SIGN',
            severity: data.temperature >= 38.5 || data.temperature < 35 ? 'CRITICAL' : 'WARNING',
            title: 'Temperatura Anormal',
            message: `Temperatura anormal detectada para ${residentName}: ${data.temperature}°C`,
            actionUrl: `/dashboard/residentes/${data.residentId}`,
            entityType: 'VITAL_SIGN',
            entityId: vitalSign.id,
            metadata: {
              residentName,
              vitalType: 'Temperatura',
              value: `${data.temperature}°C`,
            },
          })
        }
      }

      // Frequência cardíaca anormal
      if (data.heartRate) {
        if (data.heartRate >= 100 || data.heartRate < 60) {
          await notificationsServiceInstance.create(data.tenantId, {
            type: 'VITAL_SIGN_ABNORMAL_HEART_RATE',
            category: 'VITAL_SIGN',
            severity: data.heartRate >= 120 || data.heartRate < 50 ? 'CRITICAL' : 'WARNING',
            title: 'Frequência Cardíaca Anormal',
            message: `Frequência cardíaca anormal detectada para ${residentName}: ${data.heartRate} bpm`,
            actionUrl: `/dashboard/residentes/${data.residentId}`,
            entityType: 'VITAL_SIGN',
            entityId: vitalSign.id,
            metadata: {
              residentName,
              vitalType: 'Frequência Cardíaca',
              value: `${data.heartRate} bpm`,
            },
          })
        }
      }

      // Saturação de oxigênio baixa
      if (data.oxygenSaturation) {
        if (data.oxygenSaturation < 92) {
          await notificationsServiceInstance.create(data.tenantId, {
            type: 'VITAL_SIGN_ABNORMAL_RESPIRATORY_RATE',
            category: 'VITAL_SIGN',
            severity: data.oxygenSaturation < 88 ? 'CRITICAL' : 'WARNING',
            title: 'Saturação de Oxigênio Baixa',
            message: `Saturação de oxigênio baixa detectada para ${residentName}: ${data.oxygenSaturation}%`,
            actionUrl: `/dashboard/residentes/${data.residentId}`,
            entityType: 'VITAL_SIGN',
            entityId: vitalSign.id,
            metadata: {
              residentName,
              vitalType: 'Saturação de Oxigênio',
              value: `${data.oxygenSaturation}%`,
            },
          })
        }
      }
    } catch (error) {
      // Não falhar a criação do sinal vital se notificações falharem
      console.error('Error creating vital sign notifications:', error)
    }
  }

  return vitalSign
}

/**
 * Atualiza um registro de sinais vitais existente
 * Este método é chamado automaticamente quando um registro de monitoramento é editado
 */
export async function updateVitalSignByTimestamp(
  tenantId: string,
  residentId: string,
  timestamp: Date,
  data: UpdateVitalSignInput,
) {
  // Buscar o registro existente
  const existing = await prisma.vitalSign.findFirst({
    where: {
      tenantId,
      residentId,
      timestamp,
      deletedAt: null,
    },
  })

  if (!existing) {
    throw new Error('Registro de sinais vitais não encontrado')
  }

  // Atualizar
  return await prisma.vitalSign.update({
    where: {
      id: existing.id,
    },
    data: {
      systolicBloodPressure: data.systolicBloodPressure ?? existing.systolicBloodPressure,
      diastolicBloodPressure: data.diastolicBloodPressure ?? existing.diastolicBloodPressure,
      temperature: data.temperature ?? existing.temperature,
      heartRate: data.heartRate ?? existing.heartRate,
      oxygenSaturation: data.oxygenSaturation ?? existing.oxygenSaturation,
      bloodGlucose: data.bloodGlucose ?? existing.bloodGlucose,
    },
  })
}

/**
 * Soft delete de um registro de sinais vitais
 */
export async function deleteVitalSignByTimestamp(
  tenantId: string,
  residentId: string,
  timestamp: Date,
) {
  const existing = await prisma.vitalSign.findFirst({
    where: {
      tenantId,
      residentId,
      timestamp,
      deletedAt: null,
    },
  })

  if (!existing) {
    return null // Registro não existe ou já foi deletado
  }

  return await prisma.vitalSign.update({
    where: {
      id: existing.id,
    },
    data: {
      deletedAt: new Date(),
    },
  })
}

/**
 * Buscar sinais vitais de um residente em um período
 */
export async function getVitalSignsByResident(
  residentId: string,
  tenantId: string,
  startDate?: Date,
  endDate?: Date,
) {
  const where: Prisma.VitalSignWhereInput = {
    tenantId,
    residentId,
    deletedAt: null,
  }

  if (startDate || endDate) {
    where.timestamp = {}
    if (startDate) where.timestamp.gte = startDate
    if (endDate) where.timestamp.lte = endDate
  }

  return await prisma.vitalSign.findMany({
    where,
    orderBy: {
      timestamp: 'desc',
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  })
}

/**
 * Buscar último registro de sinais vitais de um residente
 */
export async function getLastVitalSign(residentId: string, tenantId: string) {
  return await prisma.vitalSign.findFirst({
    where: {
      tenantId,
      residentId,
      deletedAt: null,
    },
    orderBy: {
      timestamp: 'desc',
    },
  })
}
