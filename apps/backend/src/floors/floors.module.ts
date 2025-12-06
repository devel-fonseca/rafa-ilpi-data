import { Module } from '@nestjs/common'
import { FloorsController } from './floors.controller'
import { FloorsService } from './floors.service'
import { PermissionsModule } from '../permissions/permissions.module'

@Module({
  imports: [PermissionsModule],
  controllers: [FloorsController],
  providers: [FloorsService],
  exports: [FloorsService],
})
export class FloorsModule {}
