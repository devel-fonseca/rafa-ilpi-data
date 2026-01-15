import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { UpdateMedicationDto } from '../prescriptions/dto/update-medication.dto';
import { DeleteMedicationDto } from '../prescriptions/dto/delete-medication.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditEntity, AuditAction } from '../audit/audit.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Medications')
@ApiBearerAuth()
@Controller('medications')
@UseGuards(JwtAuthGuard, RolesGuard)
@AuditEntity('MEDICATION')
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  // ========== UPDATE ==========

  @Patch(':id')
  @Roles('admin', 'user')
  @AuditAction('UPDATE')
  @ApiOperation({ summary: 'Atualizar medicamento com versionamento' })
  @ApiResponse({
    status: 200,
    description: 'Medicamento atualizado com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Medicamento não encontrado' })
  @ApiResponse({
    status: 400,
    description: 'changeReason inválido (mínimo 10 caracteres)',
  })
  @ApiParam({ name: 'id', description: 'ID do medicamento (UUID)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMedicationDto: UpdateMedicationDto,
    @CurrentUser() user: any,
  ) {
    return this.medicationsService.update(
      id,
      updateMedicationDto,
      user.id,
    );
  }

  // ========== DELETE ==========

  @Delete(':id')
  @Roles('admin')
  @AuditAction('DELETE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remover medicamento (soft delete) com motivo obrigatório',
  })
  @ApiResponse({ status: 200, description: 'Medicamento removido com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'deleteReason inválido (mínimo 10 caracteres)',
  })
  @ApiResponse({ status: 404, description: 'Medicamento não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do medicamento (UUID)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() deleteMedicationDto: DeleteMedicationDto,
    @CurrentUser() user: any,
  ) {
    return this.medicationsService.remove(
      id,
      user.id,
      deleteMedicationDto.deleteReason,
    );
  }

  // ========== VERSIONAMENTO E HISTÓRICO ==========

  @Get(':id/history')
  @ApiOperation({
    summary: 'Obter histórico completo de versões de um medicamento',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico completo de alterações com audit trail',
  })
  @ApiResponse({ status: 404, description: 'Medicamento não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do medicamento (UUID)' })
  getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.medicationsService.getHistory(id);
  }

  @Get(':id/history/:versionNumber')
  @ApiOperation({ summary: 'Obter versão específica do histórico' })
  @ApiResponse({
    status: 200,
    description:
      'Dados completos de uma versão específica (previousData, newData, changedFields)',
  })
  @ApiResponse({ status: 404, description: 'Versão não encontrada' })
  @ApiParam({ name: 'id', description: 'ID do medicamento (UUID)' })
  @ApiParam({
    name: 'versionNumber',
    description: 'Número da versão (1, 2, 3, ...)',
  })
  getHistoryVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionNumber') versionNumber: string,
    @CurrentUser() user: any,
  ) {
    return this.medicationsService.getHistoryVersion(
      id,
      parseInt(versionNumber, 10),
    );
  }
}
