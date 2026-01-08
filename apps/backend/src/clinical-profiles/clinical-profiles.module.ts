import { Module } from '@nestjs/common';
import { ClinicalProfilesService } from './clinical-profiles.service';
import { ClinicalProfilesController } from './clinical-profiles.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, PermissionsModule, AuditModule],
  controllers: [ClinicalProfilesController],
  providers: [ClinicalProfilesService],
  exports: [ClinicalProfilesService],
})
export class ClinicalProfilesModule {}
