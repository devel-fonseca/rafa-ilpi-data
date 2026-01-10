import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DailyRecordsService } from './daily-records.service';
import { DailyRecordsController } from './daily-records.controller';
import { IncidentInterceptorService } from './incident-interceptor.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsModule } from '../permissions/permissions.module';
import { VitalSignsModule } from '../vital-signs/vital-signs.module';

@Module({
  imports: [
    PrismaModule,
    PermissionsModule,
    VitalSignsModule,
    EventEmitterModule,
  ],
  controllers: [DailyRecordsController],
  providers: [
    DailyRecordsService,
    {
      provide: IncidentInterceptorService,
      useFactory: (prisma) => {
        const service = new IncidentInterceptorService(prisma);
        return service;
      },
      inject: [PrismaService],
    },
  ],
  exports: [DailyRecordsService],
})
export class DailyRecordsModule {}
