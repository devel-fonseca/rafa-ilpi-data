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
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VitalSignsService } from './vital-signs.service';
import { CreateVitalSignDto } from './dto/create-vital-sign.dto';
import { UpdateVitalSignDto } from './dto/update-vital-sign.dto';
import { DeleteVitalSignDto } from './dto/delete-vital-sign.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionType } from '@prisma/client';
import { parseDateOnly } from '../utils/date.helpers';

@ApiTags('vital-signs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('vital-signs')
export class VitalSignsController {
  constructor(private readonly vitalSignsService: VitalSignsService) {}

  @Post()
  @RequirePermissions(PermissionType.CREATE_DAILY_RECORDS)
  @ApiOperation({ summary: 'Criar registro de sinais vitais' })
  @ApiResponse({
    status: 201,
    description: 'Sinal vital criado com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  create(@CurrentUser() user: JwtPayload, @Body() createDto: CreateVitalSignDto) {
    return this.vitalSignsService.create(user.id, createDto);
  }

  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_DAILY_RECORDS)
  @ApiOperation({ summary: 'Buscar sinal vital por ID' })
  @ApiResponse({ status: 200, description: 'Sinal vital encontrado' })
  @ApiResponse({ status: 404, description: 'Sinal vital não encontrado' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.vitalSignsService.findOne(id);
  }

  @Get('resident/:residentId')
  @RequirePermissions(PermissionType.VIEW_DAILY_RECORDS)
  @ApiOperation({ summary: 'Buscar sinais vitais de um residente' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Sinais vitais encontrados' })
  findByResident(
    @CurrentUser() user: JwtPayload,
    @Param('residentId') residentId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Extrair apenas YYYY-MM-DD das strings ISO enviadas pelo frontend
    const start = startDate ? parseDateOnly(startDate) : undefined;
    const end = endDate ? parseDateOnly(endDate) : undefined;

    return this.vitalSignsService.findByResident(
      residentId,
      start,
      end,
    );
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.UPDATE_DAILY_RECORDS)
  @ApiOperation({ summary: 'Atualizar sinal vital' })
  @ApiResponse({
    status: 200,
    description: 'Sinal vital atualizado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Sinal vital não encontrado',
  })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() updateDto: UpdateVitalSignDto,
  ) {
    return this.vitalSignsService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionType.DELETE_DAILY_RECORDS)
  @ApiOperation({
    summary: 'Remover sinal vital',
    description:
      'Remove o registro de sinal vital (soft delete) com motivo obrigatório',
  })
  @ApiResponse({ status: 200, description: 'Sinal vital removido com sucesso' })
  @ApiResponse({ status: 400, description: 'deleteReason obrigatório' })
  @ApiResponse({ status: 404, description: 'Sinal vital não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do sinal vital (UUID)' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() deleteDto: DeleteVitalSignDto,
  ) {
    return this.vitalSignsService.remove(
      user.id,
      id,
      deleteDto.deleteReason,
    );
  }

  @Get(':id/history')
  @RequirePermissions(PermissionType.VIEW_DAILY_RECORDS)
  @ApiOperation({
    summary: 'Consultar histórico de sinal vital',
    description: 'Retorna todas as versões de um sinal vital (RDC 502/2021)',
  })
  @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Sinal vital não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do sinal vital (UUID)' })
  getHistory(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vitalSignsService.getHistory(id);
  }

  @Get(':id/history/:versionNumber')
  @RequirePermissions(PermissionType.VIEW_DAILY_RECORDS)
  @ApiOperation({
    summary: 'Consultar versão específica do histórico',
    description:
      'Retorna uma versão específica do histórico de sinal vital',
  })
  @ApiResponse({ status: 200, description: 'Versão retornada com sucesso' })
  @ApiResponse({
    status: 404,
    description: 'Sinal vital ou versão não encontrada',
  })
  @ApiParam({ name: 'id', description: 'ID do sinal vital (UUID)' })
  @ApiParam({ name: 'versionNumber', description: 'Número da versão' })
  getHistoryVersion(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionNumber') versionNumber: string,
  ) {
    return this.vitalSignsService.getHistoryVersion(
      id,
      parseInt(versionNumber, 10),
    );
  }
}
