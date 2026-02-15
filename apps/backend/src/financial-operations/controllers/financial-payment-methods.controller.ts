import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PermissionType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../permissions/guards/permissions.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RequireFeatures } from '../../common/decorators/require-features.decorator';
import {
  CreatePaymentMethodDto,
  QueryPaymentMethodsDto,
  UpdatePaymentMethodDto,
} from '../dto';
import { FinancialPaymentMethodsService } from '../services/financial-payment-methods.service';

@ApiTags('Financial Operations - Payment Methods')
@ApiBearerAuth()
@Controller('financial/payment-methods')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeatures('financeiro_operacional')
export class FinancialPaymentMethodsController {
  constructor(
    private readonly paymentMethodsService: FinancialPaymentMethodsService,
  ) {}

  @Get()
  @RequirePermissions(PermissionType.VIEW_FINANCIAL_OPERATIONS)
  @ApiOperation({ summary: 'Listar métodos de pagamento financeiros' })
  findAll(@Query() query: QueryPaymentMethodsDto) {
    return this.paymentMethodsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_FINANCIAL_OPERATIONS)
  @ApiOperation({ summary: 'Buscar método de pagamento financeiro por ID' })
  findOne(@Param('id') id: string) {
    return this.paymentMethodsService.findOne(id);
  }

  @Post()
  @RequirePermissions(PermissionType.MANAGE_FINANCIAL_ACCOUNTS)
  @ApiOperation({ summary: 'Criar método de pagamento financeiro' })
  @ApiResponse({ status: 201, description: 'Método criado com sucesso' })
  create(@Body() dto: CreatePaymentMethodDto) {
    return this.paymentMethodsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.MANAGE_FINANCIAL_ACCOUNTS)
  @ApiOperation({ summary: 'Atualizar método de pagamento financeiro' })
  update(@Param('id') id: string, @Body() dto: UpdatePaymentMethodDto) {
    return this.paymentMethodsService.update(id, dto);
  }
}
