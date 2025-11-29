import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { AddUserToTenantDto } from './dto/add-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AuditEntity, AuditAction } from '../audit/audit.decorator';

interface JwtPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
}

@ApiTags('tenants')
@Controller('tenants')
@AuditEntity('tenant')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post('register')
  @Public()
  @ApiOperation({
    summary: 'Registrar nova ILPI',
    description: 'Cria um novo tenant (ILPI) e o primeiro usuário administrador',
  })
  @ApiResponse({ status: 201, description: 'ILPI criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'CNPJ já cadastrado' })
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Buscar dados do tenant atual',
    description: 'Retorna os dados do tenant do usuário logado',
  })
  @ApiResponse({ status: 200, description: 'Dados do tenant' })
  @ApiResponse({ status: 404, description: 'Tenant não encontrado' })
  findMe(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.findOne(user.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar todas as ILPIs',
    description: 'Lista todas as ILPIs cadastradas (apenas SUPERADMIN)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Lista de ILPIs' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.tenantsService.findAll(page, limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Buscar ILPI por ID',
    description: 'Retorna os dados de uma ILPI específica',
  })
  @ApiResponse({ status: 200, description: 'Dados da ILPI' })
  @ApiResponse({ status: 404, description: 'ILPI não encontrada' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @AuditAction('UPDATE')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Atualizar dados da ILPI',
    description: 'Atualiza os dados de uma ILPI (apenas ADMIN)',
  })
  @ApiResponse({ status: 200, description: 'ILPI atualizada com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'ILPI não encontrada' })
  update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenantsService.update(id, updateTenantDto, user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @AuditAction('DELETE')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Desativar ILPI',
    description: 'Desativa uma ILPI (soft delete)',
  })
  @ApiResponse({ status: 200, description: 'ILPI desativada com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'ILPI não encontrada' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tenantsService.remove(id, user.userId);
  }

  // Endpoints para gerenciar usuários do tenant

  @Post(':tenantId/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @AuditAction('CREATE_USER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Adicionar usuário à ILPI',
    description: 'Adiciona um novo funcionário/usuário à ILPI',
  })
  @ApiResponse({ status: 201, description: 'Usuário adicionado com sucesso' })
  @ApiResponse({ status: 400, description: 'Limite de usuários atingido' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 409, description: 'Email já cadastrado' })
  addUser(
    @Param('tenantId') tenantId: string,
    @Body() addUserDto: AddUserToTenantDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenantsService.addUser(tenantId, addUserDto, user.userId);
  }

  @Get(':tenantId/users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar usuários da ILPI',
    description: 'Lista todos os usuários/funcionários da ILPI',
  })
  @ApiResponse({ status: 200, description: 'Lista de usuários' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  listUsers(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenantsService.listUsers(tenantId, user.userId);
  }

  @Delete(':tenantId/users/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @AuditAction('DELETE_USER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remover usuário da ILPI',
    description: 'Remove um usuário/funcionário da ILPI (soft delete)',
  })
  @ApiResponse({ status: 200, description: 'Usuário removido com sucesso' })
  @ApiResponse({ status: 400, description: 'Operação inválida' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  removeUser(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenantsService.removeUser(tenantId, userId, user.userId);
  }
}