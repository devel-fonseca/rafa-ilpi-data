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
import { ResidentScheduleService } from './resident-schedule.service';
import { ResidentScheduleTasksService } from './resident-schedule-tasks.service';
import { AgendaService } from './agenda.service';
import {
  CreateScheduleConfigDto,
  UpdateScheduleConfigDto,
  CreateScheduledEventDto,
  UpdateScheduledEventDto,
  QueryDailyTasksDto,
} from './dto';
import { GetAgendaItemsDto } from './dto/get-agenda-items.dto';
import { CreateAlimentacaoConfigDto } from './dto/create-alimentacao-config.dto';
import { UpdateAlimentacaoConfigDto } from './dto/update-alimentacao-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { PermissionType } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AuditEntity, AuditAction } from '../audit/audit.decorator';
import { parseISO, startOfDay, endOfDay } from 'date-fns';
import { FeatureGuard } from '../common/guards/feature.guard';
import { RequireFeatures } from '../common/decorators/require-features.decorator';

@ApiTags('Resident Schedule')
@ApiBearerAuth()
@Controller('resident-schedule')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeatures('agenda')
@AuditEntity('RESIDENT_SCHEDULE')
export class ResidentScheduleController {
  constructor(
    private readonly scheduleService: ResidentScheduleService,
    private readonly tasksService: ResidentScheduleTasksService,
    private readonly agendaService: AgendaService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // CONFIGURAÇÕES (Registros Recorrentes)
  // ──────────────────────────────────────────────────────────────────────────

  @Post('configs')
  @RequirePermissions(PermissionType.MANAGE_RESIDENT_SCHEDULE)
  @AuditAction('CREATE')
  @ApiOperation({ summary: 'Criar configuração de registro obrigatório recorrente' })
  @ApiResponse({ status: 201, description: 'Configuração criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  @ApiResponse({ status: 409, description: 'Configuração duplicada' })
  create(@Body() dto: CreateScheduleConfigDto, @CurrentUser() user: JwtPayload) {
    return this.scheduleService.createConfig(dto, user.id);
  }

  @Get('configs')
  @RequirePermissions(PermissionType.VIEW_RESIDENT_SCHEDULE)
  @ApiOperation({
    summary: 'Listar todas as configurações ativas do tenant',
    description: 'Retorna todas as configurações ativas de registros obrigatórios de residentes ativos (usado para cálculo de cobertura)',
  })
  @ApiResponse({ status: 200, description: 'Lista de configurações' })
  getAllActiveConfigs(@CurrentUser() _user: JwtPayload) {
    return this.scheduleService.getAllActiveConfigs();
  }

  @Get('configs/resident/:residentId')
  @RequirePermissions(PermissionType.VIEW_RESIDENT_SCHEDULE)
  @ApiOperation({
    summary: 'Listar configurações de um residente',
    description: 'Retorna todas as configurações ativas de registros obrigatórios',
  })
  @ApiResponse({ status: 200, description: 'Lista de configurações' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  getConfigsByResident(
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.scheduleService.getConfigsByResident(residentId);
  }

  @Patch('configs/:id')
  @RequirePermissions(PermissionType.MANAGE_RESIDENT_SCHEDULE)
  @AuditAction('UPDATE')
  @ApiOperation({ summary: 'Atualizar configuração' })
  @ApiResponse({ status: 200, description: 'Configuração atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Configuração não encontrada' })
  @ApiResponse({ status: 409, description: 'Configuração duplicada' })
  @ApiParam({ name: 'id', description: 'ID da configuração (UUID)' })
  updateConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleConfigDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.scheduleService.updateConfig(id, dto, user.id);
  }

  @Delete('configs/:id')
  @RequirePermissions(PermissionType.MANAGE_RESIDENT_SCHEDULE)
  @AuditAction('DELETE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deletar configuração (soft delete)' })
  @ApiResponse({ status: 200, description: 'Configuração removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Configuração não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da configuração (UUID)' })
  deleteConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.scheduleService.deleteConfig(id, user.id);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ALIMENTACAO (Batch operations for 6 meal configs)
  // ──────────────────────────────────────────────────────────────────────────

  @Post('configs/alimentacao')
  @RequirePermissions(PermissionType.MANAGE_RESIDENT_SCHEDULE)
  @AuditAction('CREATE')
  @ApiOperation({
    summary: 'Criar 6 configurações de alimentação em batch',
    description:
      'Cria 6 configurações (uma para cada refeição obrigatória: Café da Manhã, Colação, Almoço, Lanche, Jantar, Ceia)',
  })
  @ApiResponse({
    status: 201,
    description: '6 configurações criadas com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Já existem configurações de alimentação para este residente',
  })
  createAlimentacaoConfigs(
    @Body() dto: CreateAlimentacaoConfigDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.scheduleService.createAlimentacaoConfigs(
      dto,
      user.id,
    );
  }

  @Patch('configs/alimentacao/:residentId')
  @RequirePermissions(PermissionType.MANAGE_RESIDENT_SCHEDULE)
  @AuditAction('UPDATE')
  @ApiOperation({
    summary: 'Atualizar as 6 configurações de alimentação em batch',
    description:
      'Atualiza todas as 6 configurações de refeições do residente',
  })
  @ApiResponse({
    status: 200,
    description: '6 configurações atualizadas com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Configurações não encontradas' })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  updateAlimentacaoConfigs(
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Body() dto: UpdateAlimentacaoConfigDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.scheduleService.updateAlimentacaoConfigs(
      residentId,
      dto,
      user.id,
    );
  }

  @Delete('configs/alimentacao/:residentId')
  @RequirePermissions(PermissionType.MANAGE_RESIDENT_SCHEDULE)
  @AuditAction('DELETE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deletar todas as 6 configurações de alimentação',
    description: 'Remove (soft delete) todas as 6 configurações de refeições',
  })
  @ApiResponse({
    status: 200,
    description: 'Configurações removidas com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Configurações não encontradas' })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  deleteAlimentacaoConfigs(
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.scheduleService.deleteAlimentacaoConfigs(
      residentId,
      user.id,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AGENDAMENTOS PONTUAIS
  // ──────────────────────────────────────────────────────────────────────────

  @Post('events')
  @RequirePermissions(PermissionType.MANAGE_RESIDENT_SCHEDULE)
  @AuditAction('CREATE')
  @ApiOperation({ summary: 'Criar agendamento pontual (vacina, consulta, exame)' })
  @ApiResponse({ status: 201, description: 'Agendamento criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  createEvent(@Body() dto: CreateScheduledEventDto, @CurrentUser() user: JwtPayload) {
    return this.scheduleService.createEvent(dto, user.id);
  }

  @Get('events/resident/:residentId')
  @RequirePermissions(PermissionType.VIEW_RESIDENT_SCHEDULE)
  @ApiOperation({
    summary: 'Listar agendamentos de um residente',
    description: 'Retorna todos os agendamentos pontuais ordenados por data',
  })
  @ApiResponse({ status: 200, description: 'Lista de agendamentos' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  getEventsByResident(
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.scheduleService.getEventsByResident(residentId);
  }

  @Patch('events/:id')
  @RequirePermissions(PermissionType.MANAGE_RESIDENT_SCHEDULE)
  @AuditAction('UPDATE')
  @ApiOperation({ summary: 'Atualizar agendamento' })
  @ApiResponse({ status: 200, description: 'Agendamento atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do agendamento (UUID)' })
  updateEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduledEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.scheduleService.updateEvent(id, dto, user.id);
  }

  @Delete('events/:id')
  @RequirePermissions(PermissionType.MANAGE_RESIDENT_SCHEDULE)
  @AuditAction('DELETE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deletar agendamento (soft delete)' })
  @ApiResponse({ status: 200, description: 'Agendamento removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do agendamento (UUID)' })
  deleteEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.scheduleService.deleteEvent(id, user.id);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TAREFAS DO DIA
  // ──────────────────────────────────────────────────────────────────────────

  @Get('tasks/resident/:residentId/daily')
  @RequirePermissions(PermissionType.VIEW_RESIDENT_SCHEDULE)
  @ApiOperation({
    summary: 'Listar tarefas diárias de um residente',
    description:
      'Retorna tarefas do dia (registros obrigatórios + agendamentos pontuais) para um residente específico',
  })
  @ApiResponse({ status: 200, description: 'Lista de tarefas do dia' })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  @ApiQuery({
    name: 'date',
    description: 'Data no formato YYYY-MM-DD (se não informado, usa data atual)',
    required: false,
  })
  getDailyTasksByResident(
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Query() query: QueryDailyTasksDto,
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.tasksService.getDailyTasksByResident(
      residentId,
      query.date,
    );
  }

  @Get('tasks/daily')
  @RequirePermissions(PermissionType.VIEW_RESIDENT_SCHEDULE)
  @ApiOperation({
    summary: 'Listar tarefas diárias de todos os residentes',
    description:
      'Retorna tarefas do dia (registros obrigatórios + agendamentos pontuais) de todos os residentes do tenant',
  })
  @ApiResponse({ status: 200, description: 'Lista de tarefas do dia' })
  @ApiQuery({
    name: 'date',
    description: 'Data no formato YYYY-MM-DD (se não informado, usa data atual)',
    required: false,
  })
  getDailyTasks(@Query() query: QueryDailyTasksDto, @CurrentUser() _user: JwtPayload) {
    return this.tasksService.getDailyTasks(query.date);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AGENDA CONSOLIDADA (Medicamentos + Eventos + Registros)
  // ──────────────────────────────────────────────────────────────────────────

  @Get('agenda/items')
  @RequirePermissions(PermissionType.VIEW_RESIDENT_SCHEDULE)
  @ApiOperation({
    summary: 'Buscar itens da agenda consolidados',
    description:
      'Retorna todos os itens da agenda (medicamentos, eventos agendados e registros obrigatórios) ' +
      'consolidados em uma única lista. Permite filtrar por residente e tipo de conteúdo.\n\n' +
      '**Modos de consulta:**\n' +
      '1. **Single date**: Fornece apenas `date` (visualização diária)\n' +
      '2. **Range query**: Fornece `startDate` e `endDate` (visualizações semanal/mensal)\n' +
      '3. **Default**: Se nenhum fornecido, usa data atual',
  })
  @ApiResponse({ status: 200, description: 'Lista de itens da agenda' })
  @ApiQuery({
    name: 'date',
    description: 'Data única no formato YYYY-MM-DD (modo single date)',
    required: false,
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Data inicial do intervalo no formato YYYY-MM-DD (modo range query)',
    required: false,
  })
  @ApiQuery({
    name: 'endDate',
    description: 'Data final do intervalo no formato YYYY-MM-DD (modo range query)',
    required: false,
  })
  @ApiQuery({
    name: 'residentId',
    description: 'ID do residente (UUID) - opcional, se não informado retorna todos',
    required: false,
  })
  @ApiQuery({
    name: 'filters',
    description: 'Filtros de tipo de conteúdo (array separado por vírgulas)',
    required: false,
    example: 'medications,vaccinations,feeding',
  })
  getAgendaItems(@Query() query: GetAgendaItemsDto, @CurrentUser() _user: JwtPayload) {
    return this.agendaService.getAgendaItems(query);
  }

  @Get('agenda/institutional-events')
  @RequirePermissions(PermissionType.VIEW_RESIDENT_SCHEDULE)
  @ApiOperation({
    summary: 'Buscar eventos institucionais para a agenda',
    description:
      'Retorna eventos institucionais (vencimento de documentos, treinamentos, reuniões, etc.) ' +
      'filtrados por visibilidade baseado no role do usuário.\n\n' +
      '**Modos de consulta:**\n' +
      '1. **Single date**: Fornece apenas `date` (visualização diária)\n' +
      '2. **Range query**: Fornece `startDate` e `endDate` (visualizações semanal/mensal)\n' +
      '3. **Default**: Se nenhum fornecido, usa data atual',
  })
  @ApiResponse({ status: 200, description: 'Lista de eventos institucionais' })
  @ApiQuery({
    name: 'date',
    description: 'Data única no formato YYYY-MM-DD (modo single date)',
    required: false,
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Data inicial do intervalo no formato YYYY-MM-DD (modo range query)',
    required: false,
  })
  @ApiQuery({
    name: 'endDate',
    description: 'Data final do intervalo no formato YYYY-MM-DD (modo range query)',
    required: false,
  })
  async getInstitutionalEvents(
    @CurrentUser() user: JwtPayload,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Determinar intervalo de datas
    let targetStartDate: Date;
    let targetEndDate: Date;

    if (startDate && endDate) {
      // Modo Range Query
      targetStartDate = parseISO(`${startDate}T00:00:00.000`);
      targetEndDate = parseISO(`${endDate}T23:59:59.999`);
    } else if (date) {
      // Modo Single Date (retrocompatível)
      const singleDate = parseISO(`${date}T12:00:00.000`);
      targetStartDate = startOfDay(singleDate);
      targetEndDate = endOfDay(singleDate);
    } else {
      // Modo Default: hoje
      const today = new Date();
      targetStartDate = startOfDay(today);
      targetEndDate = endOfDay(today);
    }

    // Verificar se usuário é RT
    const isRT = await this.agendaService.isUserRT(user.id);

    return this.agendaService.getInstitutionalEvents(
      targetStartDate,
      targetEndDate,
      user.role,
      isRT,
    );
  }
}
