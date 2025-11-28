import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /audit/recent
   * Retorna as atividades recentes do tenant
   */
  @Get('recent')
  async getRecentActivity(
    @Req() req: Request,
    @Query('limit') limit?: string,
  ) {
    const user = req.user as any;
    const tenantId = user.tenantId;

    const logs = await this.auditService.getAuditLogs(tenantId, {
      limit: limit ? parseInt(limit, 10) : 10,
      page: 1,
    });

    return logs;
  }

  /**
   * GET /audit/logs
   * Retorna logs de auditoria com filtros avançados
   */
  @Get('logs')
  async getAuditLogs(
    @Req() req: Request,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const user = req.user as any;
    const tenantId = user.tenantId;

    const filters: any = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    };

    if (entityType) filters.entityType = entityType;
    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const logs = await this.auditService.getAuditLogs(tenantId, filters);

    return logs;
  }

  /**
   * GET /audit/stats
   * Retorna estatísticas de auditoria
   */
  @Get('stats')
  async getAuditStats(
    @Req() req: Request,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const user = req.user as any;
    const tenantId = user.tenantId;

    const stats = await this.auditService.getAuditLogStats(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return stats;
  }
}
