import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { PermissionsGuard } from '../../permissions/guards/permissions.guard';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator';
import {
  CreateTransactionDto,
  GenerateContractTransactionsDto,
  MarkTransactionPaidDto,
  QueryTransactionsDto,
  UpdateTransactionDto,
} from '../dto';
import { FinancialTransactionsService } from '../services/financial-transactions.service';

@ApiTags('Financial Operations - Transactions')
@ApiBearerAuth()
@Controller('financial/transactions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinancialTransactionsController {
  constructor(private readonly transactionsService: FinancialTransactionsService) {}

  @Post()
  @RequirePermissions(PermissionType.MANAGE_FINANCIAL_TRANSACTIONS)
  @ApiOperation({ summary: 'Criar transação financeira' })
  @ApiResponse({ status: 201, description: 'Transação criada com sucesso' })
  create(
    @Body() dto: CreateTransactionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.transactionsService.create(dto, user.id);
  }

  @Post('generate-from-contracts')
  @RequirePermissions(PermissionType.MANAGE_FINANCIAL_TRANSACTIONS)
  @ApiOperation({ summary: 'Gerar mensalidades automaticamente a partir dos contratos' })
  @ApiResponse({ status: 201, description: 'Geração concluída com sucesso' })
  generateFromContracts(
    @Body() dto: GenerateContractTransactionsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.transactionsService.generateFromContracts(dto, user.id);
  }

  @Get()
  @RequirePermissions(PermissionType.VIEW_FINANCIAL_OPERATIONS)
  @ApiOperation({ summary: 'Listar transações financeiras' })
  findAll(@Query() query: QueryTransactionsDto) {
    return this.transactionsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_FINANCIAL_OPERATIONS)
  @ApiOperation({ summary: 'Buscar transação financeira por ID' })
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.MANAGE_FINANCIAL_TRANSACTIONS)
  @ApiOperation({ summary: 'Atualizar transação financeira' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.transactionsService.update(id, dto, user.id);
  }

  @Post(':id/mark-paid')
  @RequirePermissions(PermissionType.MANAGE_FINANCIAL_TRANSACTIONS)
  @ApiOperation({ summary: 'Marcar transação como paga' })
  markPaid(
    @Param('id') id: string,
    @Body() dto: MarkTransactionPaidDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.transactionsService.markPaid(id, dto, user.id);
  }

  @Post(':id/cancel')
  @RequirePermissions(PermissionType.MANAGE_FINANCIAL_TRANSACTIONS)
  @ApiOperation({ summary: 'Cancelar transação financeira' })
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.transactionsService.cancel(id, user.id);
  }
}
