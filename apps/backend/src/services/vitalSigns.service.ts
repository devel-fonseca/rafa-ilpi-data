import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

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
  return await prisma.vitalSign.create({
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
