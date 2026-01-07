import { Module } from '@nestjs/common'
import { VaccinationsService } from './vaccinations.service'
import { VaccinationsController } from './vaccinations.controller'
import { PrismaService } from '../prisma/prisma.service'
import { FilesModule } from '../files/files.module'
import { PermissionsModule } from '../permissions/permissions.module'

@Module({
  imports: [FilesModule, PermissionsModule],
  controllers: [VaccinationsController],
  providers: [VaccinationsService, PrismaService],
  exports: [VaccinationsService],
})
export class VaccinationsModule {}
