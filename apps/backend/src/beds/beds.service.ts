import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { TenantContextService } from '../prisma/tenant-context.service'
import { Prisma } from '@prisma/client'
import {
  CreateBedDto,
  UpdateBedDto,
  ReserveBedDto,
  BlockBedDto,
  ReleaseBedDto,
} from './dto'

/**
 * Service para gerenciamento de leitos.
 *
 * PADRÃO MULTI-TENANCY COM SCHEMA ISOLATION:
 * - Usa `tenantContext.client` para acessar dados isolados no schema do tenant
 * - NÃO recebe `tenantId` como parâmetro (schema já isola)
 * - NÃO filtra por `tenantId` nas queries (desnecessário)
 * - Usa `prisma` (public client) apenas para tabelas SHARED (Tenant, Plan, etc.)
 *
 * @see TenantContextService - Gerencia o client isolado por tenant
 * @see TenantContextInterceptor - Inicializa automaticamente o contexto
 */
@Injectable()
export class BedsService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
  ) {}

  async create(createBedDto: CreateBedDto) {
    // ✅ Validar que o room existe (usando tenant client)
    const room = await this.tenantContext.client.room.findFirst({
      where: { id: createBedDto.roomId, deletedAt: null },
    })

    if (!room) {
      throw new NotFoundException(`Quarto com ID ${createBedDto.roomId} não encontrado`)
    }

    // ✅ Verificar se o code já existe (sem filtro tenantId!)
    const existingBed = await this.tenantContext.client.bed.findFirst({
      where: { code: createBedDto.code, deletedAt: null },
    })

    if (existingBed) {
      throw new BadRequestException(`Já existe um leito com o código ${createBedDto.code}`)
    }

    return this.tenantContext.client.bed.create({
      data: {
        ...createBedDto,
        tenantId: this.tenantContext.tenantId, // Schema isolation já funciona, mas campo ainda é obrigatório
        status: createBedDto.status || 'Disponível',
      },
    })
  }

  async findAll(skip: number = 0, take: number = 50, roomId?: string, status?: string) {
    const where: Prisma.BedWhereInput = { deletedAt: null } // ✅ Sem tenantId!
    if (roomId) {
      where.roomId = roomId
    }
    if (status) {
      where.status = status
    }

    const [data, total] = await Promise.all([
      this.tenantContext.client.bed.findMany({
        where,
        include: {
          room: {
            select: {
              id: true,
              name: true,
              code: true,
              roomNumber: true,
              floorId: true,
              floor: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  buildingId: true,
                  building: {
                    select: { id: true, name: true, code: true },
                  },
                },
              },
            },
          },
        },
        skip,
        take,
        orderBy: { code: 'asc' },
      }),
      this.tenantContext.client.bed.count({ where }),
    ])

    return { data, total, skip, take }
  }

  async findOne(id: string) {
    const bed = await this.tenantContext.client.bed.findFirst({
      where: { id, deletedAt: null },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            code: true,
            roomNumber: true,
            floorId: true,
            floor: {
              select: {
                id: true,
                name: true,
                code: true,
                buildingId: true,
                building: {
                  select: { id: true, name: true, code: true },
                },
              },
            },
          },
        },
      },
    })

    if (!bed) {
      throw new NotFoundException(`Leito com ID ${id} não encontrado`)
    }

    // Se estiver ocupado, buscar o residente
    if (bed.status === 'Ocupado') {
      const resident = await this.tenantContext.client.resident.findFirst({
        where: { bedId: id, deletedAt: null },
        select: { id: true, fullName: true, status: true },
      })

      return { ...bed, resident }
    }

    return bed
  }

  async update(id: string, updateBedDto: UpdateBedDto) {
    // Validar que o bed existe
    await this.findOne(id)

    // Se está mudando o roomId, validar que o novo room existe
    if (updateBedDto.roomId) {
      const room = await this.tenantContext.client.room.findFirst({
        where: { id: updateBedDto.roomId, deletedAt: null },
      })

      if (!room) {
        throw new NotFoundException(`Quarto com ID ${updateBedDto.roomId} não encontrado`)
      }
    }

    // Se está mudando o code, validar se já não existe
    if (updateBedDto.code) {
      const existingBed = await this.tenantContext.client.bed.findFirst({
        where: {
          code: updateBedDto.code,
          id: { not: id },
          deletedAt: null,
        },
      })

      if (existingBed) {
        throw new BadRequestException(`Já existe um leito com o código ${updateBedDto.code}`)
      }
    }

    return this.tenantContext.client.bed.update({
      where: { id },
      data: updateBedDto,
    })
  }

  async remove(id: string) {
    // Validar que o bed existe
    const bed = await this.findOne(id)

    // Verificar se está ocupado
    if (bed.status === 'Ocupado') {
      throw new BadRequestException(
        'Não é possível remover um leito ocupado. Libere o leito primeiro.',
      )
    }

    return this.tenantContext.client.bed.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async getOccupancyStats() {
    const total = await this.tenantContext.client.bed.count({
      where: { deletedAt: null },
    })

    const occupied = await this.tenantContext.client.bed.count({
      where: { status: 'Ocupado', deletedAt: null },
    })

    const available = await this.tenantContext.client.bed.count({
      where: { status: 'Disponível', deletedAt: null },
    })

    const maintenance = await this.tenantContext.client.bed.count({
      where: { status: 'Manutenção', deletedAt: null },
    })

    return {
      total,
      occupied,
      available,
      maintenance,
      occupancyRate: total > 0 ? ((occupied / total) * 100).toFixed(2) : '0.00',
    }
  }

  async getFullMap(buildingId?: string) {
    const where: Prisma.BuildingWhereInput = { deletedAt: null }
    if (buildingId) {
      where.id = buildingId
    }

    const buildings = await this.tenantContext.client.building.findMany({
      where,
      include: {
        floors: {
          where: { deletedAt: null },
          orderBy: { orderIndex: 'asc' },
          include: {
            rooms: {
              where: { deletedAt: null },
              orderBy: { name: 'asc' },
              include: {
                beds: {
                  where: { deletedAt: null },
                  orderBy: { code: 'asc' },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Buscar todos os residentes que ocupam leitos
    const residents = await this.tenantContext.client.resident.findMany({
      where: {
        bedId: { not: null },
        deletedAt: null,
      },
      select: {
        id: true,
        bedId: true,
        fullName: true,
        fotoUrl: true,
      },
    })

    // Criar mapa de bedId -> resident para lookup rápido
    const residentsByBedId = new Map(
      residents.map((r) => [r.bedId, { id: r.id, fullName: r.fullName, fotoUrl: r.fotoUrl }]),
    )

    // Adicionar contagens calculadas para cada nível da hierarquia
    const buildingsWithStats = buildings.map((building) => {
      const floorsWithStats = building.floors.map((floor) => {
        const roomsWithStats = floor.rooms.map((room) => {
          // Adicionar informação do residente a cada leito
          const bedsWithResident = room.beds.map((bed) => ({
            ...bed,
            resident: residentsByBedId.get(bed.id) || null,
          }))

          const totalBeds = bedsWithResident.length
          const occupiedBeds = bedsWithResident.filter((bed) => bed.status === 'Ocupado').length

          return {
            ...room,
            beds: bedsWithResident,
            totalBeds,
            occupiedBeds,
          }
        })

        const roomsCount = roomsWithStats.length
        const bedsCount = roomsWithStats.reduce((sum, r) => sum + r.totalBeds, 0)
        const occupiedBeds = roomsWithStats.reduce((sum, r) => sum + r.occupiedBeds, 0)

        return {
          ...floor,
          rooms: roomsWithStats,
          roomsCount,
          bedsCount,
          occupiedBeds,
        }
      })

      const totalFloors = floorsWithStats.length
      const totalRooms = floorsWithStats.reduce((sum, f) => sum + f.roomsCount, 0)
      const totalBeds = floorsWithStats.reduce((sum, f) => sum + f.bedsCount, 0)
      const occupiedBeds = floorsWithStats.reduce((sum, f) => sum + f.occupiedBeds, 0)

      return {
        ...building,
        floors: floorsWithStats,
        totalFloors,
        totalRooms,
        totalBeds,
        occupiedBeds,
      }
    })

    // Calcular estatísticas globais
    const totalBuildings = buildingsWithStats.length
    const totalFloors = buildingsWithStats.reduce((sum, b) => sum + b.totalFloors, 0)
    const totalRooms = buildingsWithStats.reduce((sum, b) => sum + b.totalRooms, 0)
    const totalBeds = buildingsWithStats.reduce((sum, b) => sum + b.totalBeds, 0)
    const occupiedBeds = buildingsWithStats.reduce((sum, b) => sum + b.occupiedBeds, 0)

    // Contar leitos por status
    const bedStatuses = await this.tenantContext.client.bed.findMany({
      where: { deletedAt: null },
      select: { status: true },
    })

    const availableBeds = bedStatuses.filter((b) => b.status === 'Disponível').length
    const maintenanceBeds = bedStatuses.filter((b) => b.status === 'Manutenção').length
    const reservedBeds = bedStatuses.filter((b) => b.status === 'Reservado').length

    const stats = {
      totalBuildings,
      totalFloors,
      totalRooms,
      totalBeds,
      occupiedBeds,
      availableBeds,
      maintenanceBeds,
      reservedBeds,
    }

    return { buildings: buildingsWithStats, stats }
  }

  /**
   * Reserva um leito para futuro residente
   */
  async reserveBed(bedId: string, userId: string, reserveBedDto: ReserveBedDto) {
    // Validar que o leito existe e está disponível
    const bed = await this.tenantContext.client.bed.findFirst({
      where: { id: bedId, deletedAt: null },
    })

    if (!bed) {
      throw new NotFoundException(`Leito com ID ${bedId} não encontrado`)
    }

    if (bed.status !== 'Disponível') {
      throw new BadRequestException(
        `Leito ${bed.code} não está disponível. Status atual: ${bed.status}`,
      )
    }

    // Preparar metadata
    const metadata: Record<string, unknown> = {}
    if (reserveBedDto.futureResidentName) {
      metadata.futureResidentName = reserveBedDto.futureResidentName
    }
    if (reserveBedDto.expectedAdmissionDate) {
      metadata.expectedAdmissionDate = reserveBedDto.expectedAdmissionDate
    }

    // Preparar notes
    let notes = 'Leito reservado'
    if (reserveBedDto.futureResidentName) {
      notes += ` para ${reserveBedDto.futureResidentName}`
    }
    if (reserveBedDto.expectedAdmissionDate) {
      notes += ` - Admissão prevista: ${reserveBedDto.expectedAdmissionDate}`
    }
    if (reserveBedDto.notes) {
      notes += ` - ${reserveBedDto.notes}`
    }

    // ✅ Usar $transaction do tenant client
    return await this.tenantContext.client.$transaction(async (prisma) => {
      // Atualizar status do leito
      const updatedBed = await prisma.bed.update({
        where: { id: bedId },
        data: {
          status: 'Reservado',
          notes,
        },
      })

      // Criar registro no histórico de status
      await prisma.bedStatusHistory.create({
        data: {
          bedId,
          tenantId: this.tenantContext.tenantId,
          previousStatus: bed.status,
          newStatus: 'Reservado',
          reason: reserveBedDto.notes || notes,
          metadata: metadata as Prisma.InputJsonValue,
          changedBy: userId,
        },
      })

      return {
        bed: updatedBed,
        message: `Leito ${bed.code} reservado com sucesso`,
      }
    })
  }

  /**
   * Bloqueia um leito para manutenção
   */
  async blockBed(bedId: string, userId: string, blockBedDto: BlockBedDto) {
    // Validar que o leito existe
    const bed = await this.tenantContext.client.bed.findFirst({
      where: { id: bedId, deletedAt: null },
    })

    if (!bed) {
      throw new NotFoundException(`Leito com ID ${bedId} não encontrado`)
    }

    // Não pode bloquear leito ocupado
    if (bed.status === 'Ocupado') {
      throw new BadRequestException(
        `Leito ${bed.code} está ocupado e não pode ser bloqueado para manutenção`,
      )
    }

    // Preparar metadata
    const metadata: Record<string, unknown> = {}
    if (blockBedDto.expectedReleaseDate) {
      metadata.expectedReleaseDate = blockBedDto.expectedReleaseDate
    }

    // Preparar notes
    let notes = `Bloqueado para manutenção: ${blockBedDto.reason}`
    if (blockBedDto.expectedReleaseDate) {
      notes += ` - Previsão de liberação: ${blockBedDto.expectedReleaseDate}`
    }

    return await this.tenantContext.client.$transaction(async (prisma) => {
      // Atualizar status do leito
      const updatedBed = await prisma.bed.update({
        where: { id: bedId },
        data: {
          status: 'Manutenção',
          notes,
        },
      })

      // Criar registro no histórico de status
      await prisma.bedStatusHistory.create({
        data: {
          bedId,
          tenantId: this.tenantContext.tenantId,
          previousStatus: bed.status,
          newStatus: 'Manutenção',
          reason: blockBedDto.reason,
          metadata: metadata as Prisma.InputJsonValue,
          changedBy: userId,
        },
      })

      return {
        bed: updatedBed,
        message: `Leito ${bed.code} bloqueado para manutenção`,
      }
    })
  }

  /**
   * Libera um leito (Reservado ou Manutenção → Disponível)
   */
  async releaseBed(bedId: string, userId: string, releaseBedDto: ReleaseBedDto) {
    // Validar que o leito existe
    const bed = await this.tenantContext.client.bed.findFirst({
      where: { id: bedId, deletedAt: null },
    })

    if (!bed) {
      throw new NotFoundException(`Leito com ID ${bedId} não encontrado`)
    }

    // Só pode liberar leitos em Manutenção ou Reservado
    if (bed.status !== 'Manutenção' && bed.status !== 'Reservado') {
      throw new BadRequestException(
        `Leito ${bed.code} não pode ser liberado. Status atual: ${bed.status}`,
      )
    }

    const reason =
      releaseBedDto.reason ||
      (bed.status === 'Manutenção' ? 'Manutenção concluída' : 'Reserva cancelada')

    return await this.tenantContext.client.$transaction(async (prisma) => {
      // Atualizar status do leito
      const updatedBed = await prisma.bed.update({
        where: { id: bedId },
        data: {
          status: 'Disponível',
          notes: null, // Limpar observações ao liberar
        },
      })

      // Criar registro no histórico de status
      await prisma.bedStatusHistory.create({
        data: {
          bedId,
          tenantId: this.tenantContext.tenantId,
          previousStatus: bed.status,
          newStatus: 'Disponível',
          reason,
          metadata: undefined,
          changedBy: userId,
        },
      })

      return {
        bed: updatedBed,
        message: `Leito ${bed.code} liberado e agora está disponível`,
      }
    })
  }

  /**
   * Busca histórico de mudanças de status de um leito
   */
  async getBedStatusHistory(bedId?: string, skip: number = 0, take: number = 50) {
    const where: Record<string, unknown> = { deletedAt: null } // ✅ Sem tenantId!
    if (bedId) {
      where.bedId = bedId
    }

    const [data, total] = await Promise.all([
      this.tenantContext.client.bedStatusHistory.findMany({
        where,
        include: {
          bed: {
            select: {
              id: true,
              code: true,
              room: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  roomNumber: true,
                  floor: {
                    select: {
                      id: true,
                      name: true,
                      code: true,
                      building: {
                        select: {
                          id: true,
                          name: true,
                          code: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { changedAt: 'desc' },
        skip,
        take,
      }),
      this.tenantContext.client.bedStatusHistory.count({ where }),
    ])

    return { data, total, skip, take }
  }
}
