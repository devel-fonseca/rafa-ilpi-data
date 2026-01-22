import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminDashboardService } from './admin-dashboard.service';
import { DailyComplianceResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { PermissionType } from '@prisma/client';
import { AuditEntity } from '../audit/audit.decorator';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@Controller('admin-dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AuditEntity('ADMIN_DASHBOARD')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('daily-summary')
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @ApiOperation({
    summary: 'Obter resumo operacional do dia para dashboard administrativo',
    description:
      'Retorna métricas operacionais: residentes ativos, medicamentos programados/administrados, registros obrigatórios completados (Acesso restrito: Administrador e Responsável Técnico)',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo operacional retornado com sucesso',
    type: DailyComplianceResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para visualizar dashboard administrativo' })
  async getDailySummary(): Promise<DailyComplianceResponseDto> {
    return this.adminDashboardService.getDailySummary();
  }
}
