import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateBuildingDto, UpdateBuildingDto } from './dto'

@Injectable()
export class BuildingsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createBuildingDto: CreateBuildingDto) {
    return this.prisma.building.create({
      data: {
        ...createBuildingDto,
        tenantId,
      },
    })
  }

  async findAll(tenantId: string, skip: number = 0, take: number = 50) {
    const [data, total] = await Promise.all([
      this.prisma.building.findMany({
        where: { tenantId, deletedAt: null },
        include: {
          _count: {
            select: { floors: true },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.building.count({
        where: { tenantId, deletedAt: null },
      }),
    ])

    // Enriquecer com contagem de quartos e leitos
    const enriched = await Promise.all(
      data.map(async (building: any) => {
        const rooms = await this.prisma.room.count({
          where: {
            tenantId,
            floor: { buildingId: building.id, deletedAt: null },
            deletedAt: null,
          },
        })

        const beds = await this.prisma.bed.count({
          where: {
            tenantId,
            room: {
              floor: { buildingId: building.id, deletedAt: null },
              deletedAt: null,
            },
            deletedAt: null,
          },
        })

        return {
          ...building,
          floorsCount: building._count.floors,
          roomsCount: rooms,
          bedsCount: beds,
          _count: undefined,
        }
      })
    )

    return { data: enriched, total, skip, take }
  }

  async findOne(tenantId: string, id: string) {
    const building = await this.prisma.building.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        floors: {
          where: { deletedAt: null },
          orderBy: { orderIndex: 'asc' },
        },
      },
    })

    if (!building) {
      throw new NotFoundException(`Prédio com ID ${id} não encontrado`)
    }

    return building
  }

  async update(tenantId: string, id: string, updateBuildingDto: UpdateBuildingDto) {
    // Validar que o building existe
    await this.findOne(tenantId, id)

    return this.prisma.building.update({
      where: { id },
      data: updateBuildingDto,
    })
  }

  async remove(tenantId: string, id: string) {
    // Validar que o building existe
    const building = await this.findOne(tenantId, id)

    // Verificar se tem andares ativos
    const activeFloors = await this.prisma.floor.count({
      where: { buildingId: id, deletedAt: null },
    })

    if (activeFloors > 0) {
      throw new BadRequestException(
        'Não é possível remover um prédio com andares. Remova os andares primeiro.'
      )
    }

    return this.prisma.building.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async getStats(tenantId: string) {
    const buildings = await this.prisma.building.count({
      where: { tenantId, deletedAt: null },
    })

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

    const availableBeds = await this.prisma.bed.count({
      where: { tenantId, status: 'Disponível', deletedAt: null },
    })

    const maintenanceBeds = await this.prisma.bed.count({
      where: { tenantId, status: 'Manutenção', deletedAt: null },
    })

    return {
      buildings,
      floors,
      rooms,
      beds,
      occupiedBeds,
      availableBeds,
      maintenanceBeds,
      occupancyRate: beds > 0 ? ((occupiedBeds / beds) * 100).toFixed(2) : '0.00',
    }
  }
}
