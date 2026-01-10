import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

/**
 * Módulo de Conformidade Operacional
 *
 * Responsável por:
 * - Calcular métricas diárias de conformidade
 * - Monitorar administração de medicamentos
 * - Rastrear completude de registros obrigatórios
 */
@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
