import { Module } from '@nestjs/common'
import { BuildingsController } from './buildings.controller'
import { BuildingsService } from './buildings.service'
import { PermissionsModule } from '../permissions/permissions.module'
import { EventsModule } from '../events/events.module'

@Module({
  imports: [PermissionsModule, EventsModule],
  controllers: [BuildingsController],
  providers: [BuildingsService],
  exports: [BuildingsService],
})
export class BuildingsModule {}
