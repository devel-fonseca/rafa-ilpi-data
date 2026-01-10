import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RdcIndicatorsService } from './rdc-indicators.service';
import { QueryIndicatorsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionType } from '@prisma/client';
import { AuditEntity } from '../audit/audit.decorator';

@ApiTags('RDC Indicators')
@ApiBearerAuth()
@Controller('rdc-indicators')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AuditEntity('RDC_INDICATOR')
export class RdcIndicatorsController {
  constructor(private readonly rdcIndicatorsService: RdcIndicatorsService) {}

  @Get()
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @ApiOperation({
    summary: 'Obter indicadores RDC 502/2021',
    description:
      'Retorna os 6 indicadores mensais obrigatórios: mortalidade, diarreia aguda, escabiose, desidratação, úlcera de decúbito, desnutrição (Acesso restrito: Administrador e Responsável Técnico)',
  })
  @ApiResponse({
    status: 200,
    description: 'Indicadores retornados com sucesso',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para visualizar dashboard de conformidade' })
  async getIndicators(@Query() query: QueryIndicatorsDto, @CurrentUser() user: any) {
    const year = query.year ? parseInt(query.year, 10) : new Date().getFullYear();
    const month = query.month ? parseInt(query.month, 10) : new Date().getMonth() + 1;

    return this.rdcIndicatorsService.getIndicatorsByMonth(user.tenantId, year, month);
  }

  @Get('history')
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @ApiOperation({
    summary: 'Obter histórico de indicadores',
    description: 'Retorna histórico dos últimos 12 meses de indicadores RDC (Acesso restrito: Administrador e Responsável Técnico)',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico retornado com sucesso',
  })
  async getHistory(@CurrentUser() user: any) {
    return this.rdcIndicatorsService.getIndicatorsHistory(user.tenantId, 12);
  }

  @Post('calculate')
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @ApiOperation({
    summary: 'Calcular indicadores manualmente',
    description: 'Força recálculo dos indicadores para um mês específico (Acesso restrito: Administrador e Responsável Técnico)',
  })
  @ApiResponse({
    status: 200,
    description: 'Indicadores calculados com sucesso',
  })
  async calculateIndicators(@Query() query: QueryIndicatorsDto, @CurrentUser() user: any) {
    const year = query.year ? parseInt(query.year, 10) : new Date().getFullYear();
    const month = query.month ? parseInt(query.month, 10) : new Date().getMonth() + 1;

    await this.rdcIndicatorsService.calculateMonthlyIndicators(
      user.tenantId,
      year,
      month,
      user.id,
    );

    return {
      message: 'Indicadores calculados com sucesso',
      year,
      month,
    };
  }
}
