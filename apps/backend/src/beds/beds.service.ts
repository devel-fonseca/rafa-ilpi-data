import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateBedDto, UpdateBedDto } from './dto'

@Injectable()
export class BedsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createBedDto: CreateBedDto) {
    // Validar que o room existe
    const room = await this.prisma.room.findFirst({
      where: { id: createBedDto.roomId, tenantId, deletedAt: null },
    })

    if (!room) {
      throw new NotFoundException(`Quarto com ID ${createBedDto.roomId} não encontrado`)
    }

    // Verificar se o code já existe para este tenant
    const existingBed = await this.prisma.bed.findFirst({
      where: { tenantId, code: createBedDto.code, deletedAt: null },
    })

    if (existingBed) {
      throw new BadRequestException(
        `Já existe um leito com o código ${createBedDto.code}`
      )
    }

    return this.prisma.bed.create({
      data: {
        ...createBedDto,
        status: createBedDto.status || 'Disponível',
        tenantId,
      },
    })
  }

  async findAll(
    tenantId: string,
    skip: number = 0,
    take: number = 50,
    roomId?: string,
    status?: string
  ) {
    const where: any = { tenantId, deletedAt: null }
    if (roomId) {
      where.roomId = roomId
    }
    if (status) {
      where.status = status
    }

    const [data, total] = await Promise.all([
      this.prisma.bed.findMany({
        where,
        include: {
          room: {
            select: {
              id: true,
              name: true,
              floorId: true,
              floor: {
                select: {
                  id: true,
                  name: true,
                  buildingId: true,
                  building: {
                    select: { id: true, name: true },
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
      this.prisma.bed.count({ where }),
    ])

    return { data, total, skip, take }
  }

  async findOne(tenantId: string, id: string) {
    const bed = await this.prisma.bed.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            floorId: true,
            floor: {
              select: {
                id: true,
                name: true,
                buildingId: true,
                building: {
                  select: { id: true, name: true },
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
      const resident = await this.prisma.resident.findFirst({
        where: { bedId: id, tenantId, deletedAt: null },
        select: { id: true, fullName: true, status: true },
      })

      return { ...bed, resident }
    }

    return bed
  }

  async update(tenantId: string, id: string, updateBedDto: UpdateBedDto) {
    // Validar que o bed existe
    await this.findOne(tenantId, id)

    // Se está mudando o roomId, validar que o novo room existe
    if (updateBedDto.roomId) {
      const room = await this.prisma.room.findFirst({
        where: { id: updateBedDto.roomId, tenantId, deletedAt: null },
      })

      if (!room) {
        throw new NotFoundException(`Quarto com ID ${updateBedDto.roomId} não encontrado`)
      }
    }

    // Se está mudando o code, validar se já não existe
    if (updateBedDto.code) {
      const existingBed = await this.prisma.bed.findFirst({
        where: {
          tenantId,
          code: updateBedDto.code,
          id: { not: id },
          deletedAt: null,
        },
      })

      if (existingBed) {
        throw new BadRequestException(
          `Já existe um leito com o código ${updateBedDto.code}`
        )
      }
    }

    return this.prisma.bed.update({
      where: { id },
      data: updateBedDto,
    })
  }

  async remove(tenantId: string, id: string) {
    // Validar que o bed existe
    const bed = await this.findOne(tenantId, id)

    // Verificar se está ocupado
    if (bed.status === 'Ocupado') {
      throw new BadRequestException(
        'Não é possível remover um leito ocupado. Libere o leito primeiro.'
      )
    }

    return this.prisma.bed.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async getOccupancyStats(tenantId: string) {
    const total = await this.prisma.bed.count({
      where: { tenantId, deletedAt: null },
    })

    const occupied = await this.prisma.bed.count({
      where: { tenantId, status: 'Ocupado', deletedAt: null },
    })

    const available = await this.prisma.bed.count({
      where: { tenantId, status: 'Disponível', deletedAt: null },
    })

    const maintenance = await this.prisma.bed.count({
      where: { tenantId, status: 'Manutenção', deletedAt: null },
    })

    return {
      total,
      occupied,
      available,
      maintenance,
      occupancyRate: total > 0 ? ((occupied / total) * 100).toFixed(2) : '0.00',
    }
  }

  async getFullMap(tenantId: string, buildingId?: string) {
    const where: any = { tenantId, deletedAt: null }
    if (buildingId) {
      where.id = buildingId
    }

    const buildings = await this.prisma.building.findMany({
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

    // Calcular estatísticas
    const totalBuildings = buildings.length
    const totalFloors = buildings.reduce((sum, b) => sum + (b.floors?.length || 0), 0)
    const totalRooms = buildings.reduce((sum, b) =>
      sum + (b.floors?.reduce((floorSum, f) => floorSum + (f.rooms?.length || 0), 0) || 0),
      0
    )
    const totalBeds = buildings.reduce((sum, b) =>
      sum +
        (b.floors?.reduce((floorSum, f) =>
          floorSum + (f.rooms?.reduce((roomSum, r) => roomSum + (r.beds?.length || 0), 0) || 0),
          0
        ) || 0),
      0
    )

    // Contar leitos por status
    const bedStatuses = await this.prisma.bed.findMany({
      where: { tenantId, deletedAt: null },
      select: { status: true },
    })

    const occupiedBeds = bedStatuses.filter((b) => b.status === 'Ocupado').length
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

    return { buildings, stats }
  }
}
