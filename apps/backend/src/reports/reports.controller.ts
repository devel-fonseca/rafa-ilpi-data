import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ReportsService } from './reports.service';
import { MultiDayReportDto } from './dto/daily-report.dto';
import { ResidentsListReportDto } from './dto/residents-list-report.dto';
import { ResidentCareSummaryReportDto } from './dto/resident-care-summary-report.dto';
import { ShiftHistoryReportDto } from './dto/shift-history-report.dto';
import { FeatureGuard } from '../common/guards/feature.guard';
import { RequireFeatures } from '../common/decorators/require-features.decorator';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { PermissionType } from '@prisma/client';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeatures('relatorios')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily')
  @RequirePermissions(PermissionType.VIEW_REPORTS)
  @ApiOperation({ summary: 'Gerar relatório diário ou multi-dia' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Data inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Data final (YYYY-MM-DD). Se não fornecida, retorna apenas startDate' })
  @ApiQuery({ name: 'shiftTemplateId', required: false, type: String, description: 'Filtrar por template de turno específico (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Relatório gerado com sucesso',
    type: MultiDayReportDto,
  })
  async getDailyReport(
    @CurrentUser() user: JwtPayload,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate?: string,
    @Query('shiftTemplateId') shiftTemplateId?: string,
  ): Promise<MultiDayReportDto> {
    if (!user.tenantId) {
      throw new Error('TenantId não encontrado no token JWT');
    }
    return this.reportsService.generateMultiDayReport(user.tenantId, startDate, endDate, shiftTemplateId);
  }

  @Get('residents')
  @RequirePermissions(PermissionType.VIEW_REPORTS)
  @ApiOperation({ summary: 'Gerar relatório de lista de residentes' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filtrar por status (Ativo, Inativo, Falecido). Padrão: Ativo' })
  @ApiResponse({
    status: 200,
    description: 'Relatório de residentes gerado com sucesso',
    type: ResidentsListReportDto,
  })
  async getResidentsListReport(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
  ): Promise<ResidentsListReportDto> {
    if (!user.tenantId) {
      throw new Error('TenantId não encontrado no token JWT');
    }
    return this.reportsService.generateResidentsListReport(user.tenantId, status || 'Ativo');
  }

  @Get('resident-care-summary/:residentId')
  @RequirePermissions(PermissionType.VIEW_REPORTS)
  @ApiOperation({ summary: 'Gerar resumo assistencial do residente' })
  @ApiParam({ name: 'residentId', required: true, type: String, description: 'ID do residente (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Resumo assistencial gerado com sucesso',
  })
  async getResidentCareSummary(
    @CurrentUser() user: JwtPayload,
    @Param('residentId') residentId: string,
  ): Promise<ResidentCareSummaryReportDto> {
    if (!user.tenantId) {
      throw new Error('TenantId não encontrado no token JWT');
    }
    return this.reportsService.generateResidentCareSummaryReport(user.tenantId, residentId);
  }

  @Get('shift-history/:shiftId')
  @RequirePermissions(PermissionType.VIEW_REPORTS)
  @ApiOperation({ summary: 'Gerar relatório do histórico de um plantão' })
  @ApiParam({ name: 'shiftId', required: true, type: String, description: 'ID do plantão (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Relatório do histórico do plantão gerado com sucesso',
    type: ShiftHistoryReportDto,
  })
  async getShiftHistoryReport(
    @CurrentUser() user: JwtPayload,
    @Param('shiftId') shiftId: string,
  ): Promise<ShiftHistoryReportDto> {
    if (!user.tenantId) {
      throw new Error('TenantId não encontrado no token JWT');
    }

    return this.reportsService.generateShiftHistoryReport(user.tenantId, shiftId);
  }
}
