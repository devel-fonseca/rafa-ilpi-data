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
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DailyRecordsService } from './daily-records.service';
import { CreateDailyRecordDto } from './dto/create-daily-record.dto';
import { UpdateDailyRecordDto } from './dto/update-daily-record.dto';
import { DeleteDailyRecordDto } from './dto/delete-daily-record.dto';
import { RestoreVersionDailyRecordDto } from './dto/restore-version-daily-record.dto';
import { QueryDailyRecordDto } from './dto/query-daily-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
} from '@nestjs/swagger';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EventsGateway } from '../events/events.gateway';

@ApiTags('Daily Records')
@ApiBearerAuth()
@Controller('daily-records')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AuditEntity('DAILY_RECORD')
export class DailyRecordsController {
  constructor(
    private readonly dailyRecordsService: DailyRecordsService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) {}

  @Post()
  @RequirePermissions(PermissionType.CREATE_DAILY_RECORDS)
  @AuditAction('CREATE')
  @ApiOperation({ summary: 'Criar novo registro diário' })
  @ApiResponse({ status: 201, description: 'Registro criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  async create(@Body() createDto: CreateDailyRecordDto, @CurrentUser() user: JwtPayload) {
    const record = await this.dailyRecordsService.create(
      createDto,
      user.id,
    );

    // Broadcast de criação de registro via WebSocket (Sprint 3)
    if (user.tenantId) {
      const recordWithResident = record as typeof record & {
        resident?: { fullName?: string }
      }

      this.eventsGateway.emitDailyRecordCreated({
        tenantId: user.tenantId,
        recordType: createDto.type,
        residentId: createDto.residentId,
        residentName: recordWithResident.resident?.fullName || 'Residente',
        createdBy: user.name,
        createdByUserId: user.id,
        date: createDto.date,
        data: record,
      })
    }

    return record;
  }

  @Get()
  @ApiOperation({ summary: 'Listar registros diários com filtros' })
  @ApiResponse({
    status: 200,
    description: 'Lista de registros com paginação',
  })
  findAll(@Query() query: QueryDailyRecordDto, @CurrentUser() _user: JwtPayload) {
    return this.dailyRecordsService.findAll(query);
  }

  @Get('latest/by-residents')
  @ApiOperation({
    summary: 'Buscar último registro de cada residente',
    description:
      'Retorna o registro mais recente de cada residente do tenant. Usado para exibir status na seleção de residentes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista com último registro de cada residente',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          residentId: { type: 'string', format: 'uuid' },
          type: { type: 'string' },
          date: { type: 'string', format: 'date' },
          time: { type: 'string', pattern: 'HH:mm' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  findLatestByResidents(@CurrentUser() _user: JwtPayload) {
    return this.dailyRecordsService.findLatestByResidents();
  }

  @Get('resident/:residentId/latest')
  @ApiOperation({
    summary: 'Buscar últimos N registros de um residente',
    description: 'Retorna os últimos registros de um residente ordenados por data/hora (mais recentes primeiro).',
  })
  @ApiResponse({ status: 200, description: 'Lista dos últimos registros' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  async findLatestByResident(
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Query('limit') limit: string = '3',
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.dailyRecordsService.findLatestByResident(
      residentId,
      parseInt(limit, 10),
    );
  }

  @Get('resident/:residentId/last-vital-sign')
  @ApiOperation({
    summary: 'Buscar o último Sinal Vital de um residente',
    description: 'Retorna apenas o registro mais recente da tabela VitalSign.',
  })
  @ApiResponse({ status: 200, description: 'Último Sinal Vital encontrado' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado ou sem registros' })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  async findLastVitalSign(
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @CurrentUser() _user: JwtPayload,
  ) {
    const vitalSign = await this.dailyRecordsService.findLastVitalSign(residentId);

    if (!vitalSign) {
      return null;
    }

    // Retornar VitalSign diretamente (já está no formato correto)
    return {
      id: vitalSign.id,
      timestamp: vitalSign.timestamp,
      systolicBloodPressure: vitalSign.systolicBloodPressure,
      diastolicBloodPressure: vitalSign.diastolicBloodPressure,
      temperature: vitalSign.temperature,
      heartRate: vitalSign.heartRate,
      oxygenSaturation: vitalSign.oxygenSaturation,
      bloodGlucose: vitalSign.bloodGlucose,
    };
  }

  @Get('resident/:residentId/consolidated-vital-signs')
  @ApiOperation({
    summary: 'Buscar sinais vitais consolidados de um residente',
    description: 'Retorna o último valor registrado de cada parâmetro vital, mesmo que estejam em registros diferentes. Ideal para visualização rápida.',
  })
  @ApiResponse({ status: 200, description: 'Sinais vitais consolidados' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  async findConsolidatedVitalSigns(
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.dailyRecordsService.findConsolidatedVitalSigns(residentId);
  }

  @Get('resident/:residentId/date/:date')
  @ApiOperation({
    summary: 'Buscar todos os registros de um residente em uma data específica',
  })
  @ApiResponse({ status: 200, description: 'Lista de registros do dia' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  @ApiParam({
    name: 'date',
    description: 'Data no formato YYYY-MM-DD',
    example: '2025-11-15',
  })
  findByResidentAndDate(
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Param('date') date: string,
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.dailyRecordsService.findByResidentAndDate(
      residentId,
      date,
    );
  }

  @Get('resident/:residentId/dates')
  @ApiOperation({
    summary: 'Buscar datas com registros de um residente',
    description:
      'Retorna as datas que possuem registros para um residente em um determinado mês. Usado para indicadores no calendário.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array de datas em formato YYYY-MM-DD',
    schema: {
      type: 'array',
      items: { type: 'string', format: 'date' },
      example: ['2025-11-15', '2025-11-16', '2025-11-20'],
    },
  })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  findDatesWithRecords(
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Query('year') year: string,
    @Query('month') month: string,
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.dailyRecordsService.findDatesWithRecordsByResident(
      residentId,
      parseInt(year),
      parseInt(month),
    );
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'Buscar histórico de versões de um registro',
    description:
      'Retorna todas as versões anteriores do registro com detalhes de quem editou, quando e por quê',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico de versões do registro',
  })
  @ApiResponse({ status: 404, description: 'Registro não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do registro (UUID)' })
  getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.dailyRecordsService.getHistory(id);
  }

  @Post(':id/restore')
  @Roles('admin', 'user')
  @AuditAction('UPDATE')
  @ApiOperation({
    summary: 'Restaurar registro para uma versão anterior',
    description:
      'Restaura o registro para o estado de uma versão anterior. Cria uma nova entrada no histórico registrando a restauração.',
  })
  @ApiResponse({
    status: 200,
    description: 'Registro restaurado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou motivo ausente',
  })
  @ApiResponse({
    status: 404,
    description: 'Registro ou versão não encontrada',
  })
  @ApiParam({ name: 'id', description: 'ID do registro (UUID)' })
  restoreVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() restoreDto: RestoreVersionDailyRecordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dailyRecordsService.restoreVersion(
      id,
      restoreDto.versionId,
      restoreDto.restoreReason,
      user.id,
      user.name,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INDICADORES RDC 502/2021
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':id')
  @ApiOperation({ summary: 'Buscar registro por ID' })
  @ApiResponse({ status: 200, description: 'Registro encontrado' })
  @ApiResponse({ status: 404, description: 'Registro não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do registro (UUID)' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() _user: JwtPayload) {
    return this.dailyRecordsService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'user')
  @AuditAction('UPDATE')
  @ApiOperation({ summary: 'Atualizar registro diário (com motivo obrigatório)' })
  @ApiResponse({ status: 200, description: 'Registro atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou motivo ausente' })
  @ApiResponse({ status: 404, description: 'Registro não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do registro (UUID)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateDailyRecordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dailyRecordsService.update(
      id,
      updateDto,
      user.id,
      user.name,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @AuditAction('DELETE')
  @ApiOperation({ summary: 'Remover registro (soft delete com motivo obrigatório)' })
  @ApiResponse({ status: 200, description: 'Registro removido com sucesso' })
  @ApiResponse({ status: 400, description: 'Motivo da exclusão ausente' })
  @ApiResponse({ status: 404, description: 'Registro não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do registro (UUID)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() deleteDto: DeleteDailyRecordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dailyRecordsService.remove(
      id,
      deleteDto,
      user.id,
      user.name,
    );
  }
}
