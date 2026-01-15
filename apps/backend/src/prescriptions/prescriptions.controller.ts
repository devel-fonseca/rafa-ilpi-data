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
  Request,
} from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { DeletePrescriptionDto } from './dto/delete-prescription.dto';
import { QueryPrescriptionDto } from './dto/query-prescription.dto';
import { AdministerMedicationDto } from './dto/administer-medication.dto';
import { AdministerSOSDto } from './dto/administer-sos.dto';
import { MedicalReviewPrescriptionDto } from './dto/medical-review-prescription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireFeatures } from '../common/decorators/require-features.decorator';
import { AuditEntity, AuditAction } from '../audit/audit.decorator';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { PermissionType } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Prescriptions')
@ApiBearerAuth()
@Controller('prescriptions')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeatures('medicacoes')
@AuditEntity('PRESCRIPTION')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  // ========== CRUD BÁSICO ==========

  @Post()
  @RequirePermissions(PermissionType.CREATE_PRESCRIPTIONS)
  @AuditAction('CREATE')
  @ApiOperation({ summary: 'Criar nova prescrição' })
  @ApiResponse({ status: 201, description: 'Prescrição criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  create(
    @Body() createPrescriptionDto: CreatePrescriptionDto,
    @CurrentUser() user: any,
  ) {
    return this.prescriptionsService.create(
      createPrescriptionDto,
      user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar prescrições com filtros e paginação' })
  @ApiResponse({
    status: 200,
    description: 'Lista de prescrições com metadados de paginação',
  })
  findAll(
    @Query() query: QueryPrescriptionDto,
  ) {
    return this.prescriptionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar prescrição por ID' })
  @ApiResponse({ status: 200, description: 'Detalhes da prescrição' })
  @ApiResponse({ status: 404, description: 'Prescrição não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da prescrição (UUID)' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.prescriptionsService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'user')
  @AuditAction('UPDATE')
  @ApiOperation({ summary: 'Atualizar prescrição' })
  @ApiResponse({ status: 200, description: 'Prescrição atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Prescrição não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da prescrição (UUID)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePrescriptionDto: UpdatePrescriptionDto,
    @CurrentUser() user: any,
  ) {
    return this.prescriptionsService.update(
      id,
      updatePrescriptionDto,
      user.id,
    );
  }

  @Patch(':id/medical-review')
  @RequirePermissions(PermissionType.UPDATE_PRESCRIPTIONS)
  @AuditAction('MEDICAL_REVIEW')
  @ApiOperation({
    summary: 'Registrar revisão médica de prescrição',
    description: 'Usado quando médico examina residente e emite nova receita com mesma prescrição. Atualiza dados da consulta médica e nova data de revisão.'
  })
  @ApiResponse({ status: 200, description: 'Revisão médica registrada com sucesso' })
  @ApiResponse({ status: 400, description: 'Prescrição inativa ou dados inválidos' })
  @ApiResponse({ status: 404, description: 'Prescrição não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da prescrição (UUID)' })
  recordMedicalReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() medicalReviewDto: MedicalReviewPrescriptionDto,
    @CurrentUser() user: any,
    @Request() req: any,
  ) {
    return this.prescriptionsService.recordMedicalReview(
      id,
      medicalReviewDto,
      user.id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':id')
  @Roles('admin')
  @AuditAction('DELETE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover prescrição (soft delete) com motivo obrigatório' })
  @ApiResponse({ status: 200, description: 'Prescrição removida com sucesso' })
  @ApiResponse({ status: 400, description: 'deleteReason inválido (mínimo 10 caracteres)' })
  @ApiResponse({ status: 404, description: 'Prescrição não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da prescrição (UUID)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() deletePrescriptionDto: DeletePrescriptionDto,
    @CurrentUser() user: any,
  ) {
    return this.prescriptionsService.remove(
      id,
      user.id,
      deletePrescriptionDto.deleteReason,
    );
  }

  // ========== VERSIONAMENTO E HISTÓRICO ==========

  @Get(':id/history')
  @ApiOperation({ summary: 'Obter histórico completo de versões de uma prescrição' })
  @ApiResponse({
    status: 200,
    description: 'Histórico completo de alterações com audit trail',
  })
  @ApiResponse({ status: 404, description: 'Prescrição não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da prescrição (UUID)' })
  getHistory(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.prescriptionsService.getHistory(id);
  }

  @Get(':id/history/:versionNumber')
  @ApiOperation({ summary: 'Obter versão específica do histórico' })
  @ApiResponse({
    status: 200,
    description: 'Dados completos de uma versão específica (previousData, newData, changedFields)',
  })
  @ApiResponse({ status: 404, description: 'Versão não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da prescrição (UUID)' })
  @ApiParam({ name: 'versionNumber', description: 'Número da versão (1, 2, 3, ...)' })
  getHistoryVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionNumber') versionNumber: string,
  ) {
    return this.prescriptionsService.getHistoryVersion(
      id,
      parseInt(versionNumber, 10),
    );
  }

  // ========== ESTATÍSTICAS E DASHBOARD ==========

  @Get('stats/dashboard')
  @ApiOperation({ summary: 'Obter estatísticas para o dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas de prescrições ativas, vencimentos, etc.',
  })
  getDashboardStats() {
    return this.prescriptionsService.getDashboardStats();
  }

  @Get('alerts/critical')
  @ApiOperation({ summary: 'Obter alertas críticos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de alertas (prescrições vencidas, sem receita, etc.)',
  })
  getCriticalAlerts() {
    return this.prescriptionsService.getCriticalAlerts();
  }

  @Get('expiring/list')
  @ApiOperation({ summary: 'Listar prescrições próximas do vencimento' })
  @ApiResponse({
    status: 200,
    description: 'Lista de prescrições que vencem em N dias',
  })
  @ApiQuery({
    name: 'days',
    description: 'Número de dias',
    required: false,
    example: '5',
  })
  getExpiringPrescriptions(
    @Query('days') days: string = '5',
  ) {
    return this.prescriptionsService.getExpiringPrescriptions(
      parseInt(days, 10),
    );
  }

  @Get('controlled/residents')
  @ApiOperation({ summary: 'Listar residentes com medicamentos controlados' })
  @ApiResponse({
    status: 200,
    description: 'Lista de residentes e seus medicamentos controlados',
  })
  getResidentsWithControlled() {
    return this.prescriptionsService.getResidentsWithControlled();
  }

  @Get('review-needed/list')
  @ApiOperation({ summary: 'Listar prescrições que precisam de revisão' })
  @ApiResponse({
    status: 200,
    description: 'Lista de prescrições que precisam ser revisadas em N dias',
  })
  @ApiQuery({
    name: 'days',
    description: 'Número de dias',
    required: false,
    example: '30',
  })
  getReviewNeededPrescriptions(
    @Query('days') days: string = '30',
  ) {
    return this.prescriptionsService.getReviewNeededPrescriptions(
      parseInt(days, 10),
    );
  }

  // ========== ADMINISTRAÇÃO DE MEDICAMENTOS ==========

  @Post('administer')
  @Roles('admin', 'user')
  @AuditAction('ADMINISTER_MEDICATION')
  @ApiOperation({ summary: 'Registrar administração de medicamento contínuo' })
  @ApiResponse({
    status: 201,
    description: 'Administração registrada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Medicamento não encontrado' })
  administerMedication(
    @Body() administerMedicationDto: AdministerMedicationDto,
    @CurrentUser() user: any,
  ) {
    return this.prescriptionsService.administerMedication(
      administerMedicationDto,
      user.id,
    );
  }

  @Post('administer-sos')
  @Roles('admin', 'user')
  @AuditAction('ADMINISTER_SOS')
  @ApiOperation({ summary: 'Registrar administração de medicação SOS' })
  @ApiResponse({
    status: 201,
    description: 'Administração SOS registrada com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Limite diário atingido' })
  @ApiResponse({ status: 404, description: 'Medicação SOS não encontrada' })
  administerSOSMedication(
    @Body() administerSOSDto: AdministerSOSDto,
    @CurrentUser() user: any,
  ) {
    return this.prescriptionsService.administerSOSMedication(
      administerSOSDto,
      user.id,
    );
  }

  // ========== CALENDÁRIO DE ADMINISTRAÇÕES ==========

  @Get('medication-administrations/resident/:residentId/dates')
  @ApiOperation({ summary: 'Buscar datas com administrações de um residente para o calendário' })
  @ApiResponse({
    status: 200,
    description: 'Array de datas (YYYY-MM-DD) que possuem administrações',
  })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  @ApiQuery({ name: 'year', description: 'Ano (ex: 2025)', required: true })
  @ApiQuery({ name: 'month', description: 'Mês (1-12)', required: true })
  getMedicationAdministrationDates(
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.prescriptionsService.getMedicationAdministrationDates(
      residentId,
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }

  @Get('medication-administrations/resident/:residentId/date/:date')
  @ApiOperation({ summary: 'Buscar administrações de um residente em uma data específica' })
  @ApiResponse({
    status: 200,
    description: 'Lista de administrações da data',
  })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  @ApiParam({ name: 'date', description: 'Data no formato YYYY-MM-DD' })
  getMedicationAdministrationsByDate(
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Param('date') date: string,
  ) {
    return this.prescriptionsService.getMedicationAdministrationsByDate(
      residentId,
      date,
    );
  }
}
