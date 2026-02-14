import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { TenantContextService } from '../prisma/tenant-context.service'
import { CreateFloorDto, UpdateFloorDto } from './dto'
import { Prisma } from '@prisma/client'
import { EventsGateway } from '../events/events.gateway'

@Injectable()
export class FloorsService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    private readonly eventsGateway: EventsGateway,
  ) {}

  private emitDashboardOverviewUpdate(source: 'floor.created' | 'floor.updated' | 'floor.deleted') {
    const tenantId = this.tenantContext.tenantId
    if (!tenantId) return

    this.eventsGateway.emitDashboardOverviewUpdated({
      tenantId,
      source,
    })
  }

  async create(createFloorDto: CreateFloorDto) {
    // Validar que o building existe
    const building = await this.tenantContext.client.building.findFirst({
      where: { id: createFloorDto.buildingId, deletedAt: null },
    })

    if (!building) {
      throw new NotFoundException(
        `Prédio com ID ${createFloorDto.buildingId} não encontrado`
      )
    }

    const floor = await this.tenantContext.client.floor.create({
      data: {
        name: createFloorDto.name,
        code: createFloorDto.code,
        orderIndex: createFloorDto.floorNumber,
        buildingId: createFloorDto.buildingId,
        description: createFloorDto.description,
        isActive: createFloorDto.isActive,
        tenantId: this.tenantContext.tenantId,
      },
    })

    this.emitDashboardOverviewUpdate('floor.created')
    return floor
  }

  async findAll(
    skip: number = 0,
    take: number = 50,
    buildingId?: string
  ) {
    const where: Prisma.FloorWhereInput = { deletedAt: null }
    if (buildingId) {
      where.buildingId = buildingId
    }

    const [data, total] = await Promise.all([
      this.tenantContext.client.floor.findMany({
        where,
        include: {
          building: {
            select: { id: true, name: true },
          },
          rooms: {
            where: { deletedAt: null },
            select: { id: true },
          },
        },
        skip,
        take,
        orderBy: [{ buildingId: 'asc' }, { orderIndex: 'asc' }],
      }),
      this.tenantContext.client.floor.count({ where }),
    ])

    // Enriquecer com contagem de quartos e leitos
    const enriched = await Promise.all(
      data.map(async (floor) => {
        const beds = await this.tenantContext.client.bed.count({
          where: {
            room: {
              floorId: floor.id,
              deletedAt: null
            },
            deletedAt: null,
          },
        })

        const occupiedBeds = await this.tenantContext.client.bed.count({
          where: {
            status: 'Ocupado',
            room: {
              floorId: floor.id,
              deletedAt: null
            },
            deletedAt: null,
          },
        })

        return {
          ...floor,
          floorNumber: floor.orderIndex,
          roomsCount: floor.rooms.length,
          bedsCount: beds,
          occupiedBeds,
          availableBeds: beds - occupiedBeds,
          rooms: undefined,
        }
      })
    )

    return { data: enriched, total, skip, take }
  }

  async findOne(id: string) {
    const floor = await this.tenantContext.client.floor.findFirst({
      where: { id, deletedAt: null },
      include: {
        building: {
          select: { id: true, name: true },
        },
        rooms: {
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
        },
      },
    })

    if (!floor) {
      throw new NotFoundException(`Andar com ID ${id} não encontrado`)
    }

    return floor
  }

  async update(id: string, updateFloorDto: UpdateFloorDto) {
    // Validar que o floor existe
    await this.findOne(id)

    // Se está mudando o buildingId, validar que o novo building existe
    if (updateFloorDto.buildingId) {
      const building = await this.tenantContext.client.building.findFirst({
        where: { id: updateFloorDto.buildingId, deletedAt: null },
      })

      if (!building) {
        throw new NotFoundException(
          `Prédio com ID ${updateFloorDto.buildingId} não encontrado`
        )
      }
    }

    // Mapear floorNumber para orderIndex se fornecido
    const dataToUpdate: Prisma.FloorUpdateInput = { ...updateFloorDto }
    if (updateFloorDto.floorNumber !== undefined) {
      dataToUpdate.orderIndex = updateFloorDto.floorNumber
      delete (dataToUpdate as Record<string, unknown>).floorNumber
    }

    const floor = await this.tenantContext.client.floor.update({
      where: { id },
      data: dataToUpdate,
    })

    this.emitDashboardOverviewUpdate('floor.updated')
    return floor
  }

  async remove(id: string) {
    // Validar que o floor existe
    await this.findOne(id)

    // Verificar se tem quartos ativos
    const activeRooms = await this.tenantContext.client.room.count({
      where: { floorId: id, deletedAt: null },
    })

    if (activeRooms > 0) {
      throw new BadRequestException(
        'Não é possível remover um andar com quartos. Remova os quartos primeiro.'
      )
    }

    const floor = await this.tenantContext.client.floor.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    this.emitDashboardOverviewUpdate('floor.deleted')
    return floor
  }

  async getStats() {
    const floors = await this.tenantContext.client.floor.count({
      where: { deletedAt: null },
    })

    const rooms = await this.tenantContext.client.room.count({
      where: { deletedAt: null },
    })

    const beds = await this.tenantContext.client.bed.count({
      where: { deletedAt: null },
    })

    const occupiedBeds = await this.tenantContext.client.bed.count({
      where: { status: 'Ocupado', deletedAt: null },
    })

    return {
      floors,
      rooms,
      beds,
      occupiedBeds,
      occupancyRate: beds > 0 ? ((occupiedBeds / beds) * 100).toFixed(2) : '0.00',
    }
  }
}
