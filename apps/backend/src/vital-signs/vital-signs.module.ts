import { Module, OnModuleInit } from '@nestjs/common'
import { VitalSignsController } from './vital-signs.controller'
import { NotificationsModule } from '../notifications/notifications.module'
import { NotificationsService } from '../notifications/notifications.service'
import * as vitalSignsService from '../services/vitalSigns.service'

@Module({
  imports: [NotificationsModule],
  controllers: [VitalSignsController],
})
export class VitalSignsModule implements OnModuleInit {
  constructor(private readonly notificationsService: NotificationsService) {}

  onModuleInit() {
    // Injetar NotificationsService no vitalSignsService
    vitalSignsService.setNotificationsService(this.notificationsService)
  }
}