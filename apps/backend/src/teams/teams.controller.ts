import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
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
import { TeamsService } from './teams.service';
import {
  CreateTeamDto,
  UpdateTeamDto,
  AddTeamMemberDto,
  ListTeamsQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequireAnyPermission } from '../permissions/decorators/require-permissions.decorator';
import { RequestWithUser } from '../common/types/request-with-user.type';
import { PermissionType } from '@prisma/client';

@ApiTags('Teams - Equipes de Cuidadores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @RequireAnyPermission(PermissionType.MANAGE_TEAMS)
  @ApiOperation({
    summary: 'Criar nova equipe de cuidadores',
    description:
      'Cria uma nova equipe de cuidadores para organização de turnos e plantões',
  })
  @ApiResponse({
    status: 201,
    description: 'Equipe criada com sucesso',
  })
  @ApiResponse({
    status: 409,
    description: 'Já existe uma equipe ativa com o mesmo nome',
  })
  create(@Body() createTeamDto: CreateTeamDto, @Req() req: RequestWithUser) {
    return this.teamsService.create(createTeamDto, req.user.id);
  }

  @Get()
  @RequireAnyPermission(PermissionType.VIEW_CARE_SHIFTS, PermissionType.MANAGE_TEAMS)
  @ApiOperation({
    summary: 'Listar equipes',
    description:
      'Lista todas as equipes com paginação e filtros opcionais',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de equipes retornada com sucesso',
  })
  findAll(@Query() query: ListTeamsQueryDto) {
    return this.teamsService.findAll(query);
  }

  @Get(':id')
  @RequireAnyPermission(PermissionType.VIEW_CARE_SHIFTS, PermissionType.MANAGE_TEAMS)
  @ApiOperation({
    summary: 'Buscar equipe por ID',
    description: 'Retorna os detalhes de uma equipe específica incluindo seus membros',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da equipe (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Equipe encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Equipe não encontrada',
  })
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Patch(':id')
  @RequireAnyPermission(PermissionType.MANAGE_TEAMS)
  @ApiOperation({
    summary: 'Atualizar equipe',
    description: 'Atualiza os dados de uma equipe existente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da equipe (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Equipe atualizada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Equipe não encontrada',
  })
  @ApiResponse({
    status: 409,
    description: 'Já existe outra equipe ativa com o mesmo nome',
  })
  update(
    @Param('id') id: string,
    @Body() updateTeamDto: UpdateTeamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.teamsService.update(id, updateTeamDto, req.user.id);
  }

  @Delete(':id')
  @RequireAnyPermission(PermissionType.MANAGE_TEAMS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar equipe',
    description:
      'Deleta uma equipe (soft delete). Não permite deletar equipes com plantões futuros.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da equipe (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 204,
    description: 'Equipe deletada com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Equipe possui plantões futuros agendados',
  })
  @ApiResponse({
    status: 404,
    description: 'Equipe não encontrada',
  })
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.teamsService.remove(id, req.user.id);
  }

  @Post(':id/members')
  @RequireAnyPermission(PermissionType.MANAGE_TEAMS)
  @ApiOperation({
    summary: 'Adicionar membro à equipe',
    description:
      'Adiciona um cuidador ou profissional de enfermagem à equipe',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da equipe (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 201,
    description: 'Membro adicionado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Usuário inativo ou cargo inadequado',
  })
  @ApiResponse({
    status: 404,
    description: 'Equipe ou usuário não encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Usuário já é membro ativo da equipe',
  })
  addMember(
    @Param('id') id: string,
    @Body() addMemberDto: AddTeamMemberDto,
    @Req() req: RequestWithUser,
  ) {
    return this.teamsService.addMember(id, addMemberDto, req.user.id);
  }

  @Delete(':id/members/:userId')
  @RequireAnyPermission(PermissionType.MANAGE_TEAMS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover membro da equipe',
    description: 'Remove um membro da equipe (soft delete)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da equipe (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'userId',
    description: 'ID do usuário a ser removido (UUID)',
    example: '660e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 204,
    description: 'Membro removido com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Equipe não encontrada ou usuário não é membro ativo',
  })
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.teamsService.removeMember(id, userId, req.user.id);
  }
}
