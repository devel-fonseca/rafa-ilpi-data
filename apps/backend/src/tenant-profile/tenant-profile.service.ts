import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import {
  CreateTenantProfileDto,
  UpdateTenantProfileDto,
} from './dto';

@Injectable()
export class TenantProfileService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
  ) {}

  /**
   * Criar ou atualizar perfil do tenant (upsert)
   * Se já existe, atualiza. Se não existe, cria.
   */
  async upsert(dto: CreateTenantProfileDto) {
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
    const data: Prisma.TenantProfileUpdateInput = {
      ...dto,
      foundedAt: dto.foundedAt ? new Date(dto.foundedAt) : undefined,
    };

    // Fallback: usar phone/email do tenant (public) apenas se contact* não foi preenchido
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: this.tenantContext.tenantId },
      select: { phone: true, email: true },
    });
    if (!data.contactPhone && tenant?.phone) {
      data.contactPhone = tenant.phone;
    }
    if (!data.contactEmail && tenant?.email) {
      data.contactEmail = tenant.email;
    }

    return this.tenantContext.client.tenantProfile.upsert({
      where: { tenantId: this.tenantContext.tenantId },
      create: {
        tenantId: this.tenantContext.tenantId,
        ...data,
      } as Prisma.TenantProfileUncheckedCreateInput,
      update: data,
    });
  }

  /**
   * Buscar perfil do tenant atual
   */
  async findByTenantId() {
    return this.tenantContext.client.tenantProfile.findUnique({
      where: { tenantId: this.tenantContext.tenantId },
    });
  }

  /**
   * Atualizar perfil existente
   */
  async update(dto: UpdateTenantProfileDto) {
    const existing = await this.findByTenantId();

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
    const data: Prisma.TenantProfileUpdateInput = {
      ...dto,
      foundedAt: dto.foundedAt ? new Date(dto.foundedAt) : undefined,
    };

    // Fallback: usar phone/email do tenant (public) apenas se contact* não foi preenchido
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: this.tenantContext.tenantId },
      select: { phone: true, email: true },
    });
    if (!data.contactPhone && !existing.contactPhone && tenant?.phone) {
      data.contactPhone = tenant.phone;
    }
    if (!data.contactEmail && !existing.contactEmail && tenant?.email) {
      data.contactEmail = tenant.email;
    }

    return this.tenantContext.client.tenantProfile.update({
      where: { tenantId: this.tenantContext.tenantId },
      data,
    });
  }

  /**
   * Verificar status de completude do perfil
   * Considera completo se legalNature foi preenchida
   */
  async checkCompletionStatus() {
    const profile = await this.findByTenantId();

    return {
      isComplete: !!profile?.legalNature,
      profile,
      missingFields: !profile?.legalNature ? ['legalNature'] : [],
    };
  }

  /**
   * Soft delete do perfil
   */
  async softDelete() {
    const existing = await this.findByTenantId();

    if (!existing) {
      throw new NotFoundException('Perfil não encontrado');
    }

    return this.tenantContext.client.tenantProfile.update({
      where: { tenantId: this.tenantContext.tenantId },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
