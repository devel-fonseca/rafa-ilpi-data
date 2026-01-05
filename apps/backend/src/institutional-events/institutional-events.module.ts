import { Module, forwardRef } from '@nestjs/common';
import { InstitutionalEventsService } from './institutional-events.service';
import { InstitutionalEventsController } from './institutional-events.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    PermissionsModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [InstitutionalEventsController],
  providers: [InstitutionalEventsService],
  exports: [InstitutionalEventsService],
})
export class InstitutionalEventsModule {}
