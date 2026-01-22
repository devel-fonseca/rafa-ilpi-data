import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
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
import { CareShiftsService } from './care-shifts.service';
import { RDCCalculationService, ShiftGeneratorService } from './services';
import {
  ListShiftsQueryDto,
  CreateShiftDto,
  UpdateShiftDto,
  AssignTeamDto,
  SubstituteTeamDto,
  SubstituteMemberDto,
  AddMemberDto,
  RDCCalculationQueryDto,
  CoverageReportQueryDto,
} from './dto';

@ApiTags('Care Shifts - Plantões de Cuidadores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('care-shifts')
export class CareShiftsController {
  constructor(
    private readonly careShiftsService: CareShiftsService,
    private readonly rdcCalculationService: RDCCalculationService,
    private readonly shiftGeneratorService: ShiftGeneratorService,
  ) {}

  // ========== CRUD de Plantões ==========

  @Post()
  @RequireAnyPermission(PermissionType.CREATE_CARE_SHIFTS)
  @ApiOperation({
    summary: 'Criar plantão manual',
    description:
      'Cria um plantão pontual (fora do padrão semanal). Útil para ajustes e plantões extras.',
  })
  @ApiResponse({
    status: 201,
    description: 'Plantão criado com sucesso',
  })
  @ApiResponse({
    status: 409,
    description: 'Já existe plantão para esta data+turno',
  })
  createShift(@Body() createDto: CreateShiftDto, @Req() req: RequestWithUser) {
    return this.careShiftsService.create(createDto, req.user.id);
  }

  @Get()
  @RequireAnyPermission(PermissionType.VIEW_CARE_SHIFTS)
  @ApiOperation({
    summary: 'Listar plantões de um período',
    description:
      'Retorna plantões entre startDate e endDate. Pode filtrar por turno ou equipe.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de plantões retornada com sucesso',
  })
  findAllShifts(@Query() query: ListShiftsQueryDto) {
    return this.careShiftsService.findAll(query);
  }

  @Get(':id')
  @RequireAnyPermission(PermissionType.VIEW_CARE_SHIFTS)
  @ApiOperation({
    summary: 'Buscar plantão por ID',
    description: 'Retorna detalhes completos de um plantão, incluindo membros e histórico',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do plantão',
  })
  @ApiResponse({
    status: 200,
    description: 'Plantão retornado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Plantão não encontrado',
  })
  findOneShift(@Param('id') id: string) {
    return this.careShiftsService.findOne(id);
  }

  @Patch(':id')
  @RequireAnyPermission(PermissionType.UPDATE_CARE_SHIFTS)
  @ApiOperation({
    summary: 'Atualizar plantão',
    description: 'Atualiza dados básicos do plantão (notas, status, equipe)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do plantão',
  })
  @ApiResponse({
    status: 200,
    description: 'Plantão atualizado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Plantão não encontrado',
  })
  updateShift(
    @Param('id') id: string,
    @Body() updateDto: UpdateShiftDto,
    @Req() req: RequestWithUser,
  ) {
    return this.careShiftsService.update(id, updateDto, req.user.id);
  }

  @Delete(':id')
  @RequireAnyPermission(PermissionType.DELETE_CARE_SHIFTS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar plantão',
    description: 'Deleta (soft delete) um plantão',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do plantão',
  })
  @ApiResponse({
    status: 204,
    description: 'Plantão deletado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Plantão não encontrado',
  })
  removeShift(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.careShiftsService.remove(id, req.user.id);
  }

  // ========== Designação de Equipes ==========

  @Post(':id/assign-team')
  @RequireAnyPermission(PermissionType.UPDATE_CARE_SHIFTS)
  @ApiOperation({
    summary: 'Designar equipe ao plantão',
    description:
      'Designa uma equipe ao plantão. Membros ativos da equipe são automaticamente adicionados.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do plantão',
  })
  @ApiResponse({
    status: 200,
    description: 'Equipe designada com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Equipe inativa ou não encontrada',
  })
  assignTeam(
    @Param('id') id: string,
    @Body() assignDto: AssignTeamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.careShiftsService.assignTeam(id, assignDto, req.user.id);
  }

  @Post(':id/substitute-team')
  @RequireAnyPermission(PermissionType.UPDATE_CARE_SHIFTS)
  @ApiOperation({
    summary: 'Substituir equipe inteira',
    description:
      'Substitui toda a equipe do plantão. Remove membros da equipe original e adiciona membros da nova equipe.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do plantão',
  })
  @ApiResponse({
    status: 200,
    description: 'Equipe substituída com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Equipe original não corresponde ou nova equipe inativa',
  })
  substituteTeam(
    @Param('id') id: string,
    @Body() substituteDto: SubstituteTeamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.careShiftsService.substituteTeam(
      id,
      substituteDto,
      req.user.id,
    );
  }

  // ========== Gerenciamento de Membros ==========

  @Post(':id/substitute-member')
  @RequireAnyPermission(PermissionType.UPDATE_CARE_SHIFTS)
  @ApiOperation({
    summary: 'Substituir membro individual',
    description:
      'Substitui um cuidador específico do plantão. VALIDAÇÃO: Bloqueia se novo membro já está em outro turno no mesmo dia.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do plantão',
  })
  @ApiResponse({
    status: 200,
    description: 'Membro substituído com sucesso',
  })
  @ApiResponse({
    status: 400,
    description:
      'Usuário inativo, cargo inadequado, ou conflito de turno no mesmo dia',
  })
  substituteMember(
    @Param('id') id: string,
    @Body() substituteDto: SubstituteMemberDto,
    @Req() req: RequestWithUser,
  ) {
    return this.careShiftsService.substituteMember(
      id,
      substituteDto,
      req.user.id,
    );
  }

  @Post(':id/add-member')
  @RequireAnyPermission(PermissionType.UPDATE_CARE_SHIFTS)
  @ApiOperation({
    summary: 'Adicionar membro extra ao plantão',
    description:
      'Adiciona um cuidador adicional ao plantão (reforço de equipe). VALIDAÇÃO: Bloqueia se usuário já está em outro turno no mesmo dia.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do plantão',
  })
  @ApiResponse({
    status: 200,
    description: 'Membro adicionado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description:
      'Usuário inativo, cargo inadequado, ou conflito de turno no mesmo dia',
  })
  @ApiResponse({
    status: 409,
    description: 'Usuário já está designado a este plantão',
  })
  addMember(
    @Param('id') id: string,
    @Body() addDto: AddMemberDto,
    @Req() req: RequestWithUser,
  ) {
    return this.careShiftsService.addMember(id, addDto, req.user.id);
  }

  @Delete(':id/members/:userId')
  @RequireAnyPermission(PermissionType.UPDATE_CARE_SHIFTS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover membro do plantão',
    description: 'Remove (soft delete) um cuidador do plantão',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do plantão',
  })
  @ApiParam({
    name: 'userId',
    description: 'ID do usuário a ser removido',
  })
  @ApiResponse({
    status: 204,
    description: 'Membro removido com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não está designado a este plantão',
  })
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.careShiftsService.removeMember(id, userId, req.user.id);
  }

  // ========== Histórico ==========

  @Get(':id/history')
  @RequireAnyPermission(PermissionType.VIEW_CARE_SHIFTS)
  @ApiOperation({
    summary: 'Buscar histórico de versões do plantão',
    description:
      'Retorna todas as alterações feitas no plantão (versionamento completo)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do plantão',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico retornado com sucesso',
  })
  getHistory(@Param('id') id: string) {
    return this.careShiftsService.getHistory(id);
  }

  // ========== RDC Compliance ==========

  @Get('rdc/calculate')
  @RequireAnyPermission(PermissionType.VIEW_RDC_COMPLIANCE)
  @ApiOperation({
    summary: 'Calcular mínimo RDC 502/2021',
    description:
      'Calcula o mínimo de cuidadores exigido pela RDC 502/2021 para uma data específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Cálculo RDC retornado com sucesso',
  })
  calculateRDC(@Query() query: RDCCalculationQueryDto) {
    return this.rdcCalculationService.calculateMinimumCaregiversRDC(
      query.date,
      query.shiftTemplateId,
    );
  }

  @Get('rdc/coverage-report')
  @RequireAnyPermission(PermissionType.VIEW_RDC_COMPLIANCE)
  @ApiOperation({
    summary: 'Gerar relatório de cobertura',
    description:
      'Gera relatório de conformidade RDC para um período, mostrando status de cada plantão',
  })
  @ApiResponse({
    status: 200,
    description: 'Relatório de cobertura retornado com sucesso',
  })
  getCoverageReport(@Query() query: CoverageReportQueryDto) {
    return this.rdcCalculationService.generateCoverageReport(
      query.startDate,
      query.endDate,
    );
  }

  // ========== Geração Automática ==========

  @Post('generate')
  @RequireAnyPermission(PermissionType.CONFIGURE_SHIFT_SETTINGS)
  @ApiOperation({
    summary: 'Gerar plantões do padrão semanal',
    description:
      'Gera plantões automaticamente para os próximos N dias (padrão: 14) com base no padrão semanal ativo. NÃO sobrescreve plantões existentes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Geração concluída',
  })
  @ApiResponse({
    status: 400,
    description: 'Nenhum padrão semanal ativo encontrado',
  })
  generateShifts(@Req() req: RequestWithUser) {
    return this.shiftGeneratorService.generateShiftsFromPattern(
      14,
      req.user.id,
    );
  }
}
