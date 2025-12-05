import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConditionDto } from './dto/create-condition.dto';
import { UpdateConditionDto } from './dto/update-condition.dto';

@Injectable()
export class ConditionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    userId: string,
    createDto: CreateConditionDto,
  ) {
    const resident = await this.prisma.resident.findFirst({
      where: {
        id: createDto.residentId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    return this.prisma.condition.create({
      data: {
        tenantId,
        residentId: createDto.residentId,
        condition: createDto.condition,
        icdCode: createDto.icdCode,
        notes: createDto.notes,
        recordedBy: userId,
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findByResidentId(tenantId: string, residentId: string) {
    return this.prisma.condition.findMany({
      where: {
        residentId,
        tenantId,
        deletedAt: null,
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const condition = await this.prisma.condition.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!condition) {
      throw new NotFoundException('Condição não encontrada');
    }

    return condition;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    updateDto: UpdateConditionDto,
  ) {
    const condition = await this.prisma.condition.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!condition) {
      throw new NotFoundException('Condição não encontrada');
    }

    return this.prisma.condition.update({
      where: { id },
      data: {
        condition: updateDto.condition,
        icdCode: updateDto.icdCode,
        notes: updateDto.notes,
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const condition = await this.prisma.condition.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!condition) {
      throw new NotFoundException('Condição não encontrada');
    }

    return this.prisma.condition.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
