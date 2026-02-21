import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { VitalSignAlertsController } from './vital-sign-alerts.controller'
import { VitalSignAlertsService } from './vital-sign-alerts.service'

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [VitalSignAlertsController],
  providers: [VitalSignAlertsService],
  exports: [VitalSignAlertsService], // Exportar para uso em VitalSignsService
})
export class VitalSignAlertsModule {}
