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
import { ConditionsService } from './conditions.service';
import { CreateConditionDto } from './dto/create-condition.dto';
import { UpdateConditionDto } from './dto/update-condition.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('conditions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('conditions')
export class ConditionsController {
  constructor(private readonly conditionsService: ConditionsService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar nova condição crônica/diagnóstico' })
  @ApiResponse({ status: 201, description: 'Condição registrada com sucesso' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  create(@CurrentUser() user: any, @Body() createDto: CreateConditionDto) {
    return this.conditionsService.create(user.tenantId, user.id, createDto);
  }

  @Get('resident/:residentId')
  @ApiOperation({ summary: 'Listar todas as condições de um residente' })
  @ApiResponse({ status: 200, description: 'Lista de condições' })
  findByResidentId(
    @CurrentUser() user: any,
    @Param('residentId') residentId: string,
  ) {
    return this.conditionsService.findByResidentId(user.tenantId, residentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar uma condição específica' })
  @ApiResponse({ status: 200, description: 'Condição encontrada' })
  @ApiResponse({ status: 404, description: 'Condição não encontrada' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.conditionsService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar condição' })
  @ApiResponse({ status: 200, description: 'Condição atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Condição não encontrada' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateConditionDto,
  ) {
    return this.conditionsService.update(
      user.tenantId,
      user.id,
      id,
      updateDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar condição (soft delete)' })
  @ApiResponse({ status: 200, description: 'Condição deletada com sucesso' })
  @ApiResponse({ status: 404, description: 'Condição não encontrada' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.conditionsService.remove(user.tenantId, id);
  }
}
