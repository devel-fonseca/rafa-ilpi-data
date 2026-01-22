import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
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
import { WeeklyScheduleService } from './weekly-schedule.service';
import {
  CreateWeeklyPatternDto,
  UpdateWeeklyPatternDto,
  CreatePatternAssignmentDto,
  UpdatePatternAssignmentDto,
} from './dto';

@ApiTags('Weekly Schedule - Padrão Semanal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('weekly-schedule')
export class WeeklyScheduleController {
  constructor(
    private readonly weeklyScheduleService: WeeklyScheduleService,
  ) {}

  // ========== CRUD de Padrões Semanais ==========

  @Post('patterns')
  @RequireAnyPermission(PermissionType.CONFIGURE_SHIFT_SETTINGS)
  @ApiOperation({
    summary: 'Criar novo padrão semanal',
    description:
      'Cria um novo padrão semanal. Ao criar, desativa o padrão anterior automaticamente.',
  })
  @ApiResponse({
    status: 201,
    description: 'Padrão semanal criado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
  })
  createPattern(
    @Body() createDto: CreateWeeklyPatternDto,
    @Req() req: RequestWithUser,
  ) {
    return this.weeklyScheduleService.createPattern(createDto, req.user.id);
  }

  @Get('patterns/active')
  @RequireAnyPermission(
    PermissionType.VIEW_CARE_SHIFTS,
    PermissionType.CONFIGURE_SHIFT_SETTINGS,
  )
  @ApiOperation({
    summary: 'Buscar padrão semanal ativo',
    description: 'Retorna o padrão semanal atualmente ativo',
  })
  @ApiResponse({
    status: 200,
    description: 'Padrão ativo retornado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Nenhum padrão ativo encontrado',
  })
  getActivePattern() {
    return this.weeklyScheduleService.getActivePattern();
  }

  @Get('patterns')
  @RequireAnyPermission(
    PermissionType.VIEW_CARE_SHIFTS,
    PermissionType.CONFIGURE_SHIFT_SETTINGS,
  )
  @ApiOperation({
    summary: 'Listar todos os padrões semanais',
    description: 'Retorna todos os padrões (histórico)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de padrões retornada com sucesso',
  })
  findAllPatterns() {
    return this.weeklyScheduleService.findAll();
  }

  @Get('patterns/:id')
  @RequireAnyPermission(
    PermissionType.VIEW_CARE_SHIFTS,
    PermissionType.CONFIGURE_SHIFT_SETTINGS,
  )
  @ApiOperation({
    summary: 'Buscar padrão semanal por ID',
    description: 'Retorna detalhes de um padrão específico',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do padrão semanal',
  })
  @ApiResponse({
    status: 200,
    description: 'Padrão retornado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Padrão não encontrado',
  })
  findOnePattern(@Param('id') id: string) {
    return this.weeklyScheduleService.findOne(id);
  }

  @Patch('patterns/:id')
  @RequireAnyPermission(PermissionType.CONFIGURE_SHIFT_SETTINGS)
  @ApiOperation({
    summary: 'Atualizar padrão semanal',
    description: 'Atualiza nome, descrição, datas ou status (ativo/inativo)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do padrão semanal',
  })
  @ApiResponse({
    status: 200,
    description: 'Padrão atualizado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Padrão não encontrado',
  })
  updatePattern(
    @Param('id') id: string,
    @Body() updateDto: UpdateWeeklyPatternDto,
    @Req() req: RequestWithUser,
  ) {
    return this.weeklyScheduleService.updatePattern(
      id,
      updateDto,
      req.user.id,
    );
  }

  @Delete('patterns/:id')
  @RequireAnyPermission(PermissionType.CONFIGURE_SHIFT_SETTINGS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar padrão semanal',
    description:
      'Deleta (soft delete) um padrão. Não permite deletar padrão ativo.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do padrão semanal',
  })
  @ApiResponse({
    status: 204,
    description: 'Padrão deletado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Não é possível deletar padrão ativo',
  })
  @ApiResponse({
    status: 404,
    description: 'Padrão não encontrado',
  })
  removePattern(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.weeklyScheduleService.remove(id, req.user.id);
  }

  // ========== Assignments (Designação de Equipes) ==========

  @Post('patterns/:patternId/assignments')
  @RequireAnyPermission(PermissionType.CONFIGURE_SHIFT_SETTINGS)
  @ApiOperation({
    summary: 'Criar assignment (designar equipe a dia+turno)',
    description:
      'Designa uma equipe a um dia da semana + turno específico no padrão',
  })
  @ApiParam({
    name: 'patternId',
    description: 'ID do padrão semanal',
  })
  @ApiResponse({
    status: 201,
    description: 'Assignment criado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Padrão, turno ou equipe não encontrados',
  })
  @ApiResponse({
    status: 409,
    description: 'Já existe assignment para este dia+turno',
  })
  createAssignment(
    @Param('patternId') patternId: string,
    @Body() createDto: CreatePatternAssignmentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.weeklyScheduleService.createAssignment(
      patternId,
      createDto,
      req.user.id,
    );
  }

  @Patch('assignments/:assignmentId')
  @RequireAnyPermission(PermissionType.CONFIGURE_SHIFT_SETTINGS)
  @ApiOperation({
    summary: 'Atualizar assignment (trocar equipe)',
    description: 'Altera a equipe designada a um dia+turno',
  })
  @ApiParam({
    name: 'assignmentId',
    description: 'ID do assignment',
  })
  @ApiResponse({
    status: 200,
    description: 'Assignment atualizado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Assignment ou equipe não encontrados',
  })
  updateAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body() updateDto: UpdatePatternAssignmentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.weeklyScheduleService.updateAssignment(
      assignmentId,
      updateDto,
      req.user.id,
    );
  }

  @Delete('assignments/:assignmentId')
  @RequireAnyPermission(PermissionType.CONFIGURE_SHIFT_SETTINGS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar assignment',
    description: 'Remove a designação de equipe de um dia+turno',
  })
  @ApiParam({
    name: 'assignmentId',
    description: 'ID do assignment',
  })
  @ApiResponse({
    status: 204,
    description: 'Assignment deletado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Assignment não encontrado',
  })
  removeAssignment(@Param('assignmentId') assignmentId: string) {
    return this.weeklyScheduleService.removeAssignment(assignmentId);
  }
}
