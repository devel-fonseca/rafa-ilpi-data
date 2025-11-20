import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateRoomDto, UpdateRoomDto } from './dto'

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createRoomDto: CreateRoomDto) {
    // Validar que o floor existe
    const floor = await this.prisma.floor.findFirst({
      where: { id: createRoomDto.floorId, tenantId, deletedAt: null },
    })

    if (!floor) {
      throw new NotFoundException(`Andar com ID ${createRoomDto.floorId} não encontrado`)
    }

    return this.prisma.room.create({
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
        tenantId,
      },
    })
  }

  async findAll(
    tenantId: string,
    skip: number = 0,
    take: number = 50,
    floorId?: string
  ) {
    const where: any = { tenantId, deletedAt: null }
    if (floorId) {
      where.floorId = floorId
    }

    const [data, total] = await Promise.all([
      this.prisma.room.findMany({
        where,
        include: {
          floor: {
            select: { id: true, name: true, buildingId: true },
          },
          _count: {
            select: { beds: true },
          },
        },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.room.count({ where }),
    ])

    // Enriquecer com contagem de leitos ocupados e disponíveis
    const enriched = await Promise.all(
      data.map(async (room: any) => {
        const occupiedBeds = await this.prisma.bed.count({
          where: {
            tenantId,
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

  async findOne(tenantId: string, id: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        floor: {
          select: { id: true, name: true, buildingId: true },
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

  async update(tenantId: string, id: string, updateRoomDto: UpdateRoomDto) {
    // Validar que o room existe
    await this.findOne(tenantId, id)

    // Se está mudando o floorId, validar que o novo floor existe
    if (updateRoomDto.floorId) {
      const floor = await this.prisma.floor.findFirst({
        where: { id: updateRoomDto.floorId, tenantId, deletedAt: null },
      })

      if (!floor) {
        throw new NotFoundException(`Andar com ID ${updateRoomDto.floorId} não encontrado`)
      }
    }

    // Mapear campos do DTO para o formato esperado pelo Prisma
    const dataToUpdate: any = {}
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

    return this.prisma.room.update({
      where: { id },
      data: dataToUpdate,
    })
  }

  async remove(tenantId: string, id: string) {
    // Validar que o room existe
    await this.findOne(tenantId, id)

    // Verificar se tem leitos ocupados
    const occupiedBeds = await this.prisma.bed.count({
      where: { roomId: id, status: 'Ocupado', deletedAt: null },
    })

    if (occupiedBeds > 0) {
      throw new BadRequestException(
        'Não é possível remover um quarto com leitos ocupados. Libere os leitos primeiro.'
      )
    }

    return this.prisma.room.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  private async updateCapacity(roomId: string, capacity: number) {
    return this.prisma.room.update({
      where: { id: roomId },
      data: { capacity },
    })
  }
}
