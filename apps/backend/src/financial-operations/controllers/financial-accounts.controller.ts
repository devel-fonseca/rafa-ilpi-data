import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PermissionType } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../permissions/guards/permissions.guard';
import {
  CreateAccountDto,
  QueryAccountsDto,
  QueryAccountStatementDto,
  UpdateAccountDto,
} from '../dto';
import { FinancialAccountsService } from '../services/financial-accounts.service';

@ApiTags('Financial Operations - Accounts')
@ApiBearerAuth()
@Controller('financial/accounts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinancialAccountsController {
  constructor(private readonly accountsService: FinancialAccountsService) {}

  @Get()
  @RequirePermissions(PermissionType.VIEW_FINANCIAL_OPERATIONS)
  @ApiOperation({ summary: 'Listar contas bancárias financeiras' })
  findAll(@Query() query: QueryAccountsDto) {
    return this.accountsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_FINANCIAL_OPERATIONS)
  @ApiOperation({ summary: 'Buscar conta bancária financeira por ID' })
  findOne(@Param('id') id: string) {
    return this.accountsService.findOne(id);
  }

  @Get(':id/statement')
  @RequirePermissions(PermissionType.VIEW_FINANCIAL_OPERATIONS)
  @ApiOperation({ summary: 'Consultar extrato da conta bancária por período' })
  findStatement(
    @Param('id') id: string,
    @Query() query: QueryAccountStatementDto,
  ) {
    return this.accountsService.getStatement(id, query);
  }

  @Post()
  @RequirePermissions(PermissionType.MANAGE_FINANCIAL_ACCOUNTS)
  @ApiOperation({ summary: 'Criar conta bancária financeira' })
  @ApiResponse({ status: 201, description: 'Conta criada com sucesso' })
  create(
    @Body() dto: CreateAccountDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accountsService.create(dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.MANAGE_FINANCIAL_ACCOUNTS)
  @ApiOperation({ summary: 'Atualizar conta bancária financeira' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accountsService.update(id, dto, user.id);
  }
}
