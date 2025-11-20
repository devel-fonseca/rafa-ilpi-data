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

    // Criar com capacity padrão se não informado
    const capacity = createRoomDto.capacity ?? 1

    return this.prisma.room.create({
      data: {
        ...createRoomDto,
        capacity,
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

    // Enriquecer com contagem de leitos ocupados
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

        return {
          ...room,
          bedsCount: room._count.beds,
          occupiedBedsCount: occupiedBeds,
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

    return this.prisma.room.update({
      where: { id },
      data: updateRoomDto,
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
