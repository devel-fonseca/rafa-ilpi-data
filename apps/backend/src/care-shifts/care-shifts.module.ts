import { Module } from '@nestjs/common';
import { CareShiftsController } from './care-shifts.controller';
import { CareShiftsService } from './care-shifts.service';
import { RDCCalculationService } from './services';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [CareShiftsController],
  providers: [CareShiftsService, RDCCalculationService],
  exports: [CareShiftsService, RDCCalculationService],
})
export class CareShiftsModule {}
