import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, TenantStatus } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

interface FindAllFilters {
  status?: TenantStatus
  search?: string
  planId?: string
}

interface Pagination {
  page: number
  limit: number
}

/**
 * TenantAdminService
 *
 * Serviço responsável pela gestão completa de tenants pelo SuperAdmin.
 * Implementa CRUD completo com filtros, paginação e operações administrativas.
 */
@Injectable()
export class TenantAdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listar todos os tenants com filtros e paginação
   */
  async findAll(filters: FindAllFilters = {}, pagination: Pagination = { page: 1, limit: 20 }) {
    const { status, search, planId } = filters
    const { page, limit } = pagination
    const skip = (page - 1) * limit

    // Construir where clause
    const where: Prisma.TenantWhereInput = {
      deletedAt: null,
    }

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cnpj: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (planId) {
      where.subscriptions = {
        some: {
          planId,
          status: {
            in: ['ACTIVE', 'active', 'TRIAL', 'trialing']
          },
        },
      }
    }

    // Buscar dados e total
    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscriptions: {
            where: {
              status: {
                in: ['ACTIVE', 'active', 'TRIAL', 'trialing']
              }
            },
            include: { plan: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              users: true,
              residents: true,
            },
          },
        },
      }),
      this.prisma.tenant.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    }
  }

  /**
   * Buscar detalhes completos de um tenant específico
   */
  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
        usageMetrics: {
          orderBy: { month: 'desc' },
          take: 12, // Últimos 12 meses
        },
        systemAlerts: {
          where: { read: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            users: true,
            residents: true,
            dailyRecords: true,
            prescriptions: true,
          },
        },
      },
    })

    if (!tenant) {
      throw new NotFoundException(`Tenant com ID ${id} não encontrado`)
    }

    return tenant
  }

  /**
   * Atualizar dados básicos de um tenant
   */
  async update(id: string, updateData: Partial<{
    name: string
    email: string
    phone: string
    addressStreet: string
    addressNumber: string
    addressComplement: string
    addressDistrict: string
    addressCity: string
    addressState: string
    addressZipCode: string
  }>) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    })

    if (!tenant) {
      throw new NotFoundException(`Tenant com ID ${id} não encontrado`)
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: updateData,
    })

    return updated
  }

  /**
   * Suspender tenant
   * Muda status para SUSPENDED e registra motivo em alerta
   */
  async suspend(id: string, reason: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    })

    if (!tenant) {
      throw new NotFoundException(`Tenant com ID ${id} não encontrado`)
    }

    if (tenant.status === 'SUSPENDED') {
      throw new Error('Tenant já está suspenso')
    }

    // Atualizar status
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    })

    // Criar alerta de suspensão
    await this.prisma.systemAlert.create({
      data: {
        tenantId: id,
        type: 'TENANT_SUSPENDED',
        severity: 'CRITICAL',
        title: 'Tenant Suspenso',
        message: `Tenant "${tenant.name}" foi suspenso. Motivo: ${reason}`,
        metadata: { reason },
      },
    })

    return updated
  }

  /**
   * Reativar tenant suspenso
   * Muda status de volta para ACTIVE
   */
  async reactivate(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    })

    if (!tenant) {
      throw new NotFoundException(`Tenant com ID ${id} não encontrado`)
    }

    if (tenant.status !== 'SUSPENDED') {
      throw new Error('Apenas tenants suspensos podem ser reativados')
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { status: 'ACTIVE' },
    })

    return updated
  }

  /**
   * Soft delete de tenant
   * Marca deletedAt sem remover dados do banco
   */
  async delete(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    })

    if (!tenant) {
      throw new NotFoundException(`Tenant com ID ${id} não encontrado`)
    }

    const deleted = await this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return deleted
  }

  /**
   * Buscar estatísticas de um tenant
   */
  async getStats(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            residents: true,
            dailyRecords: true,
            prescriptions: true,
            vaccinations: true,
            vitalSigns: true,
            clinicalNotes: true,
          },
        },
      },
    })

    if (!tenant) {
      throw new NotFoundException(`Tenant com ID ${id} não encontrado`)
    }

    return tenant._count
  }
}
