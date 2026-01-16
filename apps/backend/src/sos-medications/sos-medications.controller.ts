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
import { SOSMedicationsService } from './sos-medications.service';
import { UpdateSOSMedicationDto } from './dto/update-sos-medication.dto';
import { DeleteSOSMedicationDto } from './dto/delete-sos-medication.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AuditEntity, AuditAction } from '../audit/audit.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('SOS Medications')
@ApiBearerAuth()
@Controller('sos-medications')
@UseGuards(JwtAuthGuard, RolesGuard)
@AuditEntity('SOS_MEDICATION')
export class SOSMedicationsController {
  constructor(
    private readonly sosMedicationsService: SOSMedicationsService,
  ) {}

  // ========== UPDATE ==========

  @Patch(':id')
  @Roles('admin', 'user')
  @AuditAction('UPDATE')
  @ApiOperation({ summary: 'Atualizar medicamento SOS com versionamento' })
  @ApiResponse({
    status: 200,
    description: 'Medicamento SOS atualizado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Medicamento SOS não encontrado',
  })
  @ApiResponse({
    status: 400,
    description: 'changeReason inválido (mínimo 10 caracteres)',
  })
  @ApiParam({ name: 'id', description: 'ID do medicamento SOS (UUID)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSOSMedicationDto: UpdateSOSMedicationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sosMedicationsService.update(
      id,
      updateSOSMedicationDto,
      user.id,
    );
  }

  // ========== DELETE ==========

  @Delete(':id')
  @Roles('admin')
  @AuditAction('DELETE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remover medicamento SOS (soft delete) com motivo obrigatório',
  })
  @ApiResponse({
    status: 200,
    description: 'Medicamento SOS removido com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'deleteReason inválido (mínimo 10 caracteres)',
  })
  @ApiResponse({
    status: 404,
    description: 'Medicamento SOS não encontrado',
  })
  @ApiParam({ name: 'id', description: 'ID do medicamento SOS (UUID)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() deleteSOSMedicationDto: DeleteSOSMedicationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sosMedicationsService.remove(
      id,
      user.id,
      deleteSOSMedicationDto.deleteReason,
    );
  }

  // ========== VERSIONAMENTO E HISTÓRICO ==========

  @Get(':id/history')
  @ApiOperation({
    summary: 'Obter histórico completo de versões de um medicamento SOS',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico completo de alterações com audit trail',
  })
  @ApiResponse({
    status: 404,
    description: 'Medicamento SOS não encontrado',
  })
  @ApiParam({ name: 'id', description: 'ID do medicamento SOS (UUID)' })
  getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.sosMedicationsService.getHistory(id);
  }

  @Get(':id/history/:versionNumber')
  @ApiOperation({ summary: 'Obter versão específica do histórico' })
  @ApiResponse({
    status: 200,
    description:
      'Dados completos de uma versão específica (previousData, newData, changedFields)',
  })
  @ApiResponse({ status: 404, description: 'Versão não encontrada' })
  @ApiParam({ name: 'id', description: 'ID do medicamento SOS (UUID)' })
  @ApiParam({
    name: 'versionNumber',
    description: 'Número da versão (1, 2, 3, ...)',
  })
  getHistoryVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionNumber') versionNumber: string,
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.sosMedicationsService.getHistoryVersion(
      id,
      parseInt(versionNumber, 10),
    );
  }
}
