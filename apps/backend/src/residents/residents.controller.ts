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
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ResidentsService } from './residents.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { QueryResidentDto } from './dto/query-resident.dto';
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
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Residents')
@ApiBearerAuth()
@Controller('residents')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@AuditEntity('RESIDENT')
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  @Post()
  @Roles('admin', 'user')
  @AuditAction('CREATE')
  @ApiOperation({ summary: 'Criar novo residente' })
  @ApiResponse({ status: 201, description: 'Residente criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  create(
    @Body() createResidentDto: CreateResidentDto,
    @CurrentUser() user: any,
  ) {
    return this.residentsService.create(
      createResidentDto,
      user.tenantId,
      user.sub,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar residentes' })
  @ApiResponse({ status: 200, description: 'Lista de residentes' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nome ou CPF' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrar por status' })
  @ApiQuery({ name: 'genero', required: false, description: 'Filtrar por gênero' })
  @ApiQuery({ name: 'page', required: false, description: 'Página', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Itens por página', example: 10 })
  findAll(
    @Query() query: QueryResidentDto,
    @CurrentUser() user: any,
  ) {
    return this.residentsService.findAll(query, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar residente por ID' })
  @ApiResponse({ status: 200, description: 'Residente encontrado' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiParam({ name: 'id', description: 'ID do residente' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.residentsService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  @Roles('admin', 'user')
  @AuditAction('UPDATE')
  @ApiOperation({ summary: 'Atualizar residente' })
  @ApiResponse({ status: 200, description: 'Residente atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiParam({ name: 'id', description: 'ID do residente' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateResidentDto: UpdateResidentDto,
    @CurrentUser() user: any,
  ) {
    return this.residentsService.update(
      id,
      updateResidentDto,
      user.tenantId,
      user.sub,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @AuditAction('DELETE')
  @ApiOperation({ summary: 'Remover residente (soft delete)' })
  @ApiResponse({ status: 200, description: 'Residente removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiParam({ name: 'id', description: 'ID do residente' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.residentsService.remove(id, user.tenantId, user.sub);
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Estatísticas gerais dos residentes' })
  @ApiResponse({ status: 200, description: 'Estatísticas dos residentes' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getStats(@CurrentUser() user: any) {
    return this.residentsService.getStats(user.tenantId);
  }
}