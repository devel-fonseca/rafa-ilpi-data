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
import { DietaryRestrictionsService } from './dietary-restrictions.service';
import { CreateDietaryRestrictionDto } from './dto/create-dietary-restriction.dto';
import { UpdateDietaryRestrictionDto } from './dto/update-dietary-restriction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('dietary-restrictions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('dietary-restrictions')
export class DietaryRestrictionsController {
  constructor(
    private readonly dietaryRestrictionsService: DietaryRestrictionsService,
  ) {}

  @Post()
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
  @ApiOperation({ summary: 'Deletar restrição alimentar (soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Restrição alimentar deletada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Restrição alimentar não encontrada',
  })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.dietaryRestrictionsService.remove(user.tenantId, id);
  }
}
