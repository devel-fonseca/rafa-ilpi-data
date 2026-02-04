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
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { ResidentsService } from './residents.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { DeleteResidentDto } from './dto/delete-resident.dto';
import { QueryResidentDto } from './dto/query-resident.dto';
import { TransferBedDto } from './dto/transfer-bed.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AuditEntity, AuditAction } from '../audit/audit.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { PermissionType } from '@prisma/client';
import { ReauthenticationGuard } from '../auth/guards/reauthentication.guard';
import { RequiresReauthentication } from '../auth/decorators/requires-reauthentication.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Residents')
@ApiBearerAuth()
@Controller('residents')
@UseGuards(JwtAuthGuard, PermissionsGuard) // Ordem: Auth primeiro, depois Permissions
@AuditEntity('RESIDENT')
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  @Post()
  @RequirePermissions(PermissionType.CREATE_RESIDENTS)
  @AuditAction('CREATE')
  @ApiOperation({ summary: 'Criar novo residente' })
  @ApiResponse({ status: 201, description: 'Residente criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  create(
    @Body() createResidentDto: CreateResidentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.residentsService.create(
      createResidentDto,
      user.id,
    );
  }

  @Get()
  @RequirePermissions(PermissionType.VIEW_RESIDENTS)
  @ApiOperation({ summary: 'Listar residentes' })
  @ApiResponse({ status: 200, description: 'Lista de residentes' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nome ou CPF' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrar por status' })
  @ApiQuery({ name: 'genero', required: false, description: 'Filtrar por gênero' })
  @ApiQuery({ name: 'page', required: false, description: 'Página', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Itens por página', example: 10 })
  findAll(
    @Query() query: QueryResidentDto,
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.residentsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_RESIDENTS)
  @ApiOperation({ summary: 'Buscar residente por ID' })
  @ApiResponse({ status: 200, description: 'Residente encontrado' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiParam({ name: 'id', description: 'ID do residente' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.residentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.UPDATE_RESIDENTS)
  @AuditAction('UPDATE')
  @ApiOperation({ summary: 'Atualizar residente' })
  @ApiResponse({ status: 200, description: 'Residente atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiParam({ name: 'id', description: 'ID do residente' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateResidentDto: UpdateResidentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.residentsService.update(
      id,
      updateResidentDto,
      user.id,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionType.DELETE_RESIDENTS)
  @RequiresReauthentication()
  @UseGuards(JwtAuthGuard, PermissionsGuard, ReauthenticationGuard)
  @AuditAction('DELETE')
  @ApiOperation({ summary: 'Remover residente (soft delete)' })
  @ApiResponse({ status: 200, description: 'Residente removido com sucesso' })
  @ApiResponse({ status: 400, description: 'changeReason obrigatório ou inválido' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão ou reautenticação necessária' })
  @ApiParam({ name: 'id', description: 'ID do residente' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() deleteResidentDto: DeleteResidentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.residentsService.remove(
      id,
      user.id,
      deleteResidentDto.changeReason,
    );
  }

  @Get(':id/history')
  @RequirePermissions(PermissionType.VIEW_RESIDENTS)
  @ApiOperation({ summary: 'Buscar histórico completo de alterações do residente' })
  @ApiResponse({ status: 200, description: 'Histórico de alterações' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiParam({ name: 'id', description: 'ID do residente' })
  getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.residentsService.getHistory(id);
  }

  @Get(':id/history/:versionNumber')
  @RequirePermissions(PermissionType.VIEW_RESIDENTS)
  @ApiOperation({ summary: 'Buscar versão específica do histórico' })
  @ApiResponse({ status: 200, description: 'Versão do histórico encontrada' })
  @ApiResponse({ status: 404, description: 'Versão não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiParam({ name: 'id', description: 'ID do residente' })
  @ApiParam({ name: 'versionNumber', description: 'Número da versão' })
  getHistoryVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionNumber') versionNumber: string,
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.residentsService.getHistoryVersion(
      id,
      parseInt(versionNumber, 10),
    );
  }

  @Get('stats/overview')
  @RequirePermissions(PermissionType.VIEW_REPORTS)
  @ApiOperation({ summary: 'Estatísticas gerais dos residentes' })
  @ApiResponse({ status: 200, description: 'Estatísticas dos residentes' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getStats(@CurrentUser() _user: JwtPayload) {
    return this.residentsService.getStats();
  }

  @Post(':id/transfer-bed')
  @RequirePermissions(PermissionType.UPDATE_RESIDENTS)
  @AuditAction('TRANSFER_BED')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transferir residente para outro leito' })
  @ApiParam({ name: 'id', description: 'ID do residente' })
  @ApiResponse({
    status: 200,
    description: 'Residente transferido com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Leito destino ocupado ou inválido',
  })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @UseInterceptors(AuditInterceptor)
  async transferBed(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() transferBedDto: TransferBedDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.residentsService.transferBed(
      id,
      transferBedDto,
      user.id,
    );
  }
}