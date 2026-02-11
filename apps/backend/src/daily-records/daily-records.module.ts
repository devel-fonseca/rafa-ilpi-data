import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DailyRecordsService } from './daily-records.service';
import { DailyRecordsController } from './daily-records.controller';
import { IncidentInterceptorService } from './incident-interceptor.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsModule } from '../permissions/permissions.module';
import { VitalSignsModule } from '../vital-signs/vital-signs.module';
import { ResidentHealthModule } from '../resident-health/resident-health.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthModule } from '../auth/auth.module';
import { CareShiftsModule } from '../care-shifts/care-shifts.module';

@Module({
  imports: [
    PrismaModule,
    PermissionsModule,
    VitalSignsModule,
    ResidentHealthModule,
    EventEmitterModule,
    forwardRef(() => EventsModule),
    forwardRef(() => NotificationsModule),
    AuthModule,
    CareShiftsModule,
  ],
  controllers: [DailyRecordsController],
  providers: [
    DailyRecordsService,
    {
      provide: IncidentInterceptorService,
      useFactory: (prisma, notificationsService) => {
        const service = new IncidentInterceptorService(prisma, notificationsService);
        return service;
      },
      inject: [PrismaService, NotificationsService],
    },
  ],
  exports: [DailyRecordsService],
})
export class DailyRecordsModule {}
