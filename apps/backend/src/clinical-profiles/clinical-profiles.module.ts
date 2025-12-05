import { Module } from '@nestjs/common';
import { ClinicalProfilesService } from './clinical-profiles.service';
import { ClinicalProfilesController } from './clinical-profiles.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClinicalProfilesController],
  providers: [ClinicalProfilesService],
  exports: [ClinicalProfilesService],
})
export class ClinicalProfilesModule {}
