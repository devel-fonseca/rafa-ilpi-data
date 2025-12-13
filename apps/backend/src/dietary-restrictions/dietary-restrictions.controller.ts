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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DietaryRestrictionsService } from './dietary-restrictions.service';
import { CreateDietaryRestrictionDto } from './dto/create-dietary-restriction.dto';
import { UpdateDietaryRestrictionDto } from './dto/update-dietary-restriction.dto';
import { DeleteDietaryRestrictionDto } from './dto/delete-dietary-restriction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionType } from '@prisma/client';

@ApiTags('dietary-restrictions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dietary-restrictions')
export class DietaryRestrictionsController {
  constructor(
    private readonly dietaryRestrictionsService: DietaryRestrictionsService,
  ) {}

  @Post()
  @RequirePermissions(PermissionType.CREATE_DIETARY_RESTRICTIONS)
  @ApiOperation({ summary: 'Registrar nova restrição alimentar' })
  @ApiResponse({
    status: 201,
    description: 'Restrição alimentar registrada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  create(
    @CurrentUser() user: any,
    @Body() createDto: CreateDietaryRestrictionDto,
  ) {
    return this.dietaryRestrictionsService.create(
      user.tenantId,
      user.id,
      createDto,
    );
  }

  @Get('resident/:residentId')
  @RequirePermissions(PermissionType.VIEW_DIETARY_RESTRICTIONS)
  @ApiOperation({
    summary: 'Listar todas as restrições alimentares de um residente',
  })
  @ApiResponse({ status: 200, description: 'Lista de restrições alimentares' })
  findByResidentId(
    @CurrentUser() user: any,
    @Param('residentId') residentId: string,
  ) {
    return this.dietaryRestrictionsService.findByResidentId(
      user.tenantId,
      residentId,
    );
  }

  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_DIETARY_RESTRICTIONS)
  @ApiOperation({ summary: 'Buscar uma restrição alimentar específica' })
  @ApiResponse({ status: 200, description: 'Restrição alimentar encontrada' })
  @ApiResponse({
    status: 404,
    description: 'Restrição alimentar não encontrada',
  })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.dietaryRestrictionsService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.UPDATE_DIETARY_RESTRICTIONS)
  @ApiOperation({ summary: 'Atualizar restrição alimentar' })
  @ApiResponse({
    status: 200,
    description: 'Restrição alimentar atualizada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Restrição alimentar não encontrada',
  })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateDietaryRestrictionDto,
  ) {
    return this.dietaryRestrictionsService.update(
      user.tenantId,
      user.id,
      id,
      updateDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionType.DELETE_DIETARY_RESTRICTIONS)
  @ApiOperation({
    summary: 'Remover restrição alimentar',
    description: 'Remove o registro de restrição alimentar (soft delete) com motivo obrigatório',
  })
  @ApiResponse({ status: 200, description: 'Restrição alimentar removida com sucesso' })
  @ApiResponse({ status: 400, description: 'deleteReason obrigatório' })
  @ApiResponse({ status: 404, description: 'Restrição alimentar não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da restrição alimentar (UUID)' })
  remove(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() deleteDto: DeleteDietaryRestrictionDto,
  ) {
    return this.dietaryRestrictionsService.remove(
      user.tenantId,
      user.id,
      id,
      deleteDto.deleteReason,
    );
  }

  @Get(':id/history')
  @RequirePermissions(PermissionType.VIEW_DIETARY_RESTRICTIONS)
  @ApiOperation({
    summary: 'Consultar histórico de restrição alimentar',
    description: 'Retorna todas as versões de uma restrição alimentar (RDC 502/2021)',
  })
  @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Restrição alimentar não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da restrição alimentar (UUID)' })
  getHistory(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dietaryRestrictionsService.getHistory(id, user.tenantId);
  }

  @Get(':id/history/:versionNumber')
  @RequirePermissions(PermissionType.VIEW_DIETARY_RESTRICTIONS)
  @ApiOperation({
    summary: 'Consultar versão específica do histórico',
    description: 'Retorna uma versão específica do histórico de restrição alimentar',
  })
  @ApiResponse({ status: 200, description: 'Versão retornada com sucesso' })
  @ApiResponse({ status: 404, description: 'Restrição alimentar ou versão não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da restrição alimentar (UUID)' })
  @ApiParam({ name: 'versionNumber', description: 'Número da versão' })
  getHistoryVersion(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionNumber') versionNumber: string,
  ) {
    return this.dietaryRestrictionsService.getHistoryVersion(
      id,
      parseInt(versionNumber, 10),
      user.tenantId,
    );
  }
}
