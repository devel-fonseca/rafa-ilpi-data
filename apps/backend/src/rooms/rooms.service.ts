import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { TenantContextService } from '../prisma/tenant-context.service'
import { CreateRoomDto, UpdateRoomDto } from './dto'
import { EventsGateway } from '../events/events.gateway'

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    private readonly eventsGateway: EventsGateway,
  ) {}

  private emitDashboardOverviewUpdate(source: 'room.created' | 'room.updated' | 'room.deleted') {
    const tenantId = this.tenantContext.tenantId
    if (!tenantId) return

    this.eventsGateway.emitDashboardOverviewUpdated({
      tenantId,
      source,
    })
  }

  async create(createRoomDto: CreateRoomDto) {
    // Validar que o floor existe
    const floor = await this.tenantContext.client.floor.findFirst({
      where: { id: createRoomDto.floorId, deletedAt: null },
    })

    if (!floor) {
      throw new NotFoundException(`Andar com ID ${createRoomDto.floorId} não encontrado`)
    }

    const room = await this.tenantContext.client.room.create({
      data: {
        name: createRoomDto.name,
        code: createRoomDto.code,
        roomNumber: createRoomDto.roomNumber,
        capacity: createRoomDto.capacity,
        roomType: createRoomDto.roomType,
        hasPrivateBathroom: createRoomDto.hasPrivateBathroom,
        accessible: createRoomDto.accessible,
        observations: createRoomDto.observations,
        genderRestriction: createRoomDto.genderRestriction,
        hasBathroom: createRoomDto.hasBathroom,
        notes: createRoomDto.notes,
        floorId: createRoomDto.floorId,
        tenantId: this.tenantContext.tenantId,
      },
    })

    this.emitDashboardOverviewUpdate('room.created')
    return room
  }

  async findAll(
    skip: number = 0,
    take: number = 50,
    floorId?: string
  ) {
    const where: Prisma.RoomWhereInput = { deletedAt: null }
    if (floorId) {
      where.floorId = floorId
    }

    const [data, total] = await Promise.all([
      this.tenantContext.client.room.findMany({
        where,
        include: {
          floor: {
            select: {
              id: true,
              name: true,
              buildingId: true,
              building: {
                select: { id: true, name: true, code: true },
              },
            },
          },
          _count: {
            select: { beds: true },
          },
        },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.tenantContext.client.room.count({ where }),
    ])

    // Enriquecer com contagem de leitos ocupados e disponíveis
    const enriched = await Promise.all(
      data.map(async (room) => {
        const occupiedBeds = await this.tenantContext.client.bed.count({
          where: {
            roomId: room.id,
            status: 'Ocupado',
            deletedAt: null,
          },
        })

        const availableBeds = room._count.beds - occupiedBeds

        return {
          ...room,
          totalBeds: room._count.beds,
          occupiedBeds,
          availableBeds,
          _count: undefined,
        }
      })
    )

    return { data: enriched, total, skip, take }
  }

  async findOne(id: string) {
    const room = await this.tenantContext.client.room.findFirst({
      where: { id, deletedAt: null },
      include: {
        floor: {
          select: {
            id: true,
            name: true,
            buildingId: true,
            building: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        beds: {
          where: { deletedAt: null },
          orderBy: { code: 'asc' },
        },
      },
    })

    if (!room) {
      throw new NotFoundException(`Quarto com ID ${id} não encontrado`)
    }

    return room
  }

  async update(id: string, updateRoomDto: UpdateRoomDto) {
    // Validar que o room existe
    await this.findOne(id)

    // Se está mudando o floorId, validar que o novo floor existe
    if (updateRoomDto.floorId) {
      const floor = await this.tenantContext.client.floor.findFirst({
        where: { id: updateRoomDto.floorId, deletedAt: null },
      })

      if (!floor) {
        throw new NotFoundException(`Andar com ID ${updateRoomDto.floorId} não encontrado`)
      }
    }

    // Mapear campos do DTO para o formato esperado pelo Prisma
    const dataToUpdate: Prisma.RoomUpdateInput = {}
    if (updateRoomDto.name !== undefined) dataToUpdate.name = updateRoomDto.name
    if (updateRoomDto.code !== undefined) dataToUpdate.code = updateRoomDto.code
    if (updateRoomDto.roomNumber !== undefined) dataToUpdate.roomNumber = updateRoomDto.roomNumber
    if (updateRoomDto.capacity !== undefined) dataToUpdate.capacity = updateRoomDto.capacity
    if (updateRoomDto.roomType !== undefined) dataToUpdate.roomType = updateRoomDto.roomType
    if (updateRoomDto.hasPrivateBathroom !== undefined) dataToUpdate.hasPrivateBathroom = updateRoomDto.hasPrivateBathroom
    if (updateRoomDto.accessible !== undefined) dataToUpdate.accessible = updateRoomDto.accessible
    if (updateRoomDto.observations !== undefined) dataToUpdate.observations = updateRoomDto.observations
    if (updateRoomDto.genderRestriction !== undefined) dataToUpdate.genderRestriction = updateRoomDto.genderRestriction
    if (updateRoomDto.hasBathroom !== undefined) dataToUpdate.hasBathroom = updateRoomDto.hasBathroom
    if (updateRoomDto.notes !== undefined) dataToUpdate.notes = updateRoomDto.notes

    const room = await this.tenantContext.client.room.update({
      where: { id },
      data: dataToUpdate,
    })

    this.emitDashboardOverviewUpdate('room.updated')
    return room
  }

  async remove(id: string) {
    // Validar que o room existe
    await this.findOne(id)

    // Verificar se tem leitos ocupados
    const occupiedBeds = await this.tenantContext.client.bed.count({
      where: { roomId: id, status: 'Ocupado', deletedAt: null },
    })

    if (occupiedBeds > 0) {
      throw new BadRequestException(
        'Não é possível remover um quarto com leitos ocupados. Libere os leitos primeiro.'
      )
    }

    const room = await this.tenantContext.client.room.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    this.emitDashboardOverviewUpdate('room.deleted')
    return room
  }

  private async updateCapacity(roomId: string, capacity: number) {
    return this.tenantContext.client.room.update({
      where: { id: roomId },
      data: { capacity },
    })
  }
}
