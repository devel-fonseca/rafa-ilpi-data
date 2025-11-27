import { Module } from '@nestjs/common'
import { InstitutionalProfileController } from './institutional-profile.controller'
import { InstitutionalProfileService } from './institutional-profile.service'
import { PrismaModule } from '../prisma/prisma.module'
import { FilesModule } from '../files/files.module'

@Module({
  imports: [PrismaModule, FilesModule],
  controllers: [InstitutionalProfileController],
  providers: [InstitutionalProfileService],
  exports: [InstitutionalProfileService],
})
export class InstitutionalProfileModule {}
