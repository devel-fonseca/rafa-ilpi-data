import { Module } from '@nestjs/common'
import { InstitutionalProfileController } from './institutional-profile.controller'
import { InstitutionalDocumentsController } from './institutional-documents.controller'
import { InstitutionalProfileService } from './institutional-profile.service'
import { PrismaModule } from '../prisma/prisma.module'
import { FilesModule } from '../files/files.module'
import { PermissionsModule } from '../permissions/permissions.module'

@Module({
  imports: [PrismaModule, FilesModule, PermissionsModule],
  controllers: [InstitutionalProfileController, InstitutionalDocumentsController],
  providers: [InstitutionalProfileService],
  exports: [InstitutionalProfileService],
})
export class InstitutionalProfileModule {}
