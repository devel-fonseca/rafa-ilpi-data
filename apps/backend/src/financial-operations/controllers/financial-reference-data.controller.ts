import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../permissions/guards/permissions.guard';
import { QueryReferenceDataDto } from '../dto';
import { FinancialReferenceDataService } from '../services/financial-reference-data.service';

@ApiTags('Financial Operations - Reference Data')
@ApiBearerAuth()
@Controller('financial/reference-data')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinancialReferenceDataController {
  constructor(
    private readonly referenceDataService: FinancialReferenceDataService,
  ) {}

  @Get('payment-methods')
  @RequirePermissions(PermissionType.VIEW_FINANCIAL_OPERATIONS)
  @ApiOperation({ summary: 'Listar métodos de pagamento financeiros' })
  listPaymentMethods(@Query() query: QueryReferenceDataDto) {
    return this.referenceDataService.listPaymentMethods(query.activeOnly);
  }

  @Get('bank-accounts')
  @RequirePermissions(PermissionType.VIEW_FINANCIAL_OPERATIONS)
  @ApiOperation({ summary: 'Listar contas bancárias financeiras' })
  listBankAccounts(@Query() query: QueryReferenceDataDto) {
    return this.referenceDataService.listBankAccounts(query.activeOnly);
  }
}

