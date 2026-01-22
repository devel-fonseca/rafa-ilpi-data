import { Module } from '@nestjs/common';
import { CareShiftsController } from './care-shifts.controller';
import { CareShiftsService } from './care-shifts.service';
import { CareShiftsCron } from './care-shifts.cron';
import {
  RDCCalculationService,
  ShiftGeneratorService,
} from './services';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [CareShiftsController],
  providers: [
    CareShiftsService,
    RDCCalculationService,
    ShiftGeneratorService,
    CareShiftsCron, // Cron job para geração automática diária
  ],
  exports: [
    CareShiftsService,
    RDCCalculationService,
    ShiftGeneratorService,
  ],
})
export class CareShiftsModule {}
