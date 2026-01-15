import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { TenantContextService } from '../prisma/tenant-context.service'
import { CreateBuildingDto, UpdateBuildingDto } from './dto'
import { generateBuildingCode, generateFloorCode, generateRoomCode, generateBedCode } from '../utils/codeGenerator'

@Injectable()
export class BuildingsService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
  ) {}

  async create(createBuildingDto: CreateBuildingDto) {
    // Se não foi fornecido código, gera automaticamente
    let code = createBuildingDto.code

    if (!code) {
      // Busca códigos existentes para evitar duplicados
      const existingBuildings = await this.tenantContext.client.building.findMany({
        select: { code: true }
      })
      const existingCodes = existingBuildings.map(b => b.code)

      // Gera código baseado no nome
      code = generateBuildingCode(createBuildingDto.name, existingCodes)
    }

    return this.tenantContext.client.building.create({
      data: {
        ...createBuildingDto,
        code,
        tenantId: this.tenantContext.tenantId,
      },
    })
  }

  async findAll(skip: number = 0, take: number = 50) {
    const [data, total] = await Promise.all([
      this.tenantContext.client.building.findMany({
        where: { deletedAt: null },
        include: {
          _count: {
            select: { floors: true },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.tenantContext.client.building.count({
        where: { deletedAt: null },
      }),
    ])

    // Enriquecer com contagem de quartos e leitos
    const enriched = await Promise.all(
      data.map(async (building: any) => {
        const rooms = await this.tenantContext.client.room.count({
          where: {
            floor: {
              buildingId: building.id,
              deletedAt: null
            },
            deletedAt: null,
          },
        })

        const beds = await this.tenantContext.client.bed.count({
          where: {
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

        const occupiedBeds = await this.tenantContext.client.bed.count({
          where: {
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

  async findOne(id: string) {
    const building = await this.tenantContext.client.building.findFirst({
      where: { id, deletedAt: null },
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

  async update(id: string, updateBuildingDto: UpdateBuildingDto) {
    // Validar que o building existe
    await this.findOne(id)

    return this.tenantContext.client.building.update({
      where: { id },
      data: updateBuildingDto,
    })
  }

  async remove(id: string) {
    // Validar que o building existe
    await this.findOne(id)

    // Verificar se tem andares ativos
    const activeFloors = await this.tenantContext.client.floor.count({
      where: { buildingId: id, deletedAt: null },
    })

    if (activeFloors > 0) {
      throw new BadRequestException(
        'Não é possível remover um prédio com andares. Remova os andares primeiro.'
      )
    }

    return this.tenantContext.client.building.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async getStats() {
    const buildings = await this.tenantContext.client.building.count({
      where: { deletedAt: null },
    })

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

    const availableBeds = await this.tenantContext.client.bed.count({
      where: { status: 'Disponível', deletedAt: null },
    })

    const maintenanceBeds = await this.tenantContext.client.bed.count({
      where: { status: 'Manutenção', deletedAt: null },
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

  async createBuildingStructure(data: any) {
    try {
      // Validação de dados de entrada
      if (!data.buildingName || !data.floors || data.floors.length === 0) {
        throw new BadRequestException(
          'buildingName e floors são obrigatórios'
        )
      }

      // Usar buildingCode fornecido ou gerar automaticamente
      let buildingCode = data.buildingCode

      if (!buildingCode) {
        // Buscar códigos de prédios existentes
        const existingBuildings = await this.tenantContext.client.building.findMany({
          select: { code: true }
        })
        const existingBuildingCodes = existingBuildings.map(b => b.code)
        buildingCode = generateBuildingCode(data.buildingName, existingBuildingCodes)
      }

      // Criar prédio
      const building = await this.tenantContext.client.building.create({
        data: {
          name: data.buildingName,
          code: buildingCode,
          tenantId: this.tenantContext.tenantId,
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

        const floorName = floorConfig.floorNumber === 0
          ? 'Térreo'
          : `${floorConfig.floorNumber}º Andar`

        // Usar floorCode fornecido ou gerar automaticamente
        const floorCode = floorConfig.floorCode || generateFloorCode(floorName, floorConfig.floorNumber)

        const floor = await this.tenantContext.client.floor.create({
          data: {
            buildingId: building.id,
            tenantId: this.tenantContext.tenantId,
            name: floorName,
            code: floorCode,
            orderIndex: floorConfig.floorNumber,
          },
        })

        floorsCreated.push(floor)

        // Coletar códigos de quartos existentes no andar
        const existingRoomCodes: string[] = []

        for (const roomConfig of floorConfig.rooms || []) {
          // Usar roomCode fornecido ou gerar automaticamente
          const roomCode = roomConfig.roomCode || generateRoomCode(
            roomConfig.roomName,
            existingRoomCodes
          )
          existingRoomCodes.push(roomCode) // Adicionar para evitar duplicação no mesmo lote

          const room = await this.tenantContext.client.room.create({
            data: {
              floorId: floor.id,
              tenantId: this.tenantContext.tenantId,
              name: roomConfig.roomName,
              code: roomCode,
              roomNumber: roomConfig.roomName,
              capacity: roomConfig.bedCount,
              roomType: roomConfig.bedCount === 1 ? 'Individual' : roomConfig.bedCount === 2 ? 'Duplo' : 'Coletivo',
              hasPrivateBathroom: roomConfig.hasPrivateBathroom || false,
              accessible: roomConfig.isAccessible || false,
            },
          })

          roomsCreated.push(room)

          // Coletar códigos de leitos existentes no quarto
          const existingBedCodes: string[] = []
          let bedIndex = 0

          for (const bedConfig of roomConfig.beds || []) {
            bedIndex++
            // Usar código fornecido ou gerar automaticamente (A, B, C... ou 01, 02, 03...)
            const bedCode = bedConfig.code || generateBedCode(
              `Leito ${bedIndex}`,
              existingBedCodes,
              bedIndex,
              true // usar letras (A, B, C...)
            )

            // Gerar código completo único: {buildingCode}{floorCode}-{roomCode}-{bedCode}
            // Exemplo: CT-001-A, CT-001-B, CT-002-A
            const fullBedCode = `${buildingCode}${floorCode}-${roomCode}-${bedCode}`
            existingBedCodes.push(fullBedCode)

            const bed = await this.tenantContext.client.bed.create({
              data: {
                roomId: room.id,
                tenantId: this.tenantContext.tenantId,
                code: fullBedCode,
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
