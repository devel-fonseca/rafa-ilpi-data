import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PermissionType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequireAnyPermission } from '../permissions/decorators/require-permissions.decorator';
import { RequestWithUser } from '../common/types/request-with-user.type';
import { ShiftTemplatesService } from './shift-templates.service';
import { UpdateTenantShiftConfigDto } from './dto';

@ApiTags('Shift Templates - Turnos Fixos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('shift-templates')
export class ShiftTemplatesController {
  constructor(
    private readonly shiftTemplatesService: ShiftTemplatesService,
  ) {}

  @Get()
  @RequireAnyPermission(
    PermissionType.VIEW_CARE_SHIFTS,
    PermissionType.CONFIGURE_SHIFT_SETTINGS,
  )
  @ApiOperation({
    summary: 'Listar turnos fixos',
    description:
      'Retorna todos os turnos fixos (8h e 12h) com configuração do tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de turnos fixos retornada com sucesso',
  })
  findAll() {
    return this.shiftTemplatesService.findAll();
  }

  @Get('enabled')
  @RequireAnyPermission(
    PermissionType.VIEW_CARE_SHIFTS,
    PermissionType.CREATE_CARE_SHIFTS,
  )
  @ApiOperation({
    summary: 'Listar turnos habilitados',
    description:
      'Retorna apenas turnos habilitados para o tenant (para uso em dropdowns)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de turnos habilitados retornada com sucesso',
  })
  findEnabled() {
    return this.shiftTemplatesService.findEnabledForTenant();
  }

  @Get(':id')
  @RequireAnyPermission(
    PermissionType.VIEW_CARE_SHIFTS,
    PermissionType.CONFIGURE_SHIFT_SETTINGS,
  )
  @ApiOperation({
    summary: 'Buscar turno fixo por ID',
    description: 'Retorna detalhes de um turno específico',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do turno fixo (ShiftTemplate)',
  })
  @ApiResponse({
    status: 200,
    description: 'Turno retornado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Turno não encontrado',
  })
  findOne(@Param('id') id: string) {
    return this.shiftTemplatesService.findOne(id);
  }

  @Patch(':id/tenant-config')
  @RequireAnyPermission(PermissionType.CONFIGURE_SHIFT_SETTINGS)
  @ApiOperation({
    summary: 'Atualizar configuração do tenant para um turno',
    description:
      'Permite habilitar/desabilitar um turno ou customizar seu nome para o tenant',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do turno fixo (ShiftTemplate)',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuração atualizada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Turno não encontrado',
  })
  updateTenantConfig(
    @Param('id') id: string,
    @Body() updateDto: UpdateTenantShiftConfigDto,
    @Req() req: RequestWithUser,
  ) {
    return this.shiftTemplatesService.updateTenantConfig(
      id,
      updateDto,
      req.user.id,
    );
  }
}
