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
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger'
import { VaccinationsService } from './vaccinations.service'
import { CreateVaccinationDto, UpdateVaccinationDto } from './dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AuditEntity, AuditAction } from '../audit/audit.decorator'

@ApiTags('Vaccinations')
@ApiBearerAuth()
@Controller('vaccinations')
@UseGuards(JwtAuthGuard, RolesGuard)
@AuditEntity('VACCINATION')
export class VaccinationsController {
  constructor(private readonly vaccinationsService: VaccinationsService) {}

  /**
   * Criar novo registro de vacinação
   */
  @Post()
  @Roles('admin', 'user')
  @AuditAction('CREATE')
  @ApiOperation({ summary: 'Registrar nova vacinação' })
  @ApiResponse({ status: 201, description: 'Vacinação registrada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  create(@Body() createDto: CreateVaccinationDto, @CurrentUser() user: any) {
    return this.vaccinationsService.create(createDto, user.tenantId, user.id)
  }

  /**
   * Listar vacinações de um residente
   */
  @Get('resident/:residentId')
  @ApiOperation({
    summary: 'Listar vacinações por residente',
    description: 'Retorna todas as vacinações de um residente em ordem cronológica (mais recente primeiro)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de vacinações ordenada por data DESC',
  })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  findByResident(
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @CurrentUser() user: any,
  ) {
    return this.vaccinationsService.findByResident(residentId, user.tenantId)
  }

  /**
   * Obter detalhes de um registro de vacinação
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obter vacinação por ID' })
  @ApiResponse({ status: 200, description: 'Vacinação encontrada' })
  @ApiResponse({ status: 404, description: 'Vacinação não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da vacinação (UUID)' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.vaccinationsService.findOne(id, user.tenantId)
  }

  /**
   * Atualizar registro de vacinação
   */
  @Patch(':id')
  @Roles('admin', 'user')
  @AuditAction('UPDATE')
  @ApiOperation({ summary: 'Atualizar vacinação' })
  @ApiResponse({ status: 200, description: 'Vacinação atualizada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Vacinação não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da vacinação (UUID)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateVaccinationDto,
    @CurrentUser() user: any,
  ) {
    return this.vaccinationsService.update(id, updateDto, user.tenantId, user.id)
  }

  /**
   * Remover registro de vacinação (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'user')
  @AuditAction('DELETE')
  @ApiOperation({
    summary: 'Remover vacinação',
    description: 'Remove o registro de vacinação (soft delete)',
  })
  @ApiResponse({ status: 200, description: 'Vacinação removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Vacinação não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da vacinação (UUID)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.vaccinationsService.remove(id, user.tenantId, user.id)
  }
}
