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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ConditionsService } from './conditions.service';
import { CreateConditionDto } from './dto/create-condition.dto';
import { UpdateConditionDto } from './dto/update-condition-versioned.dto';
import { DeleteConditionDto } from './dto/delete-condition.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionType } from '@prisma/client';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RequiresReauthentication } from '../auth/decorators/requires-reauthentication.decorator';
import { ReauthenticationGuard } from '../auth/guards/reauthentication.guard';

@ApiTags('conditions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('conditions')
export class ConditionsController {
  constructor(private readonly conditionsService: ConditionsService) {}

  @Post()
  @RequirePermissions(PermissionType.CREATE_CONDITIONS)
  @ApiOperation({ summary: 'Registrar nova condição crônica/diagnóstico' })
  @ApiResponse({ status: 201, description: 'Condição registrada com sucesso' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  create(@CurrentUser() user: JwtPayload, @Body() createDto: CreateConditionDto) {
    return this.conditionsService.create(user.id, createDto);
  }

  @Get('resident/:residentId')
  @RequirePermissions(PermissionType.VIEW_CONDITIONS)
  @ApiOperation({ summary: 'Listar todas as condições de um residente' })
  @ApiResponse({ status: 200, description: 'Lista de condições' })
  findByResidentId(
    @CurrentUser() user: JwtPayload,
    @Param('residentId') residentId: string,
  ) {
    return this.conditionsService.findByResidentId(residentId);
  }

  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_CONDITIONS)
  @ApiOperation({ summary: 'Buscar uma condição específica' })
  @ApiResponse({ status: 200, description: 'Condição encontrada' })
  @ApiResponse({ status: 404, description: 'Condição não encontrada' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.conditionsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.UPDATE_CONDITIONS)
  @ApiOperation({ summary: 'Atualizar condição' })
  @ApiResponse({ status: 200, description: 'Condição atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Condição não encontrada' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() updateDto: UpdateConditionDto,
  ) {
    return this.conditionsService.update(
      user.id,
      id,
      updateDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionType.DELETE_CONDITIONS)
  @RequiresReauthentication()
  @UseGuards(JwtAuthGuard, PermissionsGuard, ReauthenticationGuard)
  @ApiOperation({
    summary: 'Remover condição',
    description: 'Remove o registro de condição (soft delete) com motivo obrigatório. Requer reautenticação.',
  })
  @ApiResponse({ status: 200, description: 'Condição removida com sucesso' })
  @ApiResponse({ status: 400, description: 'deleteReason obrigatório' })
  @ApiResponse({ status: 403, description: 'Reautenticação necessária' })
  @ApiResponse({ status: 404, description: 'Condição não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da condição (UUID)' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() deleteDto: DeleteConditionDto,
  ) {
    return this.conditionsService.remove(user.id, id, deleteDto.deleteReason);
  }

  @Get(':id/history')
  @RequirePermissions(PermissionType.VIEW_CONDITIONS)
  @ApiOperation({
    summary: 'Consultar histórico de condição',
    description: 'Retorna todas as versões de uma condição (RDC 502/2021)',
  })
  @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Condição não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da condição (UUID)' })
  getHistory(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.conditionsService.getHistory(id);
  }

  @Get(':id/history/:versionNumber')
  @RequirePermissions(PermissionType.VIEW_CONDITIONS)
  @ApiOperation({
    summary: 'Consultar versão específica do histórico',
    description: 'Retorna uma versão específica do histórico de condição',
  })
  @ApiResponse({ status: 200, description: 'Versão retornada com sucesso' })
  @ApiResponse({ status: 404, description: 'Condição ou versão não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da condição (UUID)' })
  @ApiParam({ name: 'versionNumber', description: 'Número da versão' })
  getHistoryVersion(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionNumber') versionNumber: string,
  ) {
    return this.conditionsService.getHistoryVersion(
      id,
      parseInt(versionNumber, 10),
    );
  }
}
