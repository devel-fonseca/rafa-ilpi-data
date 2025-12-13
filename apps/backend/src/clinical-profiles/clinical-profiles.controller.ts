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
import { ClinicalProfilesService } from './clinical-profiles.service';
import { CreateClinicalProfileDto } from './dto/create-clinical-profile.dto';
import { UpdateClinicalProfileDto } from './dto/update-clinical-profile.dto';
import { DeleteClinicalProfileDto } from './dto/delete-clinical-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionType } from '@prisma/client';

@ApiTags('clinical-profiles')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('clinical-profiles')
export class ClinicalProfilesController {
  constructor(
    private readonly clinicalProfilesService: ClinicalProfilesService,
  ) {}

  @Post()
  @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  @ApiOperation({ summary: 'Criar perfil clínico para um residente' })
  @ApiResponse({
    status: 201,
    description: 'Perfil clínico criado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Já existe perfil clínico para este residente',
  })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  create(@CurrentUser() user: any, @Body() createDto: CreateClinicalProfileDto) {
    return this.clinicalProfilesService.create(
      user.tenantId,
      user.id,
      createDto,
    );
  }

  @Get('resident/:residentId')
  @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)
  @ApiOperation({ summary: 'Buscar perfil clínico de um residente' })
  @ApiResponse({
    status: 200,
    description: 'Perfil clínico encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Perfil clínico não encontrado',
  })
  findByResidentId(
    @CurrentUser() user: any,
    @Param('residentId') residentId: string,
  ) {
    return this.clinicalProfilesService.findByResidentId(
      user.tenantId,
      residentId,
    );
  }

  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)
  @ApiOperation({ summary: 'Buscar perfil clínico por ID' })
  @ApiResponse({ status: 200, description: 'Perfil clínico encontrado' })
  @ApiResponse({ status: 404, description: 'Perfil clínico não encontrado' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.clinicalProfilesService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  @ApiOperation({ summary: 'Atualizar perfil clínico' })
  @ApiResponse({
    status: 200,
    description: 'Perfil clínico atualizado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Perfil clínico não encontrado',
  })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateClinicalProfileDto,
  ) {
    return this.clinicalProfilesService.update(
      user.tenantId,
      user.id,
      id,
      updateDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  @ApiOperation({
    summary: 'Remover perfil clínico',
    description: 'Remove o registro de perfil clínico (soft delete) com motivo obrigatório',
  })
  @ApiResponse({ status: 200, description: 'Perfil clínico removido com sucesso' })
  @ApiResponse({ status: 400, description: 'deleteReason obrigatório' })
  @ApiResponse({ status: 404, description: 'Perfil clínico não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do perfil clínico (UUID)' })
  remove(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() deleteDto: DeleteClinicalProfileDto,
  ) {
    return this.clinicalProfilesService.remove(
      user.tenantId,
      user.id,
      id,
      deleteDto.deleteReason,
    );
  }

  @Get(':id/history')
  @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)
  @ApiOperation({
    summary: 'Consultar histórico de perfil clínico',
    description: 'Retorna todas as versões de um perfil clínico (RDC 502/2021)',
  })
  @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Perfil clínico não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do perfil clínico (UUID)' })
  getHistory(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clinicalProfilesService.getHistory(id, user.tenantId);
  }

  @Get(':id/history/:versionNumber')
  @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)
  @ApiOperation({
    summary: 'Consultar versão específica do histórico',
    description: 'Retorna uma versão específica do histórico de perfil clínico',
  })
  @ApiResponse({ status: 200, description: 'Versão retornada com sucesso' })
  @ApiResponse({ status: 404, description: 'Perfil clínico ou versão não encontrada' })
  @ApiParam({ name: 'id', description: 'ID do perfil clínico (UUID)' })
  @ApiParam({ name: 'versionNumber', description: 'Número da versão' })
  getHistoryVersion(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionNumber') versionNumber: string,
  ) {
    return this.clinicalProfilesService.getHistoryVersion(
      id,
      parseInt(versionNumber, 10),
      user.tenantId,
    );
  }
}
