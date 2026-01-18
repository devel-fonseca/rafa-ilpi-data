import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { MedicationsService } from './medications.service';
import { MedicationLocksService } from './medication-locks.service';
import { UpdateMedicationDto } from '../prescriptions/dto/update-medication.dto';
import { DeleteMedicationDto } from '../prescriptions/dto/delete-medication.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditEntity, AuditAction } from '../audit/audit.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
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
  constructor(
    private readonly medicationsService: MedicationsService,
    private readonly medicationLocksService: MedicationLocksService,
  ) {}

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
    @CurrentUser() user: JwtPayload,
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
    @CurrentUser() user: JwtPayload,
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
    @CurrentUser() _user: JwtPayload,
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
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.medicationsService.getHistoryVersion(
      id,
      parseInt(versionNumber, 10),
    );
  }

  // ========== MEDICATION LOCKS (Sprint 2 - WebSocket) ==========

  @Post('lock')
  @Roles('admin', 'user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bloquear medicamento para administração' })
  @ApiResponse({
    status: 200,
    description: 'Medicamento bloqueado com sucesso',
  })
  @ApiResponse({
    status: 409,
    description: 'Medicamento já está bloqueado por outro usuário',
  })
  lockMedication(
    @Body()
    dto: {
      medicationId: string;
      scheduledDate: string;
      scheduledTime: string;
      sessionId?: string;
      ipAddress?: string;
    },
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.medicationLocksService.lockMedication(
      {
        medicationId: dto.medicationId,
        scheduledDate: dto.scheduledDate,
        scheduledTime: dto.scheduledTime,
        sessionId: dto.sessionId,
        ipAddress: dto.ipAddress || req.ip,
      },
      user.id,
      user.name,
    );
  }

  @Post('unlock')
  @Roles('admin', 'user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desbloquear medicamento' })
  @ApiResponse({ status: 200, description: 'Medicamento desbloqueado' })
  unlockMedication(
    @Body()
    dto: {
      medicationId: string;
      scheduledDate: string;
      scheduledTime: string;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.medicationLocksService.unlockMedication(
      {
        medicationId: dto.medicationId,
        scheduledDate: dto.scheduledDate,
        scheduledTime: dto.scheduledTime,
      },
      user.id,
    );
  }

  @Get('check-lock')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Verificar se medicamento está bloqueado' })
  @ApiResponse({ status: 200, description: 'Status do lock retornado' })
  checkMedicationLock(
    @Query('medicationId') medicationId: string,
    @Query('scheduledDate') scheduledDate: string,
    @Query('scheduledTime') scheduledTime: string,
  ) {
    return this.medicationLocksService.checkLock(
      medicationId,
      scheduledDate,
      scheduledTime,
    );
  }
}
