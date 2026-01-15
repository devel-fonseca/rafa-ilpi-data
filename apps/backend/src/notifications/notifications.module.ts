import { Module } from '@nestjs/common'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'
import { NotificationsHelperService } from './notifications-helper.service'
import { NotificationsCronService } from './notifications.cron'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsHelperService, NotificationsCronService],
  exports: [NotificationsService, NotificationsHelperService], // Exportar para usar em outros módulos
})
export class NotificationsModule {}
