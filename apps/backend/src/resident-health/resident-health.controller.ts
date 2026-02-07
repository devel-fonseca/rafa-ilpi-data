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
import { ResidentHealthService } from './resident-health.service';
import {
  CreateResidentBloodTypeDto,
  UpdateResidentBloodTypeDto,
  CreateResidentAnthropometryDto,
  UpdateResidentAnthropometryDto,
  CreateResidentDependencyAssessmentDto,
  UpdateResidentDependencyAssessmentDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionType } from '@prisma/client';
import { AuditEntity, AuditAction } from '../audit/audit.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('resident-health')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AuditEntity('RESIDENT_HEALTH')
@Controller('resident-health')
export class ResidentHealthController {
  constructor(private readonly residentHealthService: ResidentHealthService) {}

  // ============================================================================
  // SUMMARY (Resumo agregado)
  // ============================================================================

  @Get(':residentId/summary')
  @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)
  @ApiOperation({
    summary: 'Buscar resumo de saúde do residente',
    description:
      'Retorna tipo sanguíneo, última antropometria e avaliação de dependência vigente',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo de saúde retornado com sucesso',
  })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  getHealthSummary(
    @Param('residentId', ParseUUIDPipe) residentId: string,
  ) {
    return this.residentHealthService.getResidentHealthSummary(residentId);
  }

  // ============================================================================
  // BLOOD TYPE
  // ============================================================================

  @Get(':residentId/blood-type')
  @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)
  @ApiOperation({ summary: 'Buscar tipo sanguíneo do residente' })
  @ApiResponse({ status: 200, description: 'Tipo sanguíneo encontrado' })
  @ApiResponse({ status: 404, description: 'Tipo sanguíneo não encontrado' })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  getBloodType(@Param('residentId', ParseUUIDPipe) residentId: string) {
    return this.residentHealthService.getBloodType(residentId);
  }

  @Post('blood-type')
  @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  @AuditAction('CREATE')
  @ApiOperation({ summary: 'Registrar tipo sanguíneo do residente' })
  @ApiResponse({
    status: 201,
    description: 'Tipo sanguíneo registrado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Já existe registro de tipo sanguíneo para este residente',
  })
  createBloodType(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateResidentBloodTypeDto,
  ) {
    return this.residentHealthService.createBloodType(user.id, dto);
  }

  @Patch('blood-type/:id')
  @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  @AuditAction('UPDATE')
  @ApiOperation({ summary: 'Atualizar tipo sanguíneo do residente' })
  @ApiResponse({
    status: 200,
    description: 'Tipo sanguíneo atualizado com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Registro não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do registro de tipo sanguíneo (UUID)' })
  updateBloodType(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResidentBloodTypeDto,
  ) {
    return this.residentHealthService.updateBloodType(user.id, id, dto);
  }

  // ============================================================================
  // ANTHROPOMETRY
  // ============================================================================

  @Get(':residentId/anthropometry')
  @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)
  @ApiOperation({
    summary: 'Listar medições antropométricas do residente',
    description: 'Retorna histórico de peso/altura ordenado por data decrescente',
  })
  @ApiResponse({ status: 200, description: 'Lista de medições retornada' })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limite de registros (padrão: 10)',
    type: Number,
  })
  getAnthropometry(
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.residentHealthService.getAnthropometryRecords(
      residentId,
      parsedLimit,
    );
  }

  @Get(':residentId/anthropometry/latest')
  @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)
  @ApiOperation({ summary: 'Buscar última medição antropométrica' })
  @ApiResponse({ status: 200, description: 'Última medição retornada' })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  getLatestAnthropometry(
    @Param('residentId', ParseUUIDPipe) residentId: string,
  ) {
    return this.residentHealthService.getLatestAnthropometry(residentId);
  }

  @Post('anthropometry')
  @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  @AuditAction('CREATE')
  @ApiOperation({
    summary: 'Registrar nova medição antropométrica',
    description: 'Adiciona peso e altura com cálculo automático do IMC',
  })
  @ApiResponse({
    status: 201,
    description: 'Medição registrada com sucesso',
  })
  createAnthropometry(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateResidentAnthropometryDto,
  ) {
    return this.residentHealthService.createAnthropometry(user.id, dto);
  }

  @Patch('anthropometry/:id')
  @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  @AuditAction('UPDATE')
  @ApiOperation({ summary: 'Corrigir medição antropométrica' })
  @ApiResponse({
    status: 200,
    description: 'Medição atualizada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Registro não encontrado' })
  @ApiParam({ name: 'id', description: 'ID da medição (UUID)' })
  updateAnthropometry(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResidentAnthropometryDto,
  ) {
    return this.residentHealthService.updateAnthropometry(user.id, id, dto);
  }

  @Delete('anthropometry/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  @AuditAction('DELETE')
  @ApiOperation({
    summary: 'Excluir medição antropométrica',
    description: 'Soft delete com motivo obrigatório (RDC 502/2021)',
  })
  @ApiResponse({ status: 200, description: 'Medição excluída com sucesso' })
  @ApiResponse({ status: 404, description: 'Registro não encontrado' })
  @ApiParam({ name: 'id', description: 'ID da medição (UUID)' })
  deleteAnthropometry(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('deleteReason') deleteReason: string,
  ) {
    return this.residentHealthService.deleteAnthropometry(
      user.id,
      id,
      deleteReason,
    );
  }

  // ============================================================================
  // DEPENDENCY ASSESSMENT
  // ============================================================================

  @Get(':residentId/dependency-assessments')
  @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)
  @ApiOperation({
    summary: 'Listar avaliações de dependência do residente',
    description: 'Retorna histórico de avaliações ordenado por data decrescente',
  })
  @ApiResponse({ status: 200, description: 'Lista de avaliações retornada' })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  getDependencyAssessments(
    @Param('residentId', ParseUUIDPipe) residentId: string,
  ) {
    return this.residentHealthService.getDependencyAssessments(residentId);
  }

  @Get(':residentId/dependency-assessments/current')
  @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)
  @ApiOperation({
    summary: 'Buscar avaliação de dependência vigente',
    description: 'Retorna a avaliação atual (endDate = null)',
  })
  @ApiResponse({ status: 200, description: 'Avaliação vigente retornada' })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  getCurrentDependencyAssessment(
    @Param('residentId', ParseUUIDPipe) residentId: string,
  ) {
    return this.residentHealthService.getCurrentDependencyAssessment(residentId);
  }

  @Post('dependency-assessments')
  @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  @AuditAction('CREATE')
  @ApiOperation({
    summary: 'Registrar nova avaliação de dependência',
    description:
      'Cria nova avaliação e encerra automaticamente a anterior (se existir)',
  })
  @ApiResponse({
    status: 201,
    description: 'Avaliação registrada com sucesso',
  })
  createDependencyAssessment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateResidentDependencyAssessmentDto,
  ) {
    return this.residentHealthService.createDependencyAssessment(user.id, dto);
  }

  @Patch('dependency-assessments/:id')
  @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  @AuditAction('UPDATE')
  @ApiOperation({
    summary: 'Atualizar avaliação de dependência',
    description: 'Permite corrigir dados ou encerrar a avaliação',
  })
  @ApiResponse({
    status: 200,
    description: 'Avaliação atualizada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Avaliação não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da avaliação (UUID)' })
  updateDependencyAssessment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResidentDependencyAssessmentDto,
  ) {
    return this.residentHealthService.updateDependencyAssessment(
      user.id,
      id,
      dto,
    );
  }
}
