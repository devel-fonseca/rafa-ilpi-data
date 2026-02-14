import { Module } from '@nestjs/common'
import { BedsController } from './beds.controller'
import { BedsService } from './beds.service'
import { PermissionsModule } from '../permissions/permissions.module'
import { EventsModule } from '../events/events.module'

@Module({
  imports: [PermissionsModule, EventsModule],
  controllers: [BedsController],
  providers: [BedsService],
  exports: [BedsService],
})
export class BedsModule {}
