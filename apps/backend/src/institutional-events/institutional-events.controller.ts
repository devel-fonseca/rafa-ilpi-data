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
import { InstitutionalEventsService } from './institutional-events.service';
import {
  CreateInstitutionalEventDto,
  UpdateInstitutionalEventDto,
  GetInstitutionalEventsDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { PermissionType } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditEntity, AuditAction } from '../audit/audit.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Institutional Events')
@ApiBearerAuth()
@Controller('institutional-events')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AuditEntity('INSTITUTIONAL_EVENTS')
export class InstitutionalEventsController {
  constructor(
    private readonly institutionalEventsService: InstitutionalEventsService,
  ) {}

  @Post()
  @RequirePermissions(PermissionType.CREATE_INSTITUTIONAL_EVENTS)
  @AuditAction('CREATE')
  @ApiOperation({ summary: 'Criar novo evento institucional' })
  @ApiResponse({ status: 201, description: 'Evento criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  create(
    @Body() dto: CreateInstitutionalEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.institutionalEventsService.create(dto, user.id);
  }

  @Get()
  @RequirePermissions(PermissionType.VIEW_INSTITUTIONAL_EVENTS)
  @ApiOperation({
    summary: 'Listar eventos institucionais com filtros',
    description:
      'Retorna eventos institucionais com suporte a filtros.\n\n' +
      '**Modos de consulta por data:**\n' +
      '1. **Single date**: Fornece apenas `date` (YYYY-MM-DD) - busca eventos daquele dia específico\n' +
      '2. **Range query**: Fornece `startDate` e `endDate` (YYYY-MM-DD) - busca eventos no intervalo\n' +
      '3. **Sem filtro**: Se nenhum fornecido, retorna todos os eventos',
  })
  @ApiResponse({ status: 200, description: 'Lista de eventos' })
  @ApiQuery({
    name: 'date',
    description: 'Data única no formato YYYY-MM-DD (modo single date)',
    required: false,
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Data inicial no formato YYYY-MM-DD (modo range)',
    required: false,
  })
  @ApiQuery({
    name: 'endDate',
    description: 'Data final no formato YYYY-MM-DD (modo range)',
    required: false,
  })
  @ApiQuery({
    name: 'eventType',
    description: 'Tipo de evento institucional',
    required: false,
    enum: ['DOCUMENT_EXPIRY', 'TRAINING', 'MEETING', 'OTHER'],
  })
  @ApiQuery({
    name: 'visibility',
    description: 'Visibilidade do evento',
    required: false,
    enum: ['ALL_USERS', 'ADMIN_ONLY', 'RT_ONLY'],
  })
  @ApiQuery({
    name: 'status',
    description: 'Status do evento',
    required: false,
    enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED'],
  })
  findAll(@Query() dto: GetInstitutionalEventsDto) {
    return this.institutionalEventsService.findAll(dto);
  }

  @Get('expiring-documents')
  @RequirePermissions(PermissionType.VIEW_INSTITUTIONAL_EVENTS)
  @ApiOperation({ summary: 'Buscar documentos com vencimento próximo' })
  @ApiResponse({ status: 200, description: 'Lista de documentos expirando' })
  findExpiringDocuments() {
    return this.institutionalEventsService.findExpiringDocuments(30);
  }

  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_INSTITUTIONAL_EVENTS)
  @ApiOperation({ summary: 'Buscar evento por ID' })
  @ApiResponse({ status: 200, description: 'Evento encontrado' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do evento (UUID)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.institutionalEventsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_EVENTS)
  @AuditAction('UPDATE')
  @ApiOperation({ summary: 'Atualizar evento institucional' })
  @ApiResponse({ status: 200, description: 'Evento atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do evento (UUID)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInstitutionalEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.institutionalEventsService.update(id, dto, user.id);
  }

  @Patch(':id/complete')
  @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_EVENTS)
  @AuditAction('UPDATE')
  @ApiOperation({ summary: 'Marcar evento como concluído' })
  @ApiResponse({ status: 200, description: 'Evento marcado como concluído' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do evento (UUID)' })
  markAsCompleted(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.institutionalEventsService.markAsCompleted(id, user.id);
  }

  @Delete(':id')
  @RequirePermissions(PermissionType.DELETE_INSTITUTIONAL_EVENTS)
  @AuditAction('DELETE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deletar evento institucional (soft delete)' })
  @ApiResponse({ status: 200, description: 'Evento removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do evento (UUID)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.institutionalEventsService.remove(id, user.id);
  }
}
