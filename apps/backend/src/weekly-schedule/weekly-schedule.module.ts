import { Module } from '@nestjs/common';
import { WeeklyScheduleService } from './weekly-schedule.service';
import { WeeklyScheduleController } from './weekly-schedule.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [WeeklyScheduleController],
  providers: [WeeklyScheduleService],
  exports: [WeeklyScheduleService],
})
export class WeeklyScheduleModule {}
