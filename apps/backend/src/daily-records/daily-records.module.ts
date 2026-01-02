import { Module } from '@nestjs/common';
import { DailyRecordsService } from './daily-records.service';
import { DailyRecordsController } from './daily-records.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { VitalSignsModule } from '../vital-signs/vital-signs.module';

@Module({
  imports: [PrismaModule, PermissionsModule, VitalSignsModule],
  controllers: [DailyRecordsController],
  providers: [DailyRecordsService],
  exports: [DailyRecordsService],
})
export class DailyRecordsModule {}
