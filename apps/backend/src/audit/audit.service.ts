import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLog {
  entityType: string;
  entityId?: string;
  action: string;
  userId: string;
  userName: string;
  tenantId: string;
  schemaName: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(auditLog: AuditLog): Promise<void> {
    try {
      const { schemaName, ...logData } = auditLog;

      // Criar tabela de auditoria se não existir
      await this.ensureAuditTable(schemaName);

      // Inserir log de auditoria
      await this.prisma.$queryRawUnsafe(`
        INSERT INTO "${schemaName}"."audit_logs" (
          entity_type,
          entity_id,
          action,
          user_id,
          user_name,
          tenant_id,
          details,
          ip_address,
          user_agent,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
        logData.entityType,
        logData.entityId || null,
        logData.action,
        logData.userId,
        logData.userName,
        logData.tenantId,
        JSON.stringify(logData.details || {}),
        logData.ipAddress || null,
        logData.userAgent || null,
        new Date()
      );

      this.logger.log(
        `Audit log created: ${logData.entityType} - ${logData.action} by ${logData.userName}`
      );
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
      // Não lançar erro para não interromper a operação principal
    }
  }

  async getAuditLogs(
    schemaName: string,
    filters?: {
      entityType?: string;
      userId?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<any[]> {
    try {
      await this.ensureAuditTable(schemaName);

      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      if (filters?.entityType) {
        paramCount++;
        whereConditions.push(`entity_type = $${paramCount}`);
        queryParams.push(filters.entityType);
      }

      if (filters?.userId) {
        paramCount++;
        whereConditions.push(`user_id = $${paramCount}`);
        queryParams.push(filters.userId);
      }

      if (filters?.action) {
        paramCount++;
        whereConditions.push(`action = $${paramCount}`);
        queryParams.push(filters.action);
      }

      if (filters?.startDate) {
        paramCount++;
        whereConditions.push(`created_at >= $${paramCount}`);
        queryParams.push(filters.startDate);
      }

      if (filters?.endDate) {
        paramCount++;
        whereConditions.push(`created_at <= $${paramCount}`);
        queryParams.push(filters.endDate);
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const offset = (page - 1) * limit;

      paramCount++;
      const limitParam = paramCount;
      queryParams.push(limit);

      paramCount++;
      const offsetParam = paramCount;
      queryParams.push(offset);

      const query = `
        SELECT
          id,
          entity_type,
          entity_id,
          action,
          user_id,
          user_name,
          tenant_id,
          details,
          ip_address,
          user_agent,
          created_at
        FROM "${schemaName}"."audit_logs"
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${limitParam} OFFSET $${offsetParam}
      `;

      const logs = await this.prisma.$queryRawUnsafe(query, ...queryParams);

      return logs as any[];
    } catch (error) {
      this.logger.error('Failed to get audit logs:', error);
      throw error;
    }
  }

  async getAuditLogStats(
    schemaName: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    try {
      await this.ensureAuditTable(schemaName);

      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      if (startDate) {
        paramCount++;
        whereConditions.push(`created_at >= $${paramCount}`);
        queryParams.push(startDate);
      }

      if (endDate) {
        paramCount++;
        whereConditions.push(`created_at <= $${paramCount}`);
        queryParams.push(endDate);
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Estatísticas por tipo de entidade
      const entityStats = await this.prisma.$queryRawUnsafe(`
        SELECT
          entity_type,
          COUNT(*) as count
        FROM "${schemaName}"."audit_logs"
        ${whereClause}
        GROUP BY entity_type
        ORDER BY count DESC
      `, ...queryParams);

      // Estatísticas por ação
      const actionStats = await this.prisma.$queryRawUnsafe(`
        SELECT
          action,
          COUNT(*) as count
        FROM "${schemaName}"."audit_logs"
        ${whereClause}
        GROUP BY action
        ORDER BY count DESC
      `, ...queryParams);

      // Estatísticas por usuário
      const userStats = await this.prisma.$queryRawUnsafe(`
        SELECT
          user_name,
          COUNT(*) as count
        FROM "${schemaName}"."audit_logs"
        ${whereClause}
        GROUP BY user_name
        ORDER BY count DESC
        LIMIT 10
      `, ...queryParams);

      // Total de logs
      const totalResult = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as total
        FROM "${schemaName}"."audit_logs"
        ${whereClause}
      `, ...queryParams) as any[];

      return {
        total: parseInt(totalResult[0].total),
        byEntity: entityStats,
        byAction: actionStats,
        topUsers: userStats,
      };
    } catch (error) {
      this.logger.error('Failed to get audit log stats:', error);
      throw error;
    }
  }

  private async ensureAuditTable(schemaName: string): Promise<void> {
    try {
      // Verificar se a tabela existe
      const tableExists = await this.prisma.$queryRawUnsafe(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = $1
          AND table_name = 'audit_logs'
        )
      `, schemaName) as any[];

      if (!tableExists[0].exists) {
        // Criar tabela de auditoria
        await this.prisma.$queryRawUnsafe(`
          CREATE TABLE "${schemaName}"."audit_logs" (
            id SERIAL PRIMARY KEY,
            entity_type VARCHAR(50) NOT NULL,
            entity_id VARCHAR(255),
            action VARCHAR(50) NOT NULL,
            user_id VARCHAR(255) NOT NULL,
            user_name VARCHAR(255) NOT NULL,
            tenant_id VARCHAR(255) NOT NULL,
            details JSONB,
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Criar índices
        await this.prisma.$queryRawUnsafe(`
          CREATE INDEX idx_audit_logs_entity_type ON "${schemaName}"."audit_logs" (entity_type);
          CREATE INDEX idx_audit_logs_user_id ON "${schemaName}"."audit_logs" (user_id);
          CREATE INDEX idx_audit_logs_created_at ON "${schemaName}"."audit_logs" (created_at);
        `);

        this.logger.log(`Audit table created for schema: ${schemaName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure audit table for schema ${schemaName}:`, error);
      throw error;
    }
  }
}