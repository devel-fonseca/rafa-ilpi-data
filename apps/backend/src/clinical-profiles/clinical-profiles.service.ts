import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClinicalProfileDto } from './dto/create-clinical-profile.dto';
import { UpdateClinicalProfileDto } from './dto/update-clinical-profile.dto';

@Injectable()
export class ClinicalProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Criar perfil clínico para um residente
   */
  async create(
    tenantId: string,
    userId: string,
    createDto: CreateClinicalProfileDto,
  ) {
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

    // Verificar se já existe perfil clínico para este residente
    const existing = await this.prisma.clinicalProfile.findFirst({
      where: {
        residentId: createDto.residentId,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Já existe um perfil clínico para este residente',
      );
    }

    // Criar perfil clínico
    return this.prisma.clinicalProfile.create({
      data: {
        tenantId,
        residentId: createDto.residentId,
        healthStatus: createDto.healthStatus,
        specialNeeds: createDto.specialNeeds,
        functionalAspects: createDto.functionalAspects,
        updatedBy: userId,
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
   * Buscar perfil clínico de um residente
   */
  async findByResidentId(tenantId: string, residentId: string) {
    const profile = await this.prisma.clinicalProfile.findFirst({
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
    });

    if (!profile) {
      throw new NotFoundException(
        'Perfil clínico não encontrado para este residente',
      );
    }

    return profile;
  }

  /**
   * Atualizar perfil clínico
   */
  async update(
    tenantId: string,
    userId: string,
    id: string,
    updateDto: UpdateClinicalProfileDto,
  ) {
    // Verificar se perfil existe e pertence ao tenant
    const profile = await this.prisma.clinicalProfile.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil clínico não encontrado');
    }

    // Atualizar perfil
    return this.prisma.clinicalProfile.update({
      where: { id },
      data: {
        healthStatus: updateDto.healthStatus,
        specialNeeds: updateDto.specialNeeds,
        functionalAspects: updateDto.functionalAspects,
        updatedBy: userId,
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
   * Soft delete de perfil clínico
   */
  async remove(tenantId: string, id: string) {
    // Verificar se perfil existe e pertence ao tenant
    const profile = await this.prisma.clinicalProfile.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil clínico não encontrado');
    }

    // Soft delete
    return this.prisma.clinicalProfile.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
