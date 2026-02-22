import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RdcIndicatorsService } from './rdc-indicators.service';
import {
  CloseRdcMonthDto,
  CreateManualRdcCaseDto,
  QueryAnnualConsolidatedDto,
  QueryIndicatorReviewDto,
  QueryIndicatorsDto,
  ReopenRdcMonthDto,
  ReviewIndicatorCasesDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PermissionType } from '@prisma/client';
import { AuditEntity } from '../audit/audit.decorator';
import { FeatureGuard } from '../common/guards/feature.guard';
import { RequireFeatures } from '../common/decorators/require-features.decorator';

@ApiTags('RDC Indicators')
@ApiBearerAuth()
@Controller('rdc-indicators')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeatures('indicadores_mensais')
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
  async getIndicators(@Query() query: QueryIndicatorsDto, @CurrentUser() user: JwtPayload) {
    const tenantId = user.tenantId
    if (!tenantId) {
      throw new BadRequestException('Usuário não está associado a um tenant')
    }

    const year = query.year ? parseInt(query.year, 10) : new Date().getFullYear();
    const month = query.month ? parseInt(query.month, 10) : new Date().getMonth() + 1;

    return this.rdcIndicatorsService.getIndicatorsByMonth(tenantId, year, month);
  }

  @Get('history')
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @ApiOperation({
    summary: 'Obter histórico de indicadores',
    description:
      'Retorna histórico dos indicadores RDC para os últimos N meses (Acesso restrito: Administrador e Responsável Técnico)',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico retornado com sucesso',
  })
  async getHistory(
    @Query() query: QueryIndicatorsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const tenantId = user.tenantId
    if (!tenantId) {
      throw new BadRequestException('Usuário não está associado a um tenant')
    }

    return this.rdcIndicatorsService.getIndicatorsHistory(
      tenantId,
      query.months ?? 12,
    );
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
  async calculateIndicators(@Query() query: QueryIndicatorsDto, @CurrentUser() user: JwtPayload) {
    const tenantId = user.tenantId
    if (!tenantId) {
      throw new BadRequestException('Usuário não está associado a um tenant')
    }

    const year = query.year ? parseInt(query.year, 10) : new Date().getFullYear();
    const month = query.month ? parseInt(query.month, 10) : new Date().getMonth() + 1;

    await this.rdcIndicatorsService.calculateMonthlyIndicators(
      tenantId,
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

  @Get('review-cases')
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @ApiOperation({
    summary: 'Listar casos candidatos para revisão do indicador',
    description:
      'Retorna os casos do mês para confirmação/descarte por indicador RDC (Acesso restrito: Administrador e Responsável Técnico)',
  })
  @ApiResponse({
    status: 200,
    description: 'Casos candidatos retornados com sucesso',
  })
  async getReviewCases(
    @Query() query: QueryIndicatorReviewDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Usuário não está associado a um tenant');
    }

    return this.rdcIndicatorsService.getIndicatorCasesForReview(
      tenantId,
      query.year,
      query.month,
      query.indicatorType,
    );
  }

  @Post('review-cases')
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @ApiOperation({
    summary: 'Salvar revisão de casos de indicador',
    description:
      'Permite confirmar/descartar casos que compõem o numerador do indicador RDC (Acesso restrito: Administrador e Responsável Técnico)',
  })
  @ApiResponse({
    status: 200,
    description: 'Revisão salva com sucesso',
  })
  async reviewCases(
    @Body() body: ReviewIndicatorCasesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Usuário não está associado a um tenant');
    }

    return this.rdcIndicatorsService.reviewIndicatorCases({
      tenantId,
      year: body.year,
      month: body.month,
      indicatorType: body.indicatorType,
      decisions: body.decisions,
      reviewedBy: user.id,
      reviewedByName: user.name || user.email || 'Usuário',
    });
  }

  @Post('manual-case')
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @ApiOperation({
    summary: 'Registrar caso manual de indicador RDC',
    description:
      'Permite registrar um caso confirmado tardiamente e incluí-lo imediatamente no indicador do mês selecionado.',
  })
  @ApiResponse({
    status: 201,
    description: 'Caso manual registrado e confirmado com sucesso',
  })
  async createManualCase(
    @Body() body: CreateManualRdcCaseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Usuário não está associado a um tenant');
    }

    return this.rdcIndicatorsService.createManualIndicatorCase({
      tenantId,
      year: body.year,
      month: body.month,
      indicatorType: body.indicatorType,
      residentId: body.residentId,
      date: body.date,
      time: body.time,
      severity: body.severity,
      description: body.description,
      actionTaken: body.actionTaken,
      note: body.note,
      createdBy: user.id,
      createdByName: user.name || user.email || 'Usuário',
    });
  }

  @Post('close-month')
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @ApiOperation({
    summary: 'Fechar mês dos indicadores RDC',
    description:
      'Fecha formalmente o período mensal após revisão dos casos (Acesso restrito: Administrador e Responsável Técnico)',
  })
  @ApiResponse({
    status: 200,
    description: 'Mês fechado com sucesso',
  })
  async closeMonth(
    @Body() body: CloseRdcMonthDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Usuário não está associado a um tenant');
    }

    return this.rdcIndicatorsService.closeMonth({
      tenantId,
      year: body.year,
      month: body.month,
      note: body.note,
      closedBy: user.id,
      closedByName: user.name || user.email || 'Usuário',
    });
  }

  @Post('reopen-month')
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @ApiOperation({
    summary: 'Reabrir mês dos indicadores RDC',
    description:
      'Reabre o período mensal fechado para permitir revisão adicional de casos. Exige motivo para auditoria (Acesso restrito: Administrador e Responsável Técnico)',
  })
  @ApiResponse({
    status: 200,
    description: 'Mês reaberto com sucesso',
  })
  async reopenMonth(
    @Body() body: ReopenRdcMonthDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Usuário não está associado a um tenant');
    }

    return this.rdcIndicatorsService.reopenMonth({
      tenantId,
      year: body.year,
      month: body.month,
      reason: body.reason,
      reopenedBy: user.id,
      reopenedByName: user.name || user.email || 'Usuário',
    });
  }

  @Get('annual-consolidated')
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @ApiOperation({
    summary: 'Obter consolidado anual de indicadores RDC',
    description:
      'Retorna os 12 meses consolidados para envio anual à Vigilância Sanitária (Art. 60) (Acesso restrito: Administrador e Responsável Técnico)',
  })
  @ApiResponse({
    status: 200,
    description: 'Consolidado anual retornado com sucesso',
  })
  async getAnnualConsolidated(
    @Query() query: QueryAnnualConsolidatedDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Usuário não está associado a um tenant');
    }

    return this.rdcIndicatorsService.getAnnualConsolidated(tenantId, query.year);
  }
}
