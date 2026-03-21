import { Injectable, NotFoundException, BadRequestException, Scope } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { TenantContextService } from '../prisma/tenant-context.service'
import { CreateBuildingDto, UpdateBuildingDto, CreateBuildingStructureDto } from './dto'
import { generateBuildingCode, generateFloorCode, generateRoomCode, generateBedCode } from '../utils/codeGenerator'
import { EventsGateway } from '../events/events.gateway'
import { normalizeInfrastructureCode } from '../beds/bed.utils'

@Injectable({ scope: Scope.REQUEST })
export class BuildingsService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    private readonly eventsGateway: EventsGateway,
  ) {}

  private emitDashboardOverviewUpdate(
    source:
      | 'building.created'
      | 'building.updated'
      | 'building.deleted'
      | 'building.structure-created'
  ) {
    const tenantId = this.tenantContext.tenantId
    if (!tenantId) return

    this.eventsGateway.emitDashboardOverviewUpdated({
      tenantId,
      source,
    })
  }

  async create(createBuildingDto: CreateBuildingDto) {
    // Se não foi fornecido código, gera automaticamente
    let code = createBuildingDto.code ? normalizeInfrastructureCode(createBuildingDto.code) : undefined

    if (!code) {
      // Busca códigos existentes para evitar duplicados
      const existingBuildings = await this.tenantContext.client.building.findMany({
        select: { code: true }
      })
      const existingCodes = existingBuildings.map(b => b.code)

      // Gera código baseado no nome
      code = generateBuildingCode(createBuildingDto.name, existingCodes)
    }

    const existingBuilding = await this.tenantContext.client.building.findFirst({
      where: {
        code,
        deletedAt: null,
      },
    })

    if (existingBuilding) {
      throw new BadRequestException(`Já existe um prédio com o código ${code}`)
    }

    const building = await this.tenantContext.client.building.create({
      data: {
        ...createBuildingDto,
        code,
        tenantId: this.tenantContext.tenantId,
      },
    })

    this.emitDashboardOverviewUpdate('building.created')
    return building
  }

  async findAll(skip: number = 0, take: number = 50) {
    const [data, total] = await Promise.all([
      this.tenantContext.client.building.findMany({
        where: { deletedAt: null },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.tenantContext.client.building.count({
        where: { deletedAt: null },
      }),
    ])

    if (data.length === 0) {
      return { data: [], total, skip, take }
    }

    const buildingIds = data.map((building) => building.id)

    const [floorCounts, floors] = await Promise.all([
      this.tenantContext.client.floor.groupBy({
        by: ['buildingId'],
        where: {
          buildingId: { in: buildingIds },
          deletedAt: null,
        },
        _count: { _all: true },
      }),
      this.tenantContext.client.floor.findMany({
        where: {
          buildingId: { in: buildingIds },
          deletedAt: null,
        },
        select: {
          id: true,
          buildingId: true,
        },
      }),
    ])

    const floorCountByBuilding = new Map(
      floorCounts.map((item) => [item.buildingId, item._count._all] as const),
    )

    const floorToBuilding = new Map(
      floors.map((floor) => [floor.id, floor.buildingId] as const),
    )

    const floorIds = floors.map((floor) => floor.id)

    let roomCountByBuilding = new Map<string, number>()
    let roomToBuilding = new Map<string, string>()

    if (floorIds.length > 0) {
      const [roomCounts, rooms] = await Promise.all([
        this.tenantContext.client.room.groupBy({
          by: ['floorId'],
          where: {
            floorId: { in: floorIds },
            deletedAt: null,
          },
          _count: { _all: true },
        }),
        this.tenantContext.client.room.findMany({
          where: {
            floorId: { in: floorIds },
            deletedAt: null,
          },
          select: {
            id: true,
            floorId: true,
          },
        }),
      ])

      roomCountByBuilding = roomCounts.reduce((acc, item) => {
        const buildingId = floorToBuilding.get(item.floorId)
        if (!buildingId) return acc

        acc.set(buildingId, (acc.get(buildingId) ?? 0) + item._count._all)
        return acc
      }, new Map<string, number>())

      roomToBuilding = new Map(
        rooms
          .map((room) => {
            const buildingId = floorToBuilding.get(room.floorId)
            return buildingId ? ([room.id, buildingId] as const) : null
          })
          .filter((entry): entry is readonly [string, string] => entry !== null),
      )
    }

    const roomIds = Array.from(roomToBuilding.keys())
    let totalBedsByBuilding = new Map<string, number>()
    let occupiedBedsByBuilding = new Map<string, number>()

    if (roomIds.length > 0) {
      const [bedCounts, occupiedBedCounts] = await Promise.all([
        this.tenantContext.client.bed.groupBy({
          by: ['roomId'],
          where: {
            roomId: { in: roomIds },
            deletedAt: null,
          },
          _count: { _all: true },
        }),
        this.tenantContext.client.bed.groupBy({
          by: ['roomId'],
          where: {
            roomId: { in: roomIds },
            status: 'Ocupado',
            deletedAt: null,
          },
          _count: { _all: true },
        }),
      ])

      totalBedsByBuilding = bedCounts.reduce((acc, item) => {
        const buildingId = roomToBuilding.get(item.roomId)
        if (!buildingId) return acc

        acc.set(buildingId, (acc.get(buildingId) ?? 0) + item._count._all)
        return acc
      }, new Map<string, number>())

      occupiedBedsByBuilding = occupiedBedCounts.reduce((acc, item) => {
        const buildingId = roomToBuilding.get(item.roomId)
        if (!buildingId) return acc

        acc.set(buildingId, (acc.get(buildingId) ?? 0) + item._count._all)
        return acc
      }, new Map<string, number>())
    }

    const enriched = data.map((building) => {
      const totalFloors = floorCountByBuilding.get(building.id) ?? 0
      const totalRooms = roomCountByBuilding.get(building.id) ?? 0
      const totalBeds = totalBedsByBuilding.get(building.id) ?? 0
      const occupiedBeds = occupiedBedsByBuilding.get(building.id) ?? 0

      return {
        ...building,
        totalFloors,
        totalRooms,
        totalBeds,
        occupiedBeds,
        availableBeds: totalBeds - occupiedBeds,
      }
    })

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
    const existing = await this.findOne(id)

    const data = { ...updateBuildingDto }
    if (updateBuildingDto.code !== undefined) {
      data.code = normalizeInfrastructureCode(updateBuildingDto.code)
    }

    const nextCode = data.code ?? existing.code

    const duplicateBuilding = await this.tenantContext.client.building.findFirst({
      where: {
        id: { not: id },
        code: nextCode,
        deletedAt: null,
      },
    })

    if (duplicateBuilding) {
      throw new BadRequestException(`Já existe um prédio com o código ${nextCode}`)
    }

    const building = await this.tenantContext.client.building.update({
      where: { id },
      data,
    })

    this.emitDashboardOverviewUpdate('building.updated')
    return building
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

    const building = await this.tenantContext.client.building.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    this.emitDashboardOverviewUpdate('building.deleted')
    return building
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

  async createBuildingStructure(data: CreateBuildingStructureDto) {
    try {
      // Validação de dados de entrada
      if (!data.buildingName || !data.floors || data.floors.length === 0) {
        throw new BadRequestException(
          'buildingName e floors são obrigatórios'
        )
      }

      // Usar buildingCode fornecido ou gerar automaticamente
      let buildingCode = data.buildingCode ? normalizeInfrastructureCode(data.buildingCode) : undefined

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

      const result = {
        building,
        floors: floorsCreated,
        rooms: roomsCreated,
        beds: bedsCreated,
      }

      this.emitDashboardOverviewUpdate('building.structure-created')
      return result
    } catch (error) {
      // Re-lançar erro com mensagem amigável
      if (error instanceof BadRequestException) {
        throw error
      }

      const errorMessage = error instanceof Error ? error.message : 'erro desconhecido'
      throw new BadRequestException(
        `Erro ao criar estrutura: ${errorMessage}`
      )
    }
  }
}
