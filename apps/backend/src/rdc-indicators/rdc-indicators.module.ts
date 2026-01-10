import { Module } from '@nestjs/common';
import { RdcIndicatorsController } from './rdc-indicators.controller';
import { RdcIndicatorsService } from './rdc-indicators.service';
import { RdcIndicatorsCronService } from './rdc-indicators-cron.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

/**
 * Módulo de Indicadores RDC 502/2021
 *
 * Responsável por:
 * - Calcular os 6 indicadores mensais obrigatórios
 * - Executar cron job diário de cálculo automático
 * - Fornecer API para consulta de indicadores e histórico
 */
@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [RdcIndicatorsController],
  providers: [RdcIndicatorsService, RdcIndicatorsCronService],
  exports: [RdcIndicatorsService],
})
export class RdcIndicatorsModule {}
