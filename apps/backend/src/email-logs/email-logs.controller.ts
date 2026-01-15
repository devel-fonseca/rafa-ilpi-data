import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { parseISO } from 'date-fns';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EmailLogsService } from './email-logs.service';
import { EmailStatus } from '@prisma/client';

@Controller('email-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailLogsController {
  constructor(private readonly emailLogsService: EmailLogsService) {}

  /**
   * Listar logs de emails (apenas SuperAdmin)
   * GET /api/email-logs
   */
  @Get()
  @Roles('superadmin')
  async findAll(
    @Query('templateKey') templateKey?: string,
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: EmailStatus,
    @Query('recipientEmail') recipientEmail?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.emailLogsService.findAll({
      templateKey,
      tenantId,
      status,
      recipientEmail,
      startDate: startDate ? parseISO(startDate) : undefined,
      endDate: endDate ? parseISO(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * Buscar log específico (apenas SuperAdmin)
   * GET /api/email-logs/:id
   */
  @Get(':id')
  @Roles('superadmin')
  async findOne(@Param('id') id: string) {
    return this.emailLogsService.findOne(id);
  }

  /**
   * Estatísticas de emails (apenas SuperAdmin)
   * GET /api/email-logs/stats
   */
  @Get('stats/summary')
  @Roles('superadmin')
  async getStats(
    @Query('templateKey') templateKey?: string,
    @Query('tenantId') tenantId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.emailLogsService.getStats({
      templateKey,
      tenantId,
      startDate: startDate ? parseISO(startDate) : undefined,
      endDate: endDate ? parseISO(endDate) : undefined,
    });
  }
}
