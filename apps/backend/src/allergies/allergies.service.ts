import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAllergyDto } from './dto/create-allergy.dto';
import { UpdateAllergyDto } from './dto/update-allergy.dto';

@Injectable()
export class AllergiesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Criar nova alergia
   */
  async create(tenantId: string, userId: string, createDto: CreateAllergyDto) {
    // Verificar se residente existe e pertence ao tenant
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

    // Criar alergia
    return this.prisma.allergy.create({
      data: {
        tenantId,
        residentId: createDto.residentId,
        substance: createDto.substance,
        reaction: createDto.reaction,
        severity: createDto.severity,
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

  /**
   * Listar todas as alergias de um residente
   */
  async findByResidentId(tenantId: string, residentId: string) {
    return this.prisma.allergy.findMany({
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

  /**
   * Buscar uma alergia específica
   */
  async findOne(tenantId: string, id: string) {
    const allergy = await this.prisma.allergy.findFirst({
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

    if (!allergy) {
      throw new NotFoundException('Alergia não encontrada');
    }

    return allergy;
  }

  /**
   * Atualizar alergia
   */
  async update(
    tenantId: string,
    userId: string,
    id: string,
    updateDto: UpdateAllergyDto,
  ) {
    // Verificar se alergia existe e pertence ao tenant
    const allergy = await this.prisma.allergy.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!allergy) {
      throw new NotFoundException('Alergia não encontrada');
    }

    // Atualizar alergia
    return this.prisma.allergy.update({
      where: { id },
      data: {
        substance: updateDto.substance,
        reaction: updateDto.reaction,
        severity: updateDto.severity,
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

  /**
   * Soft delete de alergia
   */
  async remove(tenantId: string, id: string) {
    // Verificar se alergia existe e pertence ao tenant
    const allergy = await this.prisma.allergy.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!allergy) {
      throw new NotFoundException('Alergia não encontrada');
    }

    // Soft delete
    return this.prisma.allergy.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
