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
import { AllergiesService } from './allergies.service';
import { CreateAllergyDto } from './dto/create-allergy.dto';
import { UpdateAllergyDto } from './dto/update-allergy-versioned.dto';
import { DeleteAllergyDto } from './dto/delete-allergy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionType } from '@prisma/client';

@ApiTags('allergies')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('allergies')
export class AllergiesController {
  constructor(private readonly allergiesService: AllergiesService) {}

  @Post()
  @RequirePermissions(PermissionType.CREATE_ALLERGIES)
  @ApiOperation({ summary: 'Registrar nova alergia' })
  @ApiResponse({ status: 201, description: 'Alergia registrada com sucesso' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  create(@CurrentUser() user: any, @Body() createDto: CreateAllergyDto) {
    return this.allergiesService.create(user.id, createDto);
  }

  @Get('resident/:residentId')
  @RequirePermissions(PermissionType.VIEW_ALLERGIES)
  @ApiOperation({ summary: 'Listar todas as alergias de um residente' })
  @ApiResponse({ status: 200, description: 'Lista de alergias' })
  findByResidentId(
    @CurrentUser() user: any,
    @Param('residentId') residentId: string,
  ) {
    return this.allergiesService.findByResidentId(residentId);
  }

  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_ALLERGIES)
  @ApiOperation({ summary: 'Buscar uma alergia específica' })
  @ApiResponse({ status: 200, description: 'Alergia encontrada' })
  @ApiResponse({ status: 404, description: 'Alergia não encontrada' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.allergiesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.UPDATE_ALLERGIES)
  @ApiOperation({ summary: 'Atualizar alergia' })
  @ApiResponse({ status: 200, description: 'Alergia atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Alergia não encontrada' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateAllergyDto,
  ) {
    return this.allergiesService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionType.DELETE_ALLERGIES)
  @ApiOperation({
    summary: 'Remover alergia',
    description: 'Remove o registro de alergia (soft delete) com motivo obrigatório',
  })
  @ApiResponse({ status: 200, description: 'Alergia removida com sucesso' })
  @ApiResponse({ status: 400, description: 'deleteReason obrigatório' })
  @ApiResponse({ status: 404, description: 'Alergia não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da alergia (UUID)' })
  remove(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() deleteDto: DeleteAllergyDto,
  ) {
    return this.allergiesService.remove(user.id, id, deleteDto.deleteReason);
  }

  @Get(':id/history')
  @RequirePermissions(PermissionType.VIEW_ALLERGIES)
  @ApiOperation({
    summary: 'Consultar histórico de alergia',
    description: 'Retorna todas as versões de uma alergia (RDC 502/2021)',
  })
  @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Alergia não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da alergia (UUID)' })
  getHistory(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.allergiesService.getHistory(id);
  }

  @Get(':id/history/:versionNumber')
  @RequirePermissions(PermissionType.VIEW_ALLERGIES)
  @ApiOperation({
    summary: 'Consultar versão específica do histórico',
    description: 'Retorna uma versão específica do histórico de alergia',
  })
  @ApiResponse({ status: 200, description: 'Versão retornada com sucesso' })
  @ApiResponse({ status: 404, description: 'Alergia ou versão não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da alergia (UUID)' })
  @ApiParam({ name: 'versionNumber', description: 'Número da versão' })
  getHistoryVersion(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionNumber') versionNumber: string,
  ) {
    return this.allergiesService.getHistoryVersion(
      id,
      parseInt(versionNumber, 10),
    );
  }
}
