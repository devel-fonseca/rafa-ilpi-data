import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailLog, EmailStatus, Prisma } from '@prisma/client';

@Injectable()
export class EmailLogsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listar logs de emails com filtros
   */
  async findAll(filters?: {
    templateKey?: string;
    tenantId?: string;
    status?: EmailStatus;
    recipientEmail?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: EmailLog[]; total: number }> {
    const where: Prisma.EmailLogWhereInput = {};

    if (filters?.templateKey) {
      where.templateKey = filters.templateKey;
    }

    if (filters?.tenantId) {
      where.tenantId = filters.tenantId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.recipientEmail) {
      where.recipientEmail = {
        contains: filters.recipientEmail,
        mode: 'insensitive',
      };
    }

    if (filters?.startDate || filters?.endDate) {
      where.sentAt = {};
      if (filters.startDate) {
        where.sentAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.sentAt.lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          sentAt: 'desc',
        },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Buscar log específico por ID
   */
  async findOne(id: string): Promise<EmailLog | null> {
    return this.prisma.emailLog.findUnique({
      where: { id },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Estatísticas de emails
   */
  async getStats(filters?: {
    templateKey?: string;
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    total: number;
    sent: number;
    failed: number;
    bounced: number;
    byTemplate: Array<{ templateKey: string; count: number }>;
  }> {
    const where: Prisma.EmailLogWhereInput = {};

    if (filters?.templateKey) {
      where.templateKey = filters.templateKey;
    }

    if (filters?.tenantId) {
      where.tenantId = filters.tenantId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.sentAt = {};
      if (filters.startDate) {
        where.sentAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.sentAt.lte = filters.endDate;
      }
    }

    const [total, sent, failed, bounced, byTemplate] = await Promise.all([
      this.prisma.emailLog.count({ where }),
      this.prisma.emailLog.count({
        where: { ...where, status: EmailStatus.SENT },
      }),
      this.prisma.emailLog.count({
        where: { ...where, status: EmailStatus.FAILED },
      }),
      this.prisma.emailLog.count({
        where: { ...where, status: EmailStatus.BOUNCED },
      }),
      this.prisma.emailLog.groupBy({
        by: ['templateKey'],
        where,
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
      }),
    ]);

    return {
      total,
      sent,
      failed,
      bounced,
      byTemplate: byTemplate.map((item) => ({
        templateKey: item.templateKey || 'unknown',
        count: item._count.id,
      })),
    };
  }
}
