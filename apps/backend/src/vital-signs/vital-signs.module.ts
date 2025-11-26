import { Module } from '@nestjs/common'
import { VitalSignsController } from './vital-signs.controller'

@Module({
  controllers: [VitalSignsController],
})
export class VitalSignsModule {}