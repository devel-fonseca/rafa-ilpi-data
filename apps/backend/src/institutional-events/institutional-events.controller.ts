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
    @CurrentUser() user: any,
  ) {
    return this.institutionalEventsService.create(dto, user.id);
  }

  @Get()
  @RequirePermissions(PermissionType.VIEW_INSTITUTIONAL_EVENTS)
  @ApiOperation({ summary: 'Listar eventos institucionais com filtros' })
  @ApiResponse({ status: 200, description: 'Lista de eventos' })
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
    @CurrentUser() user: any,
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
    @CurrentUser() user: any,
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
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.institutionalEventsService.remove(id, user.id);
  }
}
