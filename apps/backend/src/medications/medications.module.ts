import { Module } from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { MedicationsController } from './medications.controller';
import { MedicationLocksService } from './medication-locks.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MedicationsController],
  providers: [MedicationsService, MedicationLocksService],
  exports: [MedicationsService, MedicationLocksService],
})
export class MedicationsModule {}
