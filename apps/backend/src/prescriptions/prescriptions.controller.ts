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
} from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { QueryPrescriptionDto } from './dto/query-prescription.dto';
import { AdministerMedicationDto } from './dto/administer-medication.dto';
import { AdministerSOSDto } from './dto/administer-sos.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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
@UseGuards(JwtAuthGuard, PermissionsGuard)
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
      user.tenantId,
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
    @CurrentUser() user: any,
  ) {
    return this.prescriptionsService.findAll(query, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar prescrição por ID' })
  @ApiResponse({ status: 200, description: 'Detalhes da prescrição' })
  @ApiResponse({ status: 404, description: 'Prescrição não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da prescrição (UUID)' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.prescriptionsService.findOne(id, user.tenantId);
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
      user.tenantId,
      user.id,
    );
  }

  @Delete(':id')
  @Roles('admin')
  @AuditAction('DELETE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover prescrição (soft delete)' })
  @ApiResponse({ status: 200, description: 'Prescrição removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Prescrição não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da prescrição (UUID)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.prescriptionsService.remove(id, user.tenantId, user.id);
  }

  // ========== ESTATÍSTICAS E DASHBOARD ==========

  @Get('stats/dashboard')
  @ApiOperation({ summary: 'Obter estatísticas para o dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas de prescrições ativas, vencimentos, etc.',
  })
  getDashboardStats(@CurrentUser() user: any) {
    return this.prescriptionsService.getDashboardStats(user.tenantId);
  }

  @Get('alerts/critical')
  @ApiOperation({ summary: 'Obter alertas críticos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de alertas (prescrições vencidas, sem receita, etc.)',
  })
  getCriticalAlerts(@CurrentUser() user: any) {
    return this.prescriptionsService.getCriticalAlerts(user.tenantId);
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
    @CurrentUser() user: any,
  ) {
    return this.prescriptionsService.getExpiringPrescriptions(
      parseInt(days, 10),
      user.tenantId,
    );
  }

  @Get('controlled/residents')
  @ApiOperation({ summary: 'Listar residentes com medicamentos controlados' })
  @ApiResponse({
    status: 200,
    description: 'Lista de residentes e seus medicamentos controlados',
  })
  getResidentsWithControlled(@CurrentUser() user: any) {
    return this.prescriptionsService.getResidentsWithControlled(user.tenantId);
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
    @CurrentUser() user: any,
  ) {
    return this.prescriptionsService.getReviewNeededPrescriptions(
      parseInt(days, 10),
      user.tenantId,
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
      user.tenantId,
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
      user.tenantId,
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
    @CurrentUser() user: any,
  ) {
    return this.prescriptionsService.getMedicationAdministrationDates(
      residentId,
      parseInt(year, 10),
      parseInt(month, 10),
      user.tenantId,
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
    @CurrentUser() user: any,
  ) {
    return this.prescriptionsService.getMedicationAdministrationsByDate(
      residentId,
      date,
      user.tenantId,
    );
  }
}
