import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ComplianceService } from './compliance.service';
import { DailyComplianceResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { PermissionType } from '@prisma/client';
import { AuditEntity } from '../audit/audit.decorator';

@ApiTags('Compliance')
@ApiBearerAuth()
@Controller('compliance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AuditEntity('COMPLIANCE')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('daily-summary')
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @ApiOperation({
    summary: 'Obter resumo de conformidade do dia',
    description:
      'Retorna métricas de conformidade operacional: residentes ativos, medicamentos administrados, registros obrigatórios completados (Acesso restrito: Administrador e Responsável Técnico)',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo de conformidade retornado com sucesso',
    type: DailyComplianceResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para visualizar dashboard de conformidade' })
  async getDailySummary(): Promise<DailyComplianceResponseDto> {
    return this.complianceService.getDailySummary();
  }
}
