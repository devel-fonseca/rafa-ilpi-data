import { Module } from '@nestjs/common'
import { RoomsController } from './rooms.controller'
import { RoomsService } from './rooms.service'
import { PermissionsModule } from '../permissions/permissions.module'
import { EventsModule } from '../events/events.module'

@Module({
  imports: [PermissionsModule, EventsModule],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
