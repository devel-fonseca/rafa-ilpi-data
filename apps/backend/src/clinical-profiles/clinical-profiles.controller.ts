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
import { ClinicalProfilesService } from './clinical-profiles.service';
import { CreateClinicalProfileDto } from './dto/create-clinical-profile.dto';
import { UpdateClinicalProfileDto } from './dto/update-clinical-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionType } from '@prisma/client';

@ApiTags('clinical-profiles')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('clinical-profiles')
export class ClinicalProfilesController {
  constructor(
    private readonly clinicalProfilesService: ClinicalProfilesService,
  ) {}

  @Post()
  @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  @ApiOperation({ summary: 'Criar perfil clínico para um residente' })
  @ApiResponse({
    status: 201,
    description: 'Perfil clínico criado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Já existe perfil clínico para este residente',
  })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  create(@CurrentUser() user: any, @Body() createDto: CreateClinicalProfileDto) {
    return this.clinicalProfilesService.create(
      user.tenantId,
      user.id,
      createDto,
    );
  }

  @Get('resident/:residentId')
  @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)
  @ApiOperation({ summary: 'Buscar perfil clínico de um residente' })
  @ApiResponse({
    status: 200,
    description: 'Perfil clínico encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Perfil clínico não encontrado',
  })
  findByResidentId(
    @CurrentUser() user: any,
    @Param('residentId') residentId: string,
  ) {
    return this.clinicalProfilesService.findByResidentId(
      user.tenantId,
      residentId,
    );
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  @ApiOperation({ summary: 'Atualizar perfil clínico' })
  @ApiResponse({
    status: 200,
    description: 'Perfil clínico atualizado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Perfil clínico não encontrado',
  })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateClinicalProfileDto,
  ) {
    return this.clinicalProfilesService.update(
      user.tenantId,
      user.id,
      id,
      updateDto,
    );
  }

  @Delete(':id')
  @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  @ApiOperation({ summary: 'Deletar perfil clínico (soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Perfil clínico deletado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Perfil clínico não encontrado',
  })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.clinicalProfilesService.remove(user.tenantId, id);
  }
}
