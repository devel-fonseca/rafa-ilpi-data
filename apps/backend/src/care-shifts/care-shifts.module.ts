import { Module } from '@nestjs/common';
import { CareShiftsController } from './care-shifts.controller';
import { CareShiftsService } from './care-shifts.service';
import { RDCCalculationService } from './services';
import { ShiftValidationGuard } from './guards';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, PermissionsModule, AuthModule],
  controllers: [CareShiftsController],
  providers: [CareShiftsService, RDCCalculationService, ShiftValidationGuard],
  exports: [CareShiftsService, RDCCalculationService, ShiftValidationGuard],
})
export class CareShiftsModule {}
