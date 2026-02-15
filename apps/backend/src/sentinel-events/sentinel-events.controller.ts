import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SentinelEventsService } from './sentinel-events.service';
import { QuerySentinelEventDto, UpdateSentinelEventStatusDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { PermissionType } from '@prisma/client';
import { AuditEntity } from '../audit/audit.decorator';
import { FeatureGuard } from '../common/guards/feature.guard';
import { RequireFeatures } from '../common/decorators/require-features.decorator';

@ApiTags('Sentinel Events')
@ApiBearerAuth()
@Controller('sentinel-events')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeatures('eventos_sentinela')
@AuditEntity('SENTINEL_EVENT')
export class SentinelEventsController {
  constructor(private readonly sentinelEventsService: SentinelEventsService) {}

  @Get()
  @RequirePermissions(PermissionType.VIEW_SENTINEL_EVENTS)
  @ApiOperation({
    summary: 'Listar eventos sentinela',
    description:
      'Retorna lista de eventos sentinela (quedas com lesão, tentativas de suicídio) com status de notificação à vigilância epidemiológica conforme RDC 502/2021 Art. 55 (Acesso restrito: Administrador e Responsável Técnico)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de eventos sentinela retornada com sucesso',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para visualizar eventos sentinela' })
  async findAll(@Query() query: QuerySentinelEventDto) {
    return this.sentinelEventsService.findAllSentinelEvents(query);
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.VIEW_SENTINEL_EVENTS)
  @ApiOperation({
    summary: 'Atualizar status de evento sentinela',
    description:
      'Atualiza status de notificação à vigilância (ENVIADO, CONFIRMADO) e registra protocolo de notificação (Acesso restrito: Administrador e Responsável Técnico)',
  })
  @ApiResponse({
    status: 200,
    description: 'Status atualizado com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Evento sentinela não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para atualizar eventos sentinela' })
  @ApiParam({
    name: 'id',
    description: 'ID do evento sentinela (UUID)',
    type: String,
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateSentinelEventStatusDto,
  ) {
    try {
      return await this.sentinelEventsService.updateSentinelEventStatus(
        id,
        updateDto,
      );
    } catch (error) {
      if (error.message === 'Evento sentinela não encontrado') {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
