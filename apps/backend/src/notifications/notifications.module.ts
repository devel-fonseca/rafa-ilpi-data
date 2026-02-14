import { Module } from '@nestjs/common'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'
import { NotificationsHelperService } from './notifications-helper.service'
import { NotificationsCronService } from './notifications.cron'
import { NotificationRecipientsResolverService } from './notification-recipients-resolver.service'
import { PrismaModule } from '../prisma/prisma.module'
import { EventsModule } from '../events/events.module'

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsHelperService,
    NotificationsCronService,
    NotificationRecipientsResolverService,
  ],
  exports: [
    NotificationsService,
    NotificationsHelperService,
    NotificationRecipientsResolverService,
  ], // Exportar para usar em outros módulos
})
export class NotificationsModule {}
