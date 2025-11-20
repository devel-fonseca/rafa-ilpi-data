import { Module } from '@nestjs/common'
import { VaccinationsService } from './vaccinations.service'
import { VaccinationsController } from './vaccinations.controller'
import { PrismaService } from '../prisma/prisma.service'

@Module({
  controllers: [VaccinationsController],
  providers: [VaccinationsService, PrismaService],
  exports: [VaccinationsService],
})
export class VaccinationsModule {}
