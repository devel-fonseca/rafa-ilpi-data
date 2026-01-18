import { Module, forwardRef } from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { MedicationsController } from './medications.controller';
import { MedicationLocksService } from './medication-locks.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [PrismaModule, forwardRef(() => EventsModule)],
  controllers: [MedicationsController],
  providers: [MedicationsService, MedicationLocksService],
  exports: [MedicationsService, MedicationLocksService],
})
export class MedicationsModule {}
