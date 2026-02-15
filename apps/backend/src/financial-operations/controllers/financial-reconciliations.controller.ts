import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionType } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../permissions/guards/permissions.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RequireFeatures } from '../../common/decorators/require-features.decorator';
import {
  CreateReconciliationDto,
  QueryReconciliationsDto,
  QueryUnreconciledPaidTransactionsDto,
} from '../dto';
import { FinancialReconciliationsService } from '../services/financial-reconciliations.service';

@ApiTags('Financial Operations - Closures')
@ApiBearerAuth()
@Controller('financial/reconciliations')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeatures('financeiro_operacional')
export class FinancialReconciliationsController {
  constructor(
    private readonly reconciliationsService: FinancialReconciliationsService,
  ) {}

  @Get()
  @RequirePermissions(PermissionType.VIEW_FINANCIAL_OPERATIONS)
  @ApiOperation({ summary: 'Listar fechamentos financeiros' })
  findAll(@Query() query: QueryReconciliationsDto) {
    return this.reconciliationsService.findAll(query);
  }

  @Get('unreconciled-paid')
  @RequirePermissions(PermissionType.VIEW_FINANCIAL_OPERATIONS)
  @ApiOperation({ summary: 'Listar transações pagas ainda não incluídas em fechamento' })
  findUnreconciledPaid(@Query() query: QueryUnreconciledPaidTransactionsDto) {
    return this.reconciliationsService.findUnreconciledPaidTransactions(query);
  }

  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_FINANCIAL_OPERATIONS)
  @ApiOperation({ summary: 'Buscar fechamento financeiro por ID' })
  findOne(@Param('id') id: string) {
    return this.reconciliationsService.findOne(id);
  }

  @Post()
  @RequirePermissions(PermissionType.MANAGE_FINANCIAL_RECONCILIATION)
  @ApiOperation({ summary: 'Criar fechamento financeiro' })
  @ApiResponse({ status: 201, description: 'Fechamento criado com sucesso' })
  create(
    @Body() dto: CreateReconciliationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reconciliationsService.create(dto, user.id);
  }
}
