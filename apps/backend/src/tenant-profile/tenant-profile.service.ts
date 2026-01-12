import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTenantProfileDto,
  UpdateTenantProfileDto,
} from './dto';

@Injectable()
export class TenantProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Criar ou atualizar perfil do tenant (upsert)
   * Se já existe, atualiza. Se não existe, cria.
   */
  async upsert(tenantId: string, dto: CreateTenantProfileDto) {
    // Validação: capacityLicensed não pode ser maior que capacityDeclared
    if (
      dto.capacityDeclared &&
      dto.capacityLicensed &&
      dto.capacityLicensed > dto.capacityDeclared
    ) {
      throw new BadRequestException(
        'Capacidade licenciada não pode ser maior que a capacidade declarada',
      );
    }

    // Converter foundedAt de string para Date se fornecido
    const data: any = {
      ...dto,
      foundedAt: dto.foundedAt ? new Date(dto.foundedAt) : undefined,
    };

    return this.prisma.tenantProfile.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...data,
      },
      update: data,
    });
  }

  /**
   * Buscar perfil por tenantId
   */
  async findByTenantId(tenantId: string) {
    return this.prisma.tenantProfile.findUnique({
      where: { tenantId },
    });
  }

  /**
   * Atualizar perfil existente
   */
  async update(
    tenantId: string,
    dto: UpdateTenantProfileDto,
  ) {
    const existing = await this.findByTenantId(tenantId);

    if (!existing) {
      throw new NotFoundException(
        'Perfil não encontrado. Use o endpoint de criação primeiro.',
      );
    }

    // Validação: capacityLicensed não pode ser maior que capacityDeclared
    const finalDeclared = dto.capacityDeclared ?? existing.capacityDeclared;
    const finalLicensed = dto.capacityLicensed ?? existing.capacityLicensed;

    if (
      finalDeclared &&
      finalLicensed &&
      finalLicensed > finalDeclared
    ) {
      throw new BadRequestException(
        'Capacidade licenciada não pode ser maior que a capacidade declarada',
      );
    }

    // Converter foundedAt de string para Date se fornecido
    const data: any = {
      ...dto,
      foundedAt: dto.foundedAt ? new Date(dto.foundedAt) : undefined,
    };

    return this.prisma.tenantProfile.update({
      where: { tenantId },
      data,
    });
  }

  /**
   * Verificar status de completude do perfil
   * Considera completo se legalNature foi preenchida
   */
  async checkCompletionStatus(tenantId: string) {
    const profile = await this.findByTenantId(tenantId);

    return {
      isComplete: !!profile?.legalNature,
      profile,
      missingFields: !profile?.legalNature ? ['legalNature'] : [],
    };
  }

  /**
   * Soft delete do perfil
   */
  async softDelete(tenantId: string) {
    const existing = await this.findByTenantId(tenantId);

    if (!existing) {
      throw new NotFoundException('Perfil não encontrado');
    }

    return this.prisma.tenantProfile.update({
      where: { tenantId },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
