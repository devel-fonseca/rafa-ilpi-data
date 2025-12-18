import { Module, forwardRef } from '@nestjs/common';
import { ResidentScheduleController } from './resident-schedule.controller';
import { ResidentScheduleService } from './resident-schedule.service';
import { ResidentScheduleTasksService } from './resident-schedule-tasks.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, PermissionsModule, forwardRef(() => NotificationsModule)],
  controllers: [ResidentScheduleController],
  providers: [ResidentScheduleService, ResidentScheduleTasksService],
  exports: [ResidentScheduleService, ResidentScheduleTasksService],
})
export class ResidentScheduleModule {}
