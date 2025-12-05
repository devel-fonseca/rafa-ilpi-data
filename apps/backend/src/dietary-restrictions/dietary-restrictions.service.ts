import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDietaryRestrictionDto } from './dto/create-dietary-restriction.dto';
import { UpdateDietaryRestrictionDto } from './dto/update-dietary-restriction.dto';

@Injectable()
export class DietaryRestrictionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    userId: string,
    createDto: CreateDietaryRestrictionDto,
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

    return this.prisma.dietaryRestriction.create({
      data: {
        tenantId,
        residentId: createDto.residentId,
        restrictionType: createDto.restrictionType,
        description: createDto.description,
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
    return this.prisma.dietaryRestriction.findMany({
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
    const restriction = await this.prisma.dietaryRestriction.findFirst({
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

    if (!restriction) {
      throw new NotFoundException('Restrição alimentar não encontrada');
    }

    return restriction;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    updateDto: UpdateDietaryRestrictionDto,
  ) {
    const restriction = await this.prisma.dietaryRestriction.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!restriction) {
      throw new NotFoundException('Restrição alimentar não encontrada');
    }

    return this.prisma.dietaryRestriction.update({
      where: { id },
      data: {
        restrictionType: updateDto.restrictionType,
        description: updateDto.description,
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
    const restriction = await this.prisma.dietaryRestriction.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!restriction) {
      throw new NotFoundException('Restrição alimentar não encontrada');
    }

    return this.prisma.dietaryRestriction.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
