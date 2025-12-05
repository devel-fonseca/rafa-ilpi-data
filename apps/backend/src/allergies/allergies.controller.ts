import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AllergiesService } from './allergies.service';
import { CreateAllergyDto } from './dto/create-allergy.dto';
import { UpdateAllergyDto } from './dto/update-allergy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionType } from '@prisma/client';

@ApiTags('allergies')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('allergies')
export class AllergiesController {
  constructor(private readonly allergiesService: AllergiesService) {}

  @Post()
  @RequirePermissions(PermissionType.CREATE_ALLERGIES)
  @ApiOperation({ summary: 'Registrar nova alergia' })
  @ApiResponse({ status: 201, description: 'Alergia registrada com sucesso' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  create(@CurrentUser() user: any, @Body() createDto: CreateAllergyDto) {
    return this.allergiesService.create(user.tenantId, user.id, createDto);
  }

  @Get('resident/:residentId')
  @RequirePermissions(PermissionType.VIEW_ALLERGIES)
  @ApiOperation({ summary: 'Listar todas as alergias de um residente' })
  @ApiResponse({ status: 200, description: 'Lista de alergias' })
  findByResidentId(
    @CurrentUser() user: any,
    @Param('residentId') residentId: string,
  ) {
    return this.allergiesService.findByResidentId(user.tenantId, residentId);
  }

  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_ALLERGIES)
  @ApiOperation({ summary: 'Buscar uma alergia específica' })
  @ApiResponse({ status: 200, description: 'Alergia encontrada' })
  @ApiResponse({ status: 404, description: 'Alergia não encontrada' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.allergiesService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.UPDATE_ALLERGIES)
  @ApiOperation({ summary: 'Atualizar alergia' })
  @ApiResponse({ status: 200, description: 'Alergia atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Alergia não encontrada' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateAllergyDto,
  ) {
    return this.allergiesService.update(user.tenantId, user.id, id, updateDto);
  }

  @Delete(':id')
  @RequirePermissions(PermissionType.DELETE_ALLERGIES)
  @ApiOperation({ summary: 'Deletar alergia (soft delete)' })
  @ApiResponse({ status: 200, description: 'Alergia deletada com sucesso' })
  @ApiResponse({ status: 404, description: 'Alergia não encontrada' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.allergiesService.remove(user.tenantId, id);
  }
}
