import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminDashboardService } from './admin-dashboard.service';
import {
  DailyComplianceResponseDto,
  ResidentsGrowthResponseDto,
  MedicationsHistoryResponseDto,
} from './dto';
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

  @Get('residents-growth')
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @ApiOperation({
    summary: 'Obter crescimento de residentes nos últimos 6 meses',
    description:
      'Retorna contagem mensal de residentes ativos para gráfico de evolução (Acesso restrito: Administrador e Responsável Técnico)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados de crescimento retornados com sucesso',
    type: ResidentsGrowthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para visualizar dashboard administrativo' })
  async getResidentsGrowth(): Promise<ResidentsGrowthResponseDto> {
    return this.adminDashboardService.getResidentsGrowth();
  }

  @Get('medications-history')
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @ApiOperation({
    summary: 'Obter histórico de medicações nos últimos 7 dias',
    description:
      'Retorna dados diários de medicações agendadas vs administradas para gráfico (Acesso restrito: Administrador e Responsável Técnico)',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico de medicações retornado com sucesso',
    type: MedicationsHistoryResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para visualizar dashboard administrativo' })
  async getMedicationsHistory(): Promise<MedicationsHistoryResponseDto> {
    return this.adminDashboardService.getMedicationsHistory();
  }
}
