import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateFloorDto, UpdateFloorDto } from './dto'

@Injectable()
export class FloorsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createFloorDto: CreateFloorDto) {
    // Validar que o building existe
    const building = await this.prisma.building.findFirst({
      where: { id: createFloorDto.buildingId, tenantId, deletedAt: null },
    })

    if (!building) {
      throw new NotFoundException(
        `Prédio com ID ${createFloorDto.buildingId} não encontrado`
      )
    }

    return this.prisma.floor.create({
      data: {
        name: createFloorDto.name,
        code: createFloorDto.code,
        orderIndex: createFloorDto.floorNumber,
        buildingId: createFloorDto.buildingId,
        description: createFloorDto.description,
        isActive: createFloorDto.isActive,
        tenantId,
      },
    })
  }

  async findAll(
    tenantId: string,
    skip: number = 0,
    take: number = 50,
    buildingId?: string
  ) {
    const where: any = { tenantId, deletedAt: null }
    if (buildingId) {
      where.buildingId = buildingId
    }

    const [data, total] = await Promise.all([
      this.prisma.floor.findMany({
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
      this.prisma.floor.count({ where }),
    ])

    // Enriquecer com contagem de quartos e leitos
    const enriched = await Promise.all(
      data.map(async (floor: any) => {
        const beds = await this.prisma.bed.count({
          where: {
            tenantId,
            room: {
              floorId: floor.id,
              deletedAt: null
            },
            deletedAt: null,
          },
        })

        const occupiedBeds = await this.prisma.bed.count({
          where: {
            tenantId,
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

  async findOne(tenantId: string, id: string) {
    const floor = await this.prisma.floor.findFirst({
      where: { id, tenantId, deletedAt: null },
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

  async update(tenantId: string, id: string, updateFloorDto: UpdateFloorDto) {
    // Validar que o floor existe
    await this.findOne(tenantId, id)

    // Se está mudando o buildingId, validar que o novo building existe
    if (updateFloorDto.buildingId) {
      const building = await this.prisma.building.findFirst({
        where: { id: updateFloorDto.buildingId, tenantId, deletedAt: null },
      })

      if (!building) {
        throw new NotFoundException(
          `Prédio com ID ${updateFloorDto.buildingId} não encontrado`
        )
      }
    }

    // Mapear floorNumber para orderIndex se fornecido
    const dataToUpdate: any = { ...updateFloorDto }
    if (updateFloorDto.floorNumber !== undefined) {
      dataToUpdate.orderIndex = updateFloorDto.floorNumber
      delete dataToUpdate.floorNumber
    }

    return this.prisma.floor.update({
      where: { id },
      data: dataToUpdate,
    })
  }

  async remove(tenantId: string, id: string) {
    // Validar que o floor existe
    await this.findOne(tenantId, id)

    // Verificar se tem quartos ativos
    const activeRooms = await this.prisma.room.count({
      where: { floorId: id, deletedAt: null },
    })

    if (activeRooms > 0) {
      throw new BadRequestException(
        'Não é possível remover um andar com quartos. Remova os quartos primeiro.'
      )
    }

    return this.prisma.floor.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async getStats(tenantId: string) {
    const floors = await this.prisma.floor.count({
      where: { tenantId, deletedAt: null },
    })

    const rooms = await this.prisma.room.count({
      where: { tenantId, deletedAt: null },
    })

    const beds = await this.prisma.bed.count({
      where: { tenantId, deletedAt: null },
    })

    const occupiedBeds = await this.prisma.bed.count({
      where: { tenantId, status: 'Ocupado', deletedAt: null },
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
