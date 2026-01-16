import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger'
import { VaccinationsService } from './vaccinations.service'
import { CreateVaccinationDto, UpdateVaccinationDto } from './dto';
import { DeleteVaccinationDto } from './dto/delete-vaccination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { PermissionType } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditEntity, AuditAction } from '../audit/audit.decorator';

@ApiTags('Vaccinations')
@ApiBearerAuth()
@Controller('vaccinations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AuditEntity('VACCINATION')
export class VaccinationsController {
  constructor(private readonly vaccinationsService: VaccinationsService) {}

  /**
   * Criar novo registro de vacinação
   */
  @Post()
  @RequirePermissions(PermissionType.CREATE_VACCINATIONS)
  @AuditAction('CREATE')
  @ApiOperation({ summary: 'Registrar nova vacinação' })
  @ApiResponse({ status: 201, description: 'Vacinação registrada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  create(@Body() createDto: CreateVaccinationDto, @CurrentUser() user: JwtPayload) {
    return this.vaccinationsService.create(createDto, user.id)
  }

  /**
   * Listar vacinações de um residente
   */
  @Get('resident/:residentId')
  @ApiOperation({
    summary: 'Listar vacinações por residente',
    description: 'Retorna todas as vacinações de um residente em ordem cronológica (mais recente primeiro)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de vacinações ordenada por data DESC',
  })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  findByResident(
    @Param('residentId', ParseUUIDPipe) residentId: string,
  ) {
    return this.vaccinationsService.findByResident(residentId)
  }

  /**
   * Obter detalhes de um registro de vacinação
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obter vacinação por ID' })
  @ApiResponse({ status: 200, description: 'Vacinação encontrada' })
  @ApiResponse({ status: 404, description: 'Vacinação não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da vacinação (UUID)' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vaccinationsService.findOne(id)
  }

  /**
   * Atualizar registro de vacinação
   */
  @Patch(':id')
  @RequirePermissions(PermissionType.UPDATE_VACCINATIONS)
  @AuditAction('UPDATE')
  @ApiOperation({ summary: 'Atualizar vacinação' })
  @ApiResponse({ status: 200, description: 'Vacinação atualizada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Vacinação não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da vacinação (UUID)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateVaccinationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vaccinationsService.update(id, updateDto, user.id)
  }

  /**
   * Remover registro de vacinação (soft delete) COM versionamento
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionType.DELETE_VACCINATIONS)
  @AuditAction('DELETE')
  @ApiOperation({
    summary: 'Remover vacinação',
    description: 'Remove o registro de vacinação (soft delete) com motivo obrigatório',
  })
  @ApiResponse({ status: 200, description: 'Vacinação removida com sucesso' })
  @ApiResponse({ status: 400, description: 'deleteReason obrigatório' })
  @ApiResponse({ status: 404, description: 'Vacinação não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da vacinação (UUID)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() deleteDto: DeleteVaccinationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vaccinationsService.remove(id, user.id, deleteDto.deleteReason);
  }

  /**
   * Consultar histórico completo de alterações de uma vacinação
   */
  @Get(':id/history')
  @ApiOperation({
    summary: 'Consultar histórico de vacinação',
    description: 'Retorna todas as versões de uma vacinação (RDC 502/2021)',
  })
  @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Vacinação não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da vacinação (UUID)' })
  getHistory(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vaccinationsService.getHistory(id);
  }

  /**
   * Consultar versão específica do histórico de uma vacinação
   */
  @Get(':id/history/:versionNumber')
  @ApiOperation({
    summary: 'Consultar versão específica do histórico',
    description: 'Retorna uma versão específica do histórico de vacinação',
  })
  @ApiResponse({ status: 200, description: 'Versão retornada com sucesso' })
  @ApiResponse({ status: 404, description: 'Vacinação ou versão não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da vacinação (UUID)' })
  @ApiParam({ name: 'versionNumber', description: 'Número da versão' })
  getHistoryVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionNumber') versionNumber: string,
  ) {
    return this.vaccinationsService.getHistoryVersion(
      id,
      parseInt(versionNumber, 10),
    );
  }
}
