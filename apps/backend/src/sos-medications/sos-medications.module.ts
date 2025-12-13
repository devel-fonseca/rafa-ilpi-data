import { Module } from '@nestjs/common';
import { SOSMedicationsService } from './sos-medications.service';
import { SOSMedicationsController } from './sos-medications.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SOSMedicationsController],
  providers: [SOSMedicationsService],
  exports: [SOSMedicationsService],
})
export class SOSMedicationsModule {}
