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
  UseInterceptors,
} from '@nestjs/common';
import { DailyRecordsService } from './daily-records.service';
import { CreateDailyRecordDto } from './dto/create-daily-record.dto';
import { UpdateDailyRecordDto } from './dto/update-daily-record.dto';
import { QueryDailyRecordDto } from './dto/query-daily-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditEntity, AuditAction } from '../audit/audit.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Daily Records')
@ApiBearerAuth()
@Controller('daily-records')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@AuditEntity('DAILY_RECORD')
export class DailyRecordsController {
  constructor(private readonly dailyRecordsService: DailyRecordsService) {}

  @Post()
  @Roles('admin', 'user')
  @AuditAction('CREATE')
  @ApiOperation({ summary: 'Criar novo registro diário' })
  @ApiResponse({ status: 201, description: 'Registro criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  create(@Body() createDto: CreateDailyRecordDto, @CurrentUser() user: any) {
    return this.dailyRecordsService.create(
      createDto,
      user.tenantId,
      user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar registros diários com filtros' })
  @ApiResponse({
    status: 200,
    description: 'Lista de registros com paginação',
  })
  findAll(@Query() query: QueryDailyRecordDto, @CurrentUser() user: any) {
    return this.dailyRecordsService.findAll(query, user.tenantId);
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
    @CurrentUser() user: any,
  ) {
    return this.dailyRecordsService.findByResidentAndDate(
      residentId,
      date,
      user.tenantId,
    );
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
  findLatestByResidents(@CurrentUser() user: any) {
    return this.dailyRecordsService.findLatestByResidents(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar registro por ID' })
  @ApiResponse({ status: 200, description: 'Registro encontrado' })
  @ApiResponse({ status: 404, description: 'Registro não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do registro (UUID)' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.dailyRecordsService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  @Roles('admin', 'user')
  @AuditAction('UPDATE')
  @ApiOperation({ summary: 'Atualizar registro diário' })
  @ApiResponse({ status: 200, description: 'Registro atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Registro não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do registro (UUID)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateDailyRecordDto,
    @CurrentUser() user: any,
  ) {
    return this.dailyRecordsService.update(
      id,
      updateDto,
      user.tenantId,
      user.id,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @AuditAction('DELETE')
  @ApiOperation({ summary: 'Remover registro (soft delete)' })
  @ApiResponse({ status: 200, description: 'Registro removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Registro não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do registro (UUID)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.dailyRecordsService.remove(id, user.tenantId, user.id);
  }
}
