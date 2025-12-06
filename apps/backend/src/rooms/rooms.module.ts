import { Module } from '@nestjs/common'
import { RoomsController } from './rooms.controller'
import { RoomsService } from './rooms.service'
import { PermissionsModule } from '../permissions/permissions.module'

@Module({
  imports: [PermissionsModule],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
