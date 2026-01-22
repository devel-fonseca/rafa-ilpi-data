import { Module } from '@nestjs/common';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

/**
 * Módulo de Dashboard Administrativo
 *
 * Responsável por:
 * - Fornecer estatísticas operacionais do dia para dashboard do administrador
 * - Calcular métricas de medicamentos programados/administrados
 * - Rastrear completude de registros obrigatórios
 */
@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
  exports: [AdminDashboardService],
})
export class AdminDashboardModule {}
