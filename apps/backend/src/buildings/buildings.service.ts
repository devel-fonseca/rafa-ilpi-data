import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateBuildingDto, UpdateBuildingDto } from './dto'

@Injectable()
export class BuildingsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createBuildingDto: CreateBuildingDto) {
    // Gerar código automaticamente se não fornecido
    const code = createBuildingDto.code || `PRED-${Date.now().toString().slice(-6)}`

    return this.prisma.building.create({
      data: {
        ...createBuildingDto,
        code,
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
            floor: {
              buildingId: building.id,
              deletedAt: null
            },
            deletedAt: null,
          },
        })

        const beds = await this.prisma.bed.count({
          where: {
            tenantId,
            room: {
              floor: {
                buildingId: building.id,
                deletedAt: null
              },
              deletedAt: null,
            },
            deletedAt: null,
          },
        })

        const occupiedBeds = await this.prisma.bed.count({
          where: {
            tenantId,
            status: 'Ocupado',
            room: {
              floor: {
                buildingId: building.id,
                deletedAt: null
              },
              deletedAt: null,
            },
            deletedAt: null,
          },
        })

        return {
          ...building,
          totalFloors: building._count.floors,
          totalRooms: rooms,
          totalBeds: beds,
          occupiedBeds,
          availableBeds: beds - occupiedBeds,
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

  async createBuildingStructure(tenantId: string, data: any) {
    try {
      // Validação de dados de entrada
      if (!data.buildingName || !data.floors || data.floors.length === 0) {
        throw new BadRequestException(
          'buildingName e floors são obrigatórios'
        )
      }

      // Criar prédio
      const building = await this.prisma.building.create({
        data: {
          name: data.buildingName,
          code: `PRED-${Date.now().toString().slice(-6)}`,
          tenantId,
        },
      })

      // Armazenar arrays de criação
      const floorsCreated = []
      const roomsCreated = []
      const bedsCreated = []

      // Criar andares, quartos e leitos
      for (const floorConfig of data.floors) {
        if (!floorConfig.floorNumber && floorConfig.floorNumber !== 0) {
          throw new BadRequestException('floorNumber é obrigatório para cada andar')
        }

        const floor = await this.prisma.floor.create({
          data: {
            buildingId: building.id,
            tenantId,
            name: `Andar ${floorConfig.floorNumber}`,
            code: `PISO-${building.id.substring(0, 8)}-${floorConfig.floorNumber.toString().padStart(2, '0')}`,
            orderIndex: floorConfig.floorNumber,
          },
        })

        floorsCreated.push(floor)

        // Contador para gerar IDs sequenciais de quartos por andar
        let roomIndexPerFloor = 0

        for (const roomConfig of floorConfig.rooms || []) {
          roomIndexPerFloor++
          const room = await this.prisma.room.create({
            data: {
              floorId: floor.id,
              tenantId,
              name: roomConfig.roomName,
              code: `${building.id.substring(0, 8)}-${floorConfig.floorNumber.toString().padStart(2, '0')}-${roomIndexPerFloor.toString().padStart(3, '0')}`,
              roomNumber: roomConfig.roomName,
              capacity: roomConfig.bedCount,
              roomType: roomConfig.bedCount === 1 ? 'Individual' : roomConfig.bedCount === 2 ? 'Duplo' : 'Coletivo',
              hasPrivateBathroom: roomConfig.hasPrivateBathroom || false,
              accessible: roomConfig.isAccessible || false,
            },
          })

          roomsCreated.push(room)

          for (const bedConfig of roomConfig.beds || []) {
            const bed = await this.prisma.bed.create({
              data: {
                roomId: room.id,
                tenantId,
                code: bedConfig.code,
                status: 'Disponível',
              },
            })

            bedsCreated.push(bed)
          }
        }
      }

      return {
        building,
        floors: floorsCreated,
        rooms: roomsCreated,
        beds: bedsCreated,
      }
    } catch (error: any) {
      // Log do erro completo para debug
      console.error('Error in createBuildingStructure:', {
        message: error.message,
        code: error.code,
        details: error.meta,
      })

      // Re-lançar erro com mensagem amigável
      if (error instanceof BadRequestException) {
        throw error
      }

      throw new BadRequestException(
        `Erro ao criar estrutura: ${error.message || 'erro desconhecido'}`
      )
    }
  }
}
