import { Module, forwardRef } from '@nestjs/common';
import { VitalSignsController } from './vital-signs.controller';
import { VitalSignsService } from './vital-signs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { VitalSignAlertsModule } from '../vital-sign-alerts/vital-sign-alerts.module';

@Module({
  imports: [
    PrismaModule,
    PermissionsModule,
    NotificationsModule,
    forwardRef(() => VitalSignAlertsModule), // forwardRef para evitar dependência circular
  ],
  controllers: [VitalSignsController],
  providers: [VitalSignsService],
  exports: [VitalSignsService],
})
export class VitalSignsModule {}