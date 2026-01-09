import { Module } from '@nestjs/common';
import { DailyRecordsService } from './daily-records.service';
import { DailyRecordsController } from './daily-records.controller';
import { IncidentInterceptorService } from './incident-interceptor.service';
import { IndicadoresRdcService } from './indicadores-rdc.service';
import { IndicadoresRdcCronService } from './indicadores-rdc.cron';
import { SentinelEventService } from './sentinel-event.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsModule } from '../permissions/permissions.module';
import { VitalSignsModule } from '../vital-signs/vital-signs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PrismaModule,
    PermissionsModule,
    VitalSignsModule,
    NotificationsModule,
    EmailModule,
  ],
  controllers: [DailyRecordsController],
  providers: [
    DailyRecordsService,
    IndicadoresRdcService,
    IndicadoresRdcCronService,
    SentinelEventService,
    {
      provide: IncidentInterceptorService,
      useFactory: (prisma, sentinelEventService) => {
        const service = new IncidentInterceptorService(prisma, sentinelEventService);
        return service;
      },
      inject: [PrismaService, SentinelEventService],
    },
  ],
  exports: [DailyRecordsService],
})
export class DailyRecordsModule {}
