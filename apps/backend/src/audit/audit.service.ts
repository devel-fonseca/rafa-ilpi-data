import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { Prisma, AuditLog } from '@prisma/client';

export interface AuditLogStats {
  total: number;
  byEntity: Array<{ entity_type: string; count: number }>;
  byAction: Array<{ action: string; count: number }>;
  topUsers: Array<{ user_name: string; count: number }>;
}

export interface AuditLogInput {
  entityType: string;
  entityId?: string;
  action: string;
  userId: string;
  userName: string;
  tenantId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
  ) {}

  async log(auditLog: AuditLogInput): Promise<void> {
    try {
      await this.tenantContext.client.auditLog.create({
        data: {
          tenantId: auditLog.tenantId,
          entityType: auditLog.entityType,
          entityId: auditLog.entityId || null,
          action: auditLog.action,
          userId: auditLog.userId,
          userName: auditLog.userName,
          details: (auditLog.details || {}) as Prisma.InputJsonValue,
          ipAddress: auditLog.ipAddress || null,
          userAgent: auditLog.userAgent || null,
        },
      });

      this.logger.log(
        `Audit log created: ${auditLog.entityType} - ${auditLog.action} by ${auditLog.userName}`
      );
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
      // Não lançar erro para não interromper a operação principal
    }
  }

  async getAuditLogs(
    filters?: {
      entityType?: string;
      userId?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<AuditLog[]> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const skip = (page - 1) * limit;

      const where: Prisma.AuditLogWhereInput = {};

      if (filters?.entityType) {
        where.entityType = filters.entityType;
      }

      if (filters?.userId) {
        where.userId = filters.userId;
      }

      if (filters?.action) {
        where.action = filters.action;
      }

      if (filters?.startDate || filters?.endDate) {
        where.createdAt = {};
        if (filters?.startDate) {
          where.createdAt.gte = filters.startDate;
        }
        if (filters?.endDate) {
          where.createdAt.lte = filters.endDate;
        }
      }

      const logs = await this.tenantContext.client.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      });

      return logs;
    } catch (error) {
      this.logger.error('Failed to get audit logs:', error);
      throw error;
    }
  }

  async getAuditLogStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<AuditLogStats> {
    try {
      const where: Prisma.AuditLogWhereInput = {};

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = startDate;
        }
        if (endDate) {
          where.createdAt.lte = endDate;
        }
      }

      // Estatísticas por tipo de entidade
      const entityStats = await this.tenantContext.client.auditLog.groupBy({
        by: ['entityType'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });

      // Estatísticas por ação
      const actionStats = await this.tenantContext.client.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });

      // Estatísticas por usuário (top 10)
      const userStats = await this.tenantContext.client.auditLog.groupBy({
        by: ['userName'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      });

      // Total de logs
      const total = await this.tenantContext.client.auditLog.count({ where });

      return {
        total,
        byEntity: entityStats.map((s) => ({ entity_type: s.entityType, count: s._count.id })),
        byAction: actionStats.map((s) => ({ action: s.action, count: s._count.id })),
        topUsers: userStats.map((s) => ({ user_name: s.userName, count: s._count.id })),
      };
    } catch (error) {
      this.logger.error('Failed to get audit log stats:', error);
      throw error;
    }
  }
}
